package tunnel

import (
	"encoding/json"
	"fmt"
)

// cloudflaredTunnel represents a single tunnel from `cloudflared tunnel list -o json`.
type cloudflaredTunnel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// parseTunnelID extracts the tunnel ID for a given name from cloudflared JSON output.
func parseTunnelID(jsonOutput []byte, tunnelName string) (string, error) {
	var tunnels []cloudflaredTunnel
	if err := json.Unmarshal(jsonOutput, &tunnels); err != nil {
		return "", fmt.Errorf("parsing tunnel list: %w", err)
	}

	for _, t := range tunnels {
		if t.Name == tunnelName {
			return t.ID, nil
		}
	}

	return "", fmt.Errorf("tunnel %q not found in cloudflared output", tunnelName)
}
