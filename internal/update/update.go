package update

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	repo             = "theodorthirtyseven37/SOLON"
	releasesURL      = "https://api.github.com/repos/" + repo + "/releases/latest"
	cacheFileName    = "last_update_check"
	checkInterval    = 24 * time.Hour
	httpTimeout      = 10 * time.Second
)

// Release represents a GitHub release.
type Release struct {
	TagName string  `json:"tag_name"`
	Assets  []Asset `json:"assets"`
}

// Asset represents a release asset.
type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// CheckResult contains the result of a version check.
type CheckResult struct {
	CurrentVersion string
	LatestVersion  string
	UpdateAvail    bool
}

// CheckLatest checks GitHub for the latest release and compares to current version.
func CheckLatest(currentVersion string) (*CheckResult, error) {
	rel, err := fetchLatestRelease()
	if err != nil {
		return nil, err
	}

	latest := strings.TrimPrefix(rel.TagName, "v")
	current := strings.TrimPrefix(currentVersion, "v")

	return &CheckResult{
		CurrentVersion: current,
		LatestVersion:  latest,
		UpdateAvail:    current != latest && current != "dev",
	}, nil
}

// CheckLatestCached checks for updates at most once per 24h, caching in ~/.solon/.
func CheckLatestCached(currentVersion string) (*CheckResult, error) {
	cacheFile, err := cacheFilePath()
	if err != nil {
		return nil, err
	}

	// Check cache
	if info, err := os.Stat(cacheFile); err == nil {
		if time.Since(info.ModTime()) < checkInterval {
			data, err := os.ReadFile(cacheFile)
			if err == nil && len(data) > 0 {
				latest := strings.TrimSpace(string(data))
				current := strings.TrimPrefix(currentVersion, "v")
				return &CheckResult{
					CurrentVersion: current,
					LatestVersion:  latest,
					UpdateAvail:    current != latest && current != "dev",
				}, nil
			}
		}
	}

	result, err := CheckLatest(currentVersion)
	if err != nil {
		return nil, err
	}

	// Write cache
	_ = os.WriteFile(cacheFile, []byte(result.LatestVersion), 0644)

	return result, nil
}

// DoUpdate downloads and replaces the current binary with the latest release.
func DoUpdate(currentVersion string) error {
	rel, err := fetchLatestRelease()
	if err != nil {
		return fmt.Errorf("fetching release info: %w", err)
	}

	latest := strings.TrimPrefix(rel.TagName, "v")
	current := strings.TrimPrefix(currentVersion, "v")
	if current == latest {
		return fmt.Errorf("already at latest version (%s)", current)
	}

	binaryName := fmt.Sprintf("solon-%s-%s", runtime.GOOS, runtime.GOARCH)

	var binaryURL, checksumsURL string
	for _, a := range rel.Assets {
		switch a.Name {
		case binaryName:
			binaryURL = a.BrowserDownloadURL
		case "checksums.txt":
			checksumsURL = a.BrowserDownloadURL
		}
	}

	if binaryURL == "" {
		return fmt.Errorf("no binary found for %s/%s in release %s", runtime.GOOS, runtime.GOARCH, rel.TagName)
	}

	// Download to temp file
	tmpDir, err := os.MkdirTemp("", "solon-update-*")
	if err != nil {
		return fmt.Errorf("creating temp dir: %w", err)
	}
	defer func() { _ = os.RemoveAll(tmpDir) }()

	tmpBinary := filepath.Join(tmpDir, "solon")

	fmt.Printf("Downloading %s %s...\n", binaryName, rel.TagName)
	if err := downloadFile(tmpBinary, binaryURL); err != nil {
		return fmt.Errorf("downloading binary: %w", err)
	}

	// Verify checksum
	if checksumsURL != "" {
		fmt.Println("Verifying checksum...")
		tmpChecksums := filepath.Join(tmpDir, "checksums.txt")
		if err := downloadFile(tmpChecksums, checksumsURL); err != nil {
			return fmt.Errorf("downloading checksums: %w", err)
		}

		if err := verifyChecksum(tmpBinary, tmpChecksums, binaryName); err != nil {
			return fmt.Errorf("checksum verification failed: %w", err)
		}
		fmt.Println("Checksum verified.")
	}

	// Replace current binary
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("getting executable path: %w", err)
	}
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return fmt.Errorf("resolving symlinks: %w", err)
	}

	if err := os.Chmod(tmpBinary, 0755); err != nil {
		return fmt.Errorf("setting permissions: %w", err)
	}

	// Atomic-ish replace: rename old, move new, remove old
	backupPath := execPath + ".old"
	_ = os.Remove(backupPath) // clean up any previous backup

	if err := os.Rename(execPath, backupPath); err != nil {
		return fmt.Errorf("backing up current binary: %w (try running with sudo)", err)
	}

	if err := copyFile(tmpBinary, execPath); err != nil {
		// Restore backup
		_ = os.Rename(backupPath, execPath)
		return fmt.Errorf("installing new binary: %w", err)
	}

	_ = os.Remove(backupPath)

	// Clear update cache
	if cf, err := cacheFilePath(); err == nil {
		_ = os.Remove(cf)
	}

	return nil
}

func fetchLatestRelease() (*Release, error) {
	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Get(releasesURL)
	if err != nil {
		return nil, fmt.Errorf("contacting GitHub: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var rel Release
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("parsing release: %w", err)
	}
	if rel.TagName == "" {
		return nil, fmt.Errorf("no release found")
	}

	return &rel, nil
}

func downloadFile(dst, url string) error {
	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	f, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()

	_, err = io.Copy(f, resp.Body)
	return err
}

func verifyChecksum(binaryPath, checksumsPath, binaryName string) error {
	data, err := os.ReadFile(checksumsPath)
	if err != nil {
		return err
	}

	var expected string
	for _, line := range strings.Split(string(data), "\n") {
		if strings.Contains(line, binaryName) {
			fields := strings.Fields(line)
			if len(fields) >= 1 {
				expected = fields[0]
			}
			break
		}
	}

	if expected == "" {
		return fmt.Errorf("checksum not found for %s", binaryName)
	}

	f, err := os.Open(binaryPath)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return err
	}

	actual := hex.EncodeToString(h.Sum(nil))
	if actual != expected {
		return fmt.Errorf("expected %s, got %s", expected, actual)
	}

	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}

	return out.Close()
}

func cacheFilePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".solon", cacheFileName), nil
}
