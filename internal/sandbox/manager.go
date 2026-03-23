package sandbox

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"regexp"
	"time"

	"github.com/google/uuid"

	"github.com/openclaw/solon/internal/storage"
)

// Manager manages sandbox lifecycle via Docker.
type Manager struct {
	docker      *dockerClient
	store       *storage.DB
	solonPort   int
	bridgeReady bool
	gatewayIP   string // solon-bridge gateway IP (host-accessible from containers)
}

// NewManager creates a sandbox manager. socketPath is the Docker unix socket
// (typically /var/run/docker.sock). solonPort is the port Solon listens on.
func NewManager(socketPath string, store *storage.DB, solonPort int) *Manager {
	return &Manager{
		docker:    newDockerClient(socketPath),
		store:     store,
		solonPort: solonPort,
	}
}

// EnsureNetwork creates the solon-bridge Docker network if it doesn't exist
// and caches the gateway IP for container environment variables.
func (m *Manager) EnsureNetwork(ctx context.Context) error {
	if m.bridgeReady {
		return nil
	}
	if err := m.docker.networkCreate(ctx, NetworkName); err != nil {
		return fmt.Errorf("ensuring Docker network: %w", err)
	}
	// Detect the gateway IP for this network
	if gw := m.docker.networkGateway(ctx, NetworkName); gw != "" {
		m.gatewayIP = gw
	}
	m.bridgeReady = true
	return nil
}

// Available returns true if Docker is accessible.
func (m *Manager) Available(ctx context.Context) bool {
	resp, err := m.docker.do(ctx, "GET", "/_ping", nil)
	if err != nil {
		return false
	}
	_ = resp.Body.Close()
	return resp.StatusCode == 200
}

var validName = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)

// Create creates a new sandbox. It creates a dedicated API key, a Docker
// container on the solon-bridge network, and records the sandbox in the database.
func (m *Manager) Create(ctx context.Context, req CreateRequest) (*Sandbox, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("sandbox name is required")
	}
	if len(req.Name) < 2 || len(req.Name) > 63 || !validName.MatchString(req.Name) {
		return nil, fmt.Errorf("sandbox name must be 2-63 lowercase chars, numbers, hyphens (no leading/trailing hyphen)")
	}
	if req.Policy == "" {
		req.Policy = "api-only"
	}
	if !ValidPolicy(req.Policy) {
		return nil, fmt.Errorf("invalid policy %q: must be one of full, api-only, inference-only, custom", req.Policy)
	}

	if err := m.EnsureNetwork(ctx); err != nil {
		return nil, err
	}

	// Create a dedicated API key for this sandbox
	key, err := m.store.CreateKeyWithOptions(storage.CreateKeyOptions{
		Name:  fmt.Sprintf("sandbox-%s", req.Name),
		Scope: "user",
	})
	if err != nil {
		return nil, fmt.Errorf("creating sandbox API key: %w", err)
	}

	image := req.Image
	if image == "" {
		image = DefaultImage
	}

	sandboxID := uuid.New().String()
	containerName := "openclaw-sandbox-" + req.Name

	// Build environment variables — use the bridge gateway IP so containers
	// can reach Solon on the host (host.docker.internal is unreliable on Linux)
	solonHost := m.gatewayIP
	if solonHost == "" {
		solonHost = "host.docker.internal"
	}
	env := []string{
		fmt.Sprintf("SOLON_API_KEY=%s", key.Raw),
		fmt.Sprintf("SOLON_ENDPOINT=http://%s:%d", solonHost, m.solonPort),
		"NODE_ENV=production",
	}
	for k, v := range req.Env {
		env = append(env, fmt.Sprintf("%s=%s", k, v))
	}

	// Create container
	cfg := containerConfig{
		Name: containerName,
		Body: map[string]any{
			"Image": image,
			"Env":   env,
			"Labels": map[string]string{
				LabelManaged:   "true",
				LabelSandboxID: sandboxID,
				LabelPolicy:    req.Policy,
			},
			"Cmd":          []string{"sleep", "infinity"}, // Keep alive; OpenClaw started separately
			"AttachStdout": true,
			"AttachStderr": true,
			"HostConfig": map[string]any{
				"NetworkMode": NetworkName,
				"CapDrop":     []string{"ALL"},
				"CapAdd":      []string{"NET_BIND_SERVICE"},
				"SecurityOpt": []string{"no-new-privileges"},
				"ExtraHosts":  []string{fmt.Sprintf("host.docker.internal:host-gateway")},
			},
		},
	}

	containerID, err := m.docker.containerCreate(ctx, cfg)
	if err != nil {
		// Clean up the API key on failure
		_ = m.store.RevokeKey(key.ID)
		return nil, fmt.Errorf("creating Docker container: %w", err)
	}

	// Store sandbox config as JSON
	var configJSON *string
	sandboxCfg := &Config{
		Env:   req.Env,
		Image: image,
	}
	cfgBytes, err := json.Marshal(sandboxCfg)
	if err == nil {
		s := string(cfgBytes)
		configJSON = &s
	}

	// Save to database
	if err := m.store.CreateSandbox(sandboxID, req.Name, containerID, req.Policy, key.ID, configJSON); err != nil {
		_ = m.docker.containerRemove(ctx, containerID)
		_ = m.store.RevokeKey(key.ID)
		return nil, fmt.Errorf("saving sandbox to database: %w", err)
	}

	now := time.Now()
	return &Sandbox{
		ID:          sandboxID,
		Name:        req.Name,
		ContainerID: containerID,
		Status:      StatusCreated,
		Policy:      req.Policy,
		APIKeyID:    key.ID,
		Config:      sandboxCfg,
		CreatedAt:   now,
	}, nil
}

