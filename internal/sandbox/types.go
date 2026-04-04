package sandbox

import "time"

// Sandbox represents a managed OpenClaw sandbox running in a Docker container.
type Sandbox struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	ContainerID string     `json:"container_id,omitempty"`
	Status      string     `json:"status"`
	Policy      string     `json:"policy"`
	Tier        int        `json:"tier"`
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
	Tier   int               `json:"tier,omitempty"`
}

// CreateRequest is the API request body for creating a sandbox.
type CreateRequest struct {
	Name   string            `json:"name"`
	Policy string            `json:"policy,omitempty"` // Deprecated: use Tier instead
	Tier   int               `json:"tier,omitempty"`   // 1-4, takes precedence over Policy
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

// Default image for basic sandboxes (Tier 1).
const DefaultImage = "node:22-slim"

// SandboxImage is the Playwright-ready image for Tier 2+ sandboxes.
const SandboxImage = "solon/sandbox:latest"

// GHCR images — pre-built versions pulled from GitHub Container Registry.
const (
	GHCRSandboxImage  = "ghcr.io/theodorthirtyseven37/solon-sandbox:latest"
	GHCROpenClawImage = "ghcr.io/theodorthirtyseven37/solon-openclaw:latest"
)

// Docker labels used to identify Solon-managed sandbox containers.
const (
	LabelManaged   = "solon.sandbox"
	LabelSandboxID = "solon.sandbox.id"
	LabelPolicy    = "solon.sandbox.policy"
)

// SandboxStats holds resource usage for a sandbox.
type SandboxStats struct {
	CPUPercent float64 `json:"cpu_percent"`
	MemUsageMB float64 `json:"mem_usage_mb"`
	MemLimitMB float64 `json:"mem_limit_mb"`
	MemPercent float64 `json:"mem_percent"`
	NetRxMB    float64 `json:"net_rx_mb"`
	NetTxMB    float64 `json:"net_tx_mb"`
}

// Docker network names for sandboxes.
const (
	NetworkName  = "solon-bridge" // Legacy default network
	NetworkTier1 = "solon-tier1"  // Internal-only, no outbound internet
	NetworkTier2 = "solon-tier2"  // Regular bridge with outbound access
)

// Security tier levels.
const (
	Tier1Locked   = 1
	Tier2Standard = 2
	Tier3Advanced = 3
	Tier4Maximum  = 4
)

// TierConfig maps a tier level to concrete Docker container configuration.
type TierConfig struct {
	Level       int      `json:"level"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Network     string   `json:"-"`
	Image       string   `json:"-"`
	MemoryMB    int64    `json:"memory_mb"`
	AllowExec   bool     `json:"allow_exec"`
	AllowBrowser bool    `json:"allow_browser"`
	Persistent  bool     `json:"persistent"`
	CapAdd      []string `json:"-"`
}
