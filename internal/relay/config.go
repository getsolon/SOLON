package relay

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// InstanceConfig holds the relay registration for this Solon instance.
type InstanceConfig struct {
	InstanceID string `json:"instance_id"`
	RelayURL   string `json:"relay_url"` // e.g. "https://relay.getsolon.dev/{id}"
}

// configPath returns ~/.solon/relay.json
func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".solon", "relay.json"), nil
}

// LoadConfig loads the relay config, or returns nil if not registered.
func LoadConfig() (*InstanceConfig, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading relay config: %w", err)
	}

	var cfg InstanceConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing relay config: %w", err)
	}

	return &cfg, nil
}

// SaveConfig writes the relay config to disk.
func SaveConfig(cfg *InstanceConfig) error {
	path, err := configPath()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0600)
}

// GenerateInstanceID creates a cryptographically random 24-char hex ID.
func GenerateInstanceID() (string, error) {
	b := make([]byte, 12) // 12 bytes = 24 hex chars = 96 bits of entropy
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
