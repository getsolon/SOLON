package tunnel

import (
	"context"
	"fmt"
)

// Relay implements the Tunnel interface using Solon Relay (paid managed tunnel service).
// Planned for v0.2.
type Relay struct {
	port    int
	apiKey  string
	url     string
	enabled bool
}

// NewRelay creates a new Solon Relay tunnel manager.
func NewRelay(port int, apiKey string) *Relay {
	return &Relay{
		port:   port,
		apiKey: apiKey,
	}
}

func (r *Relay) Enable(ctx context.Context) error {
	// TODO: Implement WebSocket connection to relay.solon.dev (v0.2)
	return fmt.Errorf("Solon Relay not yet implemented (planned for v0.2)")
}

func (r *Relay) Disable(ctx context.Context) error {
	return fmt.Errorf("Solon Relay not yet implemented (planned for v0.2)")
}

func (r *Relay) Status(ctx context.Context) (*TunnelStatus, error) {
	return &TunnelStatus{
		Enabled:  r.enabled,
		URL:      r.url,
		Provider: "solon-relay",
	}, nil
}

func (r *Relay) URL() string {
	return r.url
}
