package sandbox

import "time"

// Sandbox represents a managed OpenClaw sandbox running in a Docker container.
type Sandbox struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	ContainerID string     `json:"container_id,omitempty"`
	Status      string     `json:"status"`
	Policy      string     `json:"policy"`
	APIKeyID    string     `json:"api_key_id,omitempty"`
	Config      *Config    `json:"config,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	StoppedAt   *time.Time `json:"stopped_at,omitempty"`
}

// Config holds sandbox-specific configuration.
type Config struct {
	Env    map[string]string `json:"env,omitempty"`
	Image  string            `json:"image,omitempty"`
	Memory int64             `json:"memory,omitempty"` // Memory limit in bytes (0 = no limit)
}

// CreateRequest is the API request body for creating a sandbox.
type CreateRequest struct {
	Name   string            `json:"name"`
	Policy string            `json:"policy"`
	Image  string            `json:"image,omitempty"`
	Env    map[string]string `json:"env,omitempty"`
}

// Preset describes a network policy preset for sandboxes.
type Preset struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	AllowedHosts []string `json:"allowed_hosts,omitempty"`
}

// Sandbox statuses.
const (
	StatusCreated = "created"
	StatusRunning = "running"
	StatusStopped = "stopped"
	StatusFailed  = "failed"
)

// Default image for OpenClaw sandboxes.
const DefaultImage = "node:22-slim"

// Docker labels used to identify Solon-managed sandbox containers.
const (
	LabelManaged   = "solon.sandbox"
	LabelSandboxID = "solon.sandbox.id"
	LabelPolicy    = "solon.sandbox.policy"
)

// Docker network name for sandboxes.
const NetworkName = "solon-bridge"
