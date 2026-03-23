package tunnel

import (
	"context"
	"fmt"
)

// Relay implements the Tunnel interface using Solon Relay (paid managed tunnel service).
// Deferred — named Cloudflare tunnels solve persistence for free.
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

func (r *Relay) Setup(ctx context.Context) error {
	return fmt.Errorf("solon relay not yet implemented — use Cloudflare named tunnels instead")
}

func (r *Relay) Enable(ctx context.Context) error {
	return fmt.Errorf("solon relay not yet implemented — use Cloudflare named tunnels instead")
}

func (r *Relay) Disable(ctx context.Context) error {
	return fmt.Errorf("solon relay not yet implemented — use Cloudflare named tunnels instead")
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

func (r *Relay) IsPersistent() bool {
	return false
}
