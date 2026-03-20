package storage

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ProviderConfig represents an external API provider stored in the database.
type ProviderConfig struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	BaseURL   string    `json:"base_url"`
	APIKey    string    `json:"api_key"` // Masked in list responses
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

// WellKnownProviders maps provider names to default base URLs.
var WellKnownProviders = map[string]string{
	"anthropic": "https://api.anthropic.com",
	"openai":    "https://api.openai.com",
}

// CreateProvider stores a new external API provider.
func (d *DB) CreateProvider(name, baseURL, apiKey string) (*ProviderConfig, error) {
	id := uuid.New().String()

	_, err := d.db.Exec(
		`INSERT INTO providers (id, name, base_url, api_key) VALUES (?, ?, ?, ?)`,
		id, name, baseURL, apiKey,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting provider: %w", err)
	}

	return &ProviderConfig{
		ID:        id,
		Name:      name,
		BaseURL:   baseURL,
		APIKey:    maskKey(apiKey),
		Enabled:   true,
		CreatedAt: time.Now(),
	}, nil
}

// ListProviders returns all providers with masked API keys.
func (d *DB) ListProviders() ([]ProviderConfig, error) {
	rows, err := d.db.Query(
		`SELECT id, name, base_url, api_key, enabled, created_at FROM providers ORDER BY created_at`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying providers: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var providers []ProviderConfig
	for rows.Next() {
		var p ProviderConfig
		if err := rows.Scan(&p.ID, &p.Name, &p.BaseURL, &p.APIKey, &p.Enabled, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning provider: %w", err)
		}
		p.APIKey = maskKey(p.APIKey)
		providers = append(providers, p)
	}

	return providers, nil
}

// GetProvider returns a single provider by name with a masked API key.
func (d *DB) GetProvider(name string) (*ProviderConfig, error) {
	var p ProviderConfig
	err := d.db.QueryRow(
		`SELECT id, name, base_url, api_key, enabled, created_at FROM providers WHERE name = ?`,
		name,
	).Scan(&p.ID, &p.Name, &p.BaseURL, &p.APIKey, &p.Enabled, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("provider %q not found", name)
	}
	p.APIKey = maskKey(p.APIKey)
	return &p, nil
}

// GetProviderKey returns the raw (unmasked) API key for internal proxy use.
func (d *DB) GetProviderKey(name string) (string, error) {
	var key string
	err := d.db.QueryRow(`SELECT api_key FROM providers WHERE name = ? AND enabled = TRUE`, name).Scan(&key)
	if err != nil {
		return "", fmt.Errorf("provider %q not found or disabled", name)
	}
	return key, nil
}

// DeleteProvider removes a provider by name.
func (d *DB) DeleteProvider(name string) error {
	result, err := d.db.Exec(`DELETE FROM providers WHERE name = ?`, name)
	if err != nil {
		return fmt.Errorf("deleting provider: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("provider %q not found", name)
	}
	return nil
}

// LoadProviders returns all enabled providers with raw API keys (for engine init).
func (d *DB) LoadProviders() ([]ProviderConfig, error) {
	rows, err := d.db.Query(
		`SELECT id, name, base_url, api_key, enabled, created_at FROM providers WHERE enabled = TRUE`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying providers: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var providers []ProviderConfig
	for rows.Next() {
		var p ProviderConfig
		if err := rows.Scan(&p.ID, &p.Name, &p.BaseURL, &p.APIKey, &p.Enabled, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning provider: %w", err)
		}
		providers = append(providers, p)
	}

	return providers, nil
}

// maskKey returns the last 4 characters of a key, prefixed with "...".
func maskKey(key string) string {
	if len(key) <= 4 {
		return "****"
	}
	return "..." + key[len(key)-4:]
}
