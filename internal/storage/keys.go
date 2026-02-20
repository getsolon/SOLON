package storage

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// APIKey represents an API key stored in the database.
type APIKey struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Prefix    string    `json:"prefix"`
	Hash      string    `json:"-"` // Never serialize the hash
	Scope     string    `json:"scope"`
	RateLimit int       `json:"rate_limit"`
	CreatedAt time.Time `json:"created_at"`
	LastUsed  *time.Time `json:"last_used,omitempty"`
	Revoked   bool      `json:"revoked"`
	Raw       string    `json:"key,omitempty"` // Only set on creation
}

// CreateKey generates a new API key, bcrypt-hashes it, and stores it.
// The raw key is returned in the APIKey.Raw field and is never stored.
func (d *DB) CreateKey(name, scope string) (*APIKey, error) {
	// Generate 28 bytes of cryptographic randomness
	randomBytes := make([]byte, 21) // 21 bytes → 28 base64 chars
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, fmt.Errorf("generating random bytes: %w", err)
	}

	env := "live"
	rawKey := fmt.Sprintf("sol_sk_%s_%s", env, base64.RawURLEncoding.EncodeToString(randomBytes))

	// bcrypt-hash the key for storage
	hash, err := bcrypt.GenerateFromPassword([]byte(rawKey), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing key: %w", err)
	}

	id := uuid.New().String()
	prefix := rawKey[:16] // sol_sk_live_xxxx — enough for lookup

	_, err = d.db.Exec(
		`INSERT INTO api_keys (id, name, prefix, hash, scope) VALUES (?, ?, ?, ?, ?)`,
		id, name, prefix, string(hash), scope,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting key: %w", err)
	}

	return &APIKey{
		ID:        id,
		Name:      name,
		Prefix:    prefix,
		Scope:     scope,
		RateLimit: 60,
		CreatedAt: time.Now(),
		Raw:       rawKey,
	}, nil
}

// ValidateKey checks if a raw API key is valid and not revoked.
// Returns the key info if valid.
func (d *DB) ValidateKey(rawKey string) (*APIKey, error) {
	if len(rawKey) < 16 {
		return nil, fmt.Errorf("invalid key format")
	}

	prefix := rawKey[:16]

	rows, err := d.db.Query(
		`SELECT id, name, prefix, hash, scope, rate_limit, created_at, revoked FROM api_keys WHERE prefix = ?`,
		prefix,
	)
	if err != nil {
		return nil, fmt.Errorf("querying keys: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var key APIKey
		if err := rows.Scan(&key.ID, &key.Name, &key.Prefix, &key.Hash, &key.Scope, &key.RateLimit, &key.CreatedAt, &key.Revoked); err != nil {
			continue
		}

		if key.Revoked {
			continue
		}

		// bcrypt-compare the raw key against the stored hash
		if err := bcrypt.CompareHashAndPassword([]byte(key.Hash), []byte(rawKey)); err == nil {
			// Update last_used timestamp
			d.db.Exec(`UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?`, key.ID)
			return &key, nil
		}
	}

	return nil, fmt.Errorf("invalid API key")
}

// ListKeys returns all API keys (without hashes).
func (d *DB) ListKeys() ([]APIKey, error) {
	rows, err := d.db.Query(
		`SELECT id, name, prefix, scope, rate_limit, created_at, last_used, revoked FROM api_keys WHERE revoked = FALSE ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying keys: %w", err)
	}
	defer rows.Close()

	var keys []APIKey
	for rows.Next() {
		var key APIKey
		if err := rows.Scan(&key.ID, &key.Name, &key.Prefix, &key.Scope, &key.RateLimit, &key.CreatedAt, &key.LastUsed, &key.Revoked); err != nil {
			return nil, fmt.Errorf("scanning key: %w", err)
		}
		keys = append(keys, key)
	}

	return keys, nil
}

// HasKeys returns true if the database contains any non-revoked API keys.
func (d *DB) HasKeys() (bool, error) {
	var count int
	err := d.db.QueryRow(`SELECT COUNT(*) FROM api_keys WHERE revoked = FALSE`).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("checking for keys: %w", err)
	}
	return count > 0, nil
}

// RevokeKey marks an API key as revoked. Accepts either a key ID or raw key prefix.
func (d *DB) RevokeKey(identifier string) error {
	// Try by ID first
	result, err := d.db.Exec(`UPDATE api_keys SET revoked = TRUE WHERE id = ?`, identifier)
	if err != nil {
		return fmt.Errorf("revoking key: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows > 0 {
		return nil
	}

	// Try by prefix match
	if len(identifier) >= 16 {
		prefix := identifier[:16]
		result, err = d.db.Exec(`UPDATE api_keys SET revoked = TRUE WHERE prefix = ?`, prefix)
		if err != nil {
			return fmt.Errorf("revoking key: %w", err)
		}
		rows, _ = result.RowsAffected()
		if rows > 0 {
			return nil
		}
	}

	return fmt.Errorf("key not found")
}
