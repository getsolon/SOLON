package sandbox

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
)

// dockerClient talks to the Docker Engine API over a Unix socket.
type dockerClient struct {
	client *http.Client
	host   string // Unix socket path
}

func newDockerClient(socketPath string) *dockerClient {
	transport := &http.Transport{
		DialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
			return net.Dial("unix", socketPath)
		},
	}
	return &dockerClient{
		client: &http.Client{Transport: transport},
		host:   socketPath,
	}
}

func (d *dockerClient) do(ctx context.Context, method, path string, body any) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshaling request body: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, "http://docker"+path, bodyReader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return d.client.Do(req)
}

// containerCreate creates a Docker container and returns its ID.
func (d *dockerClient) containerCreate(ctx context.Context, cfg containerConfig) (string, error) {
	resp, err := d.do(ctx, "POST", "/containers/create?name="+cfg.Name, cfg.Body)
	if err != nil {
		return "", fmt.Errorf("creating container: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("creating container: status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		ID string `json:"Id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decoding container ID: %w", err)
	}
	return result.ID, nil
}

// containerStart starts a container.
func (d *dockerClient) containerStart(ctx context.Context, id string) error {
	resp, err := d.do(ctx, "POST", "/containers/"+id+"/start", nil)
	if err != nil {
		return fmt.Errorf("starting container %s: %w", id, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotModified {
		return nil // Already running
	}
	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("starting container: status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// containerStop stops a container with a timeout.
func (d *dockerClient) containerStop(ctx context.Context, id string, timeoutSec int) error {
	path := fmt.Sprintf("/containers/%s/stop?t=%d", id, timeoutSec)
	resp, err := d.do(ctx, "POST", path, nil)
	if err != nil {
		return fmt.Errorf("stopping container %s: %w", id, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotModified {
		return nil // Already stopped
	}
	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("stopping container: status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// containerRemove removes a container (force-removes if running).
func (d *dockerClient) containerRemove(ctx context.Context, id string) error {
	resp, err := d.do(ctx, "DELETE", "/containers/"+id+"?force=true&v=true", nil)
	if err != nil {
		return fmt.Errorf("removing container %s: %w", id, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("removing container: status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// containerInspect returns the state of a container.
func (d *dockerClient) containerInspect(ctx context.Context, id string) (*containerState, error) {
	resp, err := d.do(ctx, "GET", "/containers/"+id+"/json", nil)
	if err != nil {
		return nil, fmt.Errorf("inspecting container %s: %w", id, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("container %s not found", id)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("inspecting container: status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		State struct {
			Status   string `json:"Status"`
			Running  bool   `json:"Running"`
			ExitCode int    `json:"ExitCode"`
		} `json:"State"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding container state: %w", err)
	}

	return &containerState{
		Status:   result.State.Status,
		Running:  result.State.Running,
		ExitCode: result.State.ExitCode,
	}, nil
}

// containerLogs returns the logs for a container.
func (d *dockerClient) containerLogs(ctx context.Context, id string, tail int, follow bool) (io.ReadCloser, error) {
	path := fmt.Sprintf("/containers/%s/logs?stdout=true&stderr=true&tail=%d&follow=%t", id, tail, follow)
	resp, err := d.do(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("getting container logs: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return nil, fmt.Errorf("getting container logs: status %d: %s", resp.StatusCode, string(body))
	}

	return resp.Body, nil
}

// containerList lists containers matching the given label filter.
func (d *dockerClient) containerList(ctx context.Context, labelFilter string) ([]containerListEntry, error) {
	filters := fmt.Sprintf(`{"label":["%s"]}`, labelFilter)
	path := "/containers/json?all=true&filters=" + filters
	resp, err := d.do(ctx, "GET", path, nil)
	if err != nil {
		return nil, fmt.Errorf("listing containers: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("listing containers: status %d: %s", resp.StatusCode, string(body))
	}

	var entries []containerListEntry
	if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
		return nil, fmt.Errorf("decoding container list: %w", err)
	}
	return entries, nil
}

// networkCreate creates a Docker network.
func (d *dockerClient) networkCreate(ctx context.Context, name string) error {
	body := map[string]any{
		"Name":   name,
		"Driver": "bridge",
	}
	resp, err := d.do(ctx, "POST", "/networks/create", body)
	if err != nil {
		return fmt.Errorf("creating network %s: %w", name, err)
	}
	defer func() { _ = resp.Body.Close() }()

	// 409 means network already exists — that's fine
	if resp.StatusCode == http.StatusConflict {
		return nil
	}
	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		// "already exists" in the error body is also fine
		if strings.Contains(string(respBody), "already exists") {
			return nil
		}
		return fmt.Errorf("creating network: status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// networkExists checks if a Docker network exists.
func (d *dockerClient) networkExists(ctx context.Context, name string) bool {
	resp, err := d.do(ctx, "GET", "/networks/"+name, nil)
	if err != nil {
		return false
	}
	_ = resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// --- Types for Docker API ---

type containerConfig struct {
	Name string
	Body map[string]any
}

type containerState struct {
	Status   string
	Running  bool
	ExitCode int
}

type containerListEntry struct {
	ID     string            `json:"Id"`
	Names  []string          `json:"Names"`
	State  string            `json:"State"`
	Status string            `json:"Status"`
	Labels map[string]string `json:"Labels"`
}
