package tunnel

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

// cloudflaredDownloadURL returns the GitHub release URL for the current platform.
func cloudflaredDownloadURL() (string, error) {
	const base = "https://github.com/cloudflare/cloudflared/releases/latest/download"

	switch runtime.GOOS {
	case "darwin":
		if runtime.GOARCH == "arm64" {
			return base + "/cloudflared-darwin-arm64.tgz", nil
		}
		return base + "/cloudflared-darwin-amd64.tgz", nil
	case "linux":
		if runtime.GOARCH == "arm64" {
			return base + "/cloudflared-linux-arm64", nil
		}
		return base + "/cloudflared-linux-amd64", nil
	default:
		return "", fmt.Errorf("unsupported platform: %s/%s", runtime.GOOS, runtime.GOARCH)
	}
}

// managedBinDir returns ~/.solon/bin/, creating it if needed.
func managedBinDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("getting home directory: %w", err)
	}
	dir := filepath.Join(home, ".solon", "bin")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("creating bin directory: %w", err)
	}
	return dir, nil
}

// findCloudflared looks for cloudflared in PATH, then in ~/.solon/bin/.
// Returns the path to the binary, or empty string if not found.
func findCloudflared() string {
	// Check PATH first
	if path, err := exec.LookPath("cloudflared"); err == nil {
		return path
	}

	// Check managed location
	binDir, err := managedBinDir()
	if err != nil {
		return ""
	}
	managed := filepath.Join(binDir, "cloudflared")
	if _, err := os.Stat(managed); err == nil {
		return managed
	}

	return ""
}

// EnsureCloudflared finds or downloads cloudflared.
// Returns the path to the binary.
func EnsureCloudflared(ctx context.Context, progressFn func(string)) (string, error) {
	// Already available?
	if path := findCloudflared(); path != "" {
		return path, nil
	}

	// Download it
	if progressFn != nil {
		progressFn("Downloading cloudflared...")
	}

	binDir, err := managedBinDir()
	if err != nil {
		return "", err
	}

	destPath := filepath.Join(binDir, "cloudflared")

	url, err := cloudflaredDownloadURL()
	if err != nil {
		return "", err
	}

	if err := downloadCloudflared(ctx, url, destPath, progressFn); err != nil {
		return "", fmt.Errorf("downloading cloudflared: %w", err)
	}

	// Make executable
	if err := os.Chmod(destPath, 0755); err != nil {
		return "", fmt.Errorf("setting permissions: %w", err)
	}

	// Verify it runs
	out, err := exec.CommandContext(ctx, destPath, "version").Output()
	if err != nil {
		_ = os.Remove(destPath)
		return "", fmt.Errorf("cloudflared verification failed: %w", err)
	}

	if progressFn != nil {
		progressFn(fmt.Sprintf("Installed cloudflared: %s", string(out[:min(len(out), 60)])))
	}

	return destPath, nil
}

func downloadCloudflared(ctx context.Context, url, destPath string, progressFn func(string)) error {
	client := &http.Client{Timeout: 5 * time.Minute}
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("fetching %s: %w", url, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	// For macOS, cloudflared is distributed as a .tgz
	if runtime.GOOS == "darwin" {
		return downloadAndExtractTgz(resp.Body, destPath, progressFn)
	}

	// For Linux, it's a raw binary
	return downloadRawBinary(resp.Body, destPath, resp.ContentLength, progressFn)
}

func downloadRawBinary(body io.Reader, destPath string, totalBytes int64, progressFn func(string)) error {
	tmpPath := destPath + ".tmp"
	f, err := os.Create(tmpPath)
	if err != nil {
		return err
	}
	defer func() {
		_ = f.Close()
		_ = os.Remove(tmpPath) // clean up on error
	}()

	var written int64
	buf := make([]byte, 32*1024)
	for {
		n, readErr := body.Read(buf)
		if n > 0 {
			if _, err := f.Write(buf[:n]); err != nil {
				return err
			}
			written += int64(n)
			if progressFn != nil && totalBytes > 0 {
				pct := float64(written) / float64(totalBytes) * 100
				progressFn(fmt.Sprintf("Downloading cloudflared... %.0f%%", pct))
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}

	if err := f.Close(); err != nil {
		return err
	}

	return os.Rename(tmpPath, destPath)
}

func downloadAndExtractTgz(body io.Reader, destPath string, progressFn func(string)) error {
	// Download to a temp .tgz file first
	tmpDir, err := os.MkdirTemp("", "cloudflared-*")
	if err != nil {
		return err
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	tgzPath := filepath.Join(tmpDir, "cloudflared.tgz")
	f, err := os.Create(tgzPath)
	if err != nil {
		return err
	}

	if _, err := io.Copy(f, body); err != nil {
		_ = f.Close()
		return err
	}
	_ = f.Close()

	if progressFn != nil {
		progressFn("Extracting cloudflared...")
	}

	// Extract using tar (available on macOS)
	cmd := exec.Command("tar", "xzf", tgzPath, "-C", tmpDir)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("extracting tgz: %w", err)
	}

	// Find the cloudflared binary in extracted files
	extracted := filepath.Join(tmpDir, "cloudflared")
	if _, err := os.Stat(extracted); err != nil {
		return fmt.Errorf("cloudflared binary not found in archive")
	}

	return os.Rename(extracted, destPath)
}
