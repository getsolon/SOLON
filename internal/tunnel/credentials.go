package tunnel

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Credentials holds the stored tunnel configuration for persistent named tunnels.
type Credentials struct {
	TunnelID   string `json:"tunnel_id"`
	TunnelName string `json:"tunnel_name"`
	AccountTag string `json:"account_tag,omitempty"`
	URL        string `json:"url"` // persistent URL like <tunnel-id>.cfargotunnel.com
}

// CredentialStore manages reading and writing tunnel credentials to ~/.solon/tunnel/.
type CredentialStore struct {
	dir string // ~/.solon/tunnel/
}

// NewCredentialStore creates a new credential store at the given directory.
func NewCredentialStore(dir string) *CredentialStore {
	return &CredentialStore{dir: dir}
}

// DefaultCredentialStore returns the credential store at ~/.solon/tunnel/.
func DefaultCredentialStore() (*CredentialStore, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("getting home directory: %w", err)
	}
	dir := filepath.Join(home, ".solon", "tunnel")
	return NewCredentialStore(dir), nil
}

// Save writes tunnel credentials to disk.
func (cs *CredentialStore) Save(creds *Credentials) error {
	if err := os.MkdirAll(cs.dir, 0700); err != nil {
		return fmt.Errorf("creating tunnel directory: %w", err)
	}

	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling credentials: %w", err)
	}

	path := filepath.Join(cs.dir, "credentials.json")
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("writing credentials: %w", err)
	}

	return nil
}

// Load reads tunnel credentials from disk.
func (cs *CredentialStore) Load() (*Credentials, error) {
	path := filepath.Join(cs.dir, "credentials.json")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // no credentials yet
		}
		return nil, fmt.Errorf("reading credentials: %w", err)
	}

	var creds Credentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, fmt.Errorf("parsing credentials: %w", err)
	}

	return &creds, nil
}

// Exists returns true if credentials have been saved.
func (cs *CredentialStore) Exists() bool {
	_, err := os.Stat(filepath.Join(cs.dir, "credentials.json"))
	return err == nil
}

// Dir returns the credential store directory path.
func (cs *CredentialStore) Dir() string {
	return cs.dir
}

// CloudflaredCredPath returns the path where cloudflared stores its cert.pem after login.
func (cs *CredentialStore) CloudflaredCredPath() string {
	return filepath.Join(cs.dir, "cert.pem")
}

// TunnelCredPath returns the path to the cloudflared tunnel credential JSON file.
func (cs *CredentialStore) TunnelCredPath(tunnelID string) string {
	return filepath.Join(cs.dir, tunnelID+".json")
}

// Delete removes all stored credentials.
func (cs *CredentialStore) Delete() error {
	return os.RemoveAll(cs.dir)
}
