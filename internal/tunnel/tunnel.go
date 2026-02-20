package tunnel

import "context"

// TunnelStatus represents the current state of a tunnel.
type TunnelStatus struct {
	Enabled  bool   `json:"enabled"`
	URL      string `json:"url,omitempty"`
	Provider string `json:"provider,omitempty"`
	Error    string `json:"error,omitempty"`
}

// Tunnel is the interface for tunnel providers.
type Tunnel interface {
	// Enable starts the tunnel.
	Enable(ctx context.Context) error

	// Disable stops the tunnel.
	Disable(ctx context.Context) error

	// Status returns the current tunnel status.
	Status(ctx context.Context) (*TunnelStatus, error)

	// URL returns the public URL of the tunnel.
	URL() string
}
