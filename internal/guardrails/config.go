package guardrails

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config holds the guardrails configuration.
type Config struct {
	Enabled bool         `yaml:"enabled"`
	Gate    GateConfig   `yaml:"gate"`
	Shield  ShieldConfig `yaml:"shield"`
	Audit   AuditConfig  `yaml:"audit"`
}

// GateConfig controls structural validation limits.
type GateConfig struct {
	MaxBodyBytes     int `yaml:"max_body_bytes"`
	MaxMessages      int `yaml:"max_messages"`
	MaxContentLength int `yaml:"max_content_length"`
	MaxTokensCap     int `yaml:"max_tokens_cap"`
}

// ShieldConfig controls prompt injection detection.
type ShieldConfig struct {
	Enabled   bool    `yaml:"enabled"`
	Threshold float64 `yaml:"threshold"`
	Action    string  `yaml:"action"` // "block", "flag", "log"
}

// AuditConfig controls guardrail event logging.
type AuditConfig struct {
	Enabled       bool `yaml:"enabled"`
	LogContent    bool `yaml:"log_content"`
	RetentionDays int  `yaml:"retention_days"`
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() *Config {
	return &Config{
		Enabled: true,
		Gate: GateConfig{
			MaxBodyBytes:     1 << 20, // 1 MB
			MaxMessages:      256,
			MaxContentLength: 100_000,
			MaxTokensCap:     8192,
		},
		Shield: ShieldConfig{
			Enabled:   true,
			Threshold: 0.7,
			Action:    "block",
		},
		Audit: AuditConfig{
			Enabled:       true,
			RetentionDays: 30,
		},
	}
}

// LoadConfig loads guardrails config from the given path.
// Returns DefaultConfig if the file doesn't exist.
func LoadConfig(path string) *Config {
	cfg := DefaultConfig()

	data, err := os.ReadFile(path)
	if err != nil {
		return cfg
	}

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return DefaultConfig()
	}

	return cfg
}

// ConfigPath returns the default guardrails config path (~/.solon/guardrails.yaml).
func ConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".solon", "guardrails.yaml")
}

// PoliciesDir returns the default policies directory (~/.solon/policies/).
func PoliciesDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".solon", "policies")
}
