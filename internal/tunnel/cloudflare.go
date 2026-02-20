package tunnel

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"sync"
	"time"
)

// urlPattern matches the Cloudflare quick tunnel URL from cloudflared output.
var urlPattern = regexp.MustCompile(`https://[a-zA-Z0-9-]+\.trycloudflare\.com`)

// Cloudflare implements the Tunnel interface using Cloudflare Tunnel (cloudflared).
type Cloudflare struct {
	port    int
	url     string
	enabled bool
	cmd     *exec.Cmd
	mu      sync.Mutex
}

// NewCloudflare creates a new Cloudflare tunnel manager.
func NewCloudflare(port int) *Cloudflare {
	return &Cloudflare{port: port}
}

func (c *Cloudflare) Enable(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.enabled {
		return fmt.Errorf("tunnel already enabled")
	}

	// Check if cloudflared is installed
	path, err := exec.LookPath("cloudflared")
	if err != nil {
		return fmt.Errorf("cloudflared not found in PATH — install it with: brew install cloudflared")
	}

	// Start cloudflared quick tunnel
	c.cmd = exec.CommandContext(ctx, path,
		"tunnel", "--url", fmt.Sprintf("http://localhost:%d", c.port),
	)

	// cloudflared prints the tunnel URL to stderr
	stderr, err := c.cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("creating stderr pipe: %w", err)
	}

	if err := c.cmd.Start(); err != nil {
		return fmt.Errorf("starting cloudflared: %w", err)
	}

	c.enabled = true

	// Parse stderr in a goroutine to extract the tunnel URL
	urlCh := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			if match := urlPattern.FindString(line); match != "" {
				select {
				case urlCh <- match:
				default:
				}
			}
		}
	}()

	// Wait up to 15 seconds for the URL to appear
	select {
	case url := <-urlCh:
		c.url = url
	case <-time.After(15 * time.Second):
		c.url = "(tunnel starting — URL not yet available)"
	}

	return nil
}

func (c *Cloudflare) Disable(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.enabled {
		return nil
	}

	if c.cmd != nil && c.cmd.Process != nil {
		if err := c.cmd.Process.Kill(); err != nil {
			return fmt.Errorf("stopping cloudflared: %w", err)
		}
	}

	c.enabled = false
	c.url = ""
	c.cmd = nil
	return nil
}

func (c *Cloudflare) Status(ctx context.Context) (*TunnelStatus, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	return &TunnelStatus{
		Enabled:  c.enabled,
		URL:      c.url,
		Provider: "cloudflare",
	}, nil
}

func (c *Cloudflare) URL() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.url
}