// Start starts a sandbox container.
func (m *Manager) Start(ctx context.Context, id string) error {
	sb, err := m.store.GetSandbox(id)
	if err != nil {
		return fmt.Errorf("sandbox not found: %w", err)
	}
	if sb.ContainerID == "" {
		return fmt.Errorf("sandbox %s has no container", id)
	}

	if err := m.docker.containerStart(ctx, sb.ContainerID); err != nil {
		return fmt.Errorf("starting sandbox: %w", err)
	}

	if err := m.store.UpdateSandboxStatus(id, StatusRunning); err != nil {
		log.Printf("warning: failed to update sandbox status: %v", err)
	}
	return nil
}

// Stop stops a sandbox container.
func (m *Manager) Stop(ctx context.Context, id string) error {
	sb, err := m.store.GetSandbox(id)
	if err != nil {
		return fmt.Errorf("sandbox not found: %w", err)
	}
	if sb.ContainerID == "" {
		return fmt.Errorf("sandbox %s has no container", id)
	}

	if err := m.docker.containerStop(ctx, sb.ContainerID, 10); err != nil {
		return fmt.Errorf("stopping sandbox: %w", err)
	}

	if err := m.store.UpdateSandboxStatus(id, StatusStopped); err != nil {
		log.Printf("warning: failed to update sandbox status: %v", err)
	}
	return nil
}

// Remove removes a sandbox container and revokes its API key.
func (m *Manager) Remove(ctx context.Context, id string) error {
	sb, err := m.store.GetSandbox(id)
	if err != nil {
		return fmt.Errorf("sandbox not found: %w", err)
	}

	// Remove container (force)
	if sb.ContainerID != "" {
		if err := m.docker.containerRemove(ctx, sb.ContainerID); err != nil {
			log.Printf("warning: failed to remove container %s: %v", sb.ContainerID, err)
		}
	}

	// Revoke sandbox API key
	if sb.APIKeyID != "" {
		if err := m.store.RevokeKey(sb.APIKeyID); err != nil {
			log.Printf("warning: failed to revoke key %s: %v", sb.APIKeyID, err)
		}
	}

	// Delete from database
	if err := m.store.DeleteSandbox(id); err != nil {
		return fmt.Errorf("deleting sandbox from database: %w", err)
	}
	return nil
}

// Get returns a sandbox by ID, with live status from Docker.
func (m *Manager) Get(ctx context.Context, id string) (*Sandbox, error) {
	sb, err := m.store.GetSandbox(id)
	if err != nil {
		return nil, fmt.Errorf("sandbox not found: %w", err)
	}

	result := dbSandboxToSandbox(sb)

	// Refresh status from Docker
	if sb.ContainerID != "" {
		if state, err := m.docker.containerInspect(ctx, sb.ContainerID); err == nil {
			if state.Running {
				result.Status = StatusRunning
			} else {
				result.Status = StatusStopped
			}
		}
	}

	return result, nil
}

// List returns all sandboxes with live status.
func (m *Manager) List(ctx context.Context) ([]*Sandbox, error) {
	dbSandboxes, err := m.store.ListSandboxes()
	if err != nil {
		return nil, fmt.Errorf("listing sandboxes: %w", err)
	}

	// Build a map of container statuses from Docker
	statuses := make(map[string]string)
	containers, err := m.docker.containerList(ctx, LabelManaged+"=true")
	if err == nil {
		for _, c := range containers {
			if sid, ok := c.Labels[LabelSandboxID]; ok {
				statuses[sid] = c.State
			}
		}
	}

	sandboxes := make([]*Sandbox, 0, len(dbSandboxes))
	for _, db := range dbSandboxes {
		sb := dbSandboxToSandbox(db)
		// Refresh status from Docker
		if dockerState, ok := statuses[sb.ID]; ok {
			if dockerState == "running" {
				sb.Status = StatusRunning
			} else {
				sb.Status = StatusStopped
			}
		}
		sandboxes = append(sandboxes, sb)
	}

	return sandboxes, nil
}

// Logs returns log output for a sandbox container.
func (m *Manager) Logs(ctx context.Context, id string, tail int) (io.ReadCloser, error) {
	sb, err := m.store.GetSandbox(id)
	if err != nil {
		return nil, fmt.Errorf("sandbox not found: %w", err)
	}
	if sb.ContainerID == "" {
		return nil, fmt.Errorf("sandbox %s has no container", id)
	}

	return m.docker.containerLogs(ctx, sb.ContainerID, tail, false)
}

func dbSandboxToSandbox(db *storage.SandboxRecord) *Sandbox {
	sb := &Sandbox{
		ID:          db.ID,
		Name:        db.Name,
		ContainerID: db.ContainerID,
		Status:      db.Status,
		Policy:      db.Policy,
		APIKeyID:    db.APIKeyID,
		CreatedAt:   db.CreatedAt,
		StartedAt:   db.StartedAt,
		StoppedAt:   db.StoppedAt,
	}
	if db.Config != "" {
		var cfg Config
		if err := json.Unmarshal([]byte(db.Config), &cfg); err == nil {
			sb.Config = &cfg
		}
	}
	return sb
}
