package sandbox

import (
	"context"
	"log"
	"os"
	"runtime"
	"time"
)

// ResolveDockerSocket returns the Docker socket path to use.
// If override is non-empty, it is returned as-is.
// Otherwise, it checks common locations for the platform.
func ResolveDockerSocket(override string) string {
	if override != "" {
		return override
	}

	// Check DOCKER_HOST env var (e.g., unix:///path/to/socket)
	if host := os.Getenv("DOCKER_HOST"); host != "" {
		const unixPrefix = "unix://"
		if len(host) > len(unixPrefix) && host[:len(unixPrefix)] == unixPrefix {
			return host[len(unixPrefix):]
		}
	}

	candidates := []string{"/var/run/docker.sock"}
	if runtime.GOOS == "darwin" {
		// Docker Desktop on macOS uses ~/.docker/run/docker.sock
		if home, err := os.UserHomeDir(); err == nil {
			candidates = append([]string{home + "/.docker/run/docker.sock"}, candidates...)
		}
		// Colima
		if home, err := os.UserHomeDir(); err == nil {
			candidates = append(candidates, home+"/.colima/default/docker.sock")
		}
	}

	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	// Fallback to standard path even if it doesn't exist yet
	return "/var/run/docker.sock"
}

// HealthMonitor periodically checks sandbox containers and restarts any that
// have exited unexpectedly. It runs until the context is cancelled.
type HealthMonitor struct {
	manager  *Manager
	interval time.Duration
}

// NewHealthMonitor creates a health monitor that checks containers every interval.
func NewHealthMonitor(mgr *Manager, interval time.Duration) *HealthMonitor {
	return &HealthMonitor{
		manager:  mgr,
		interval: interval,
	}
}

// Run starts the health monitoring loop. It blocks until ctx is cancelled.
func (h *HealthMonitor) Run(ctx context.Context) {
	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	log.Printf("[health] Container health monitor started (interval=%s)", h.interval)

	for {
		select {
		case <-ctx.Done():
			log.Println("[health] Container health monitor stopped")
			return
		case <-ticker.C:
			h.check(ctx)
		}
	}
}

func (h *HealthMonitor) check(ctx context.Context) {
	sandboxes, err := h.manager.List(ctx)
	if err != nil {
		log.Printf("[health] Failed to list sandboxes: %v", err)
		return
	}

	for _, sb := range sandboxes {
		if sb.ContainerID == "" {
			continue
		}

		state, err := h.manager.docker.containerInspect(ctx, sb.ContainerID)
		if err != nil {
			log.Printf("[health] Cannot inspect container for sandbox %s (%s): %v", sb.Name, sb.ID, err)
			continue
		}

		// Auto-restart containers that exited with non-zero code
		if !state.Running && state.ExitCode != 0 {
			log.Printf("[health] Sandbox %s (%s) exited with code %d — restarting", sb.Name, sb.ID, state.ExitCode)
			if err := h.manager.docker.containerStart(ctx, sb.ContainerID); err != nil {
				log.Printf("[health] Failed to restart sandbox %s: %v", sb.Name, err)
				_ = h.manager.store.UpdateSandboxStatus(sb.ID, StatusFailed)
			} else {
				log.Printf("[health] Sandbox %s restarted successfully", sb.Name)
				_ = h.manager.store.UpdateSandboxStatus(sb.ID, StatusRunning)
			}
		}
	}
}
