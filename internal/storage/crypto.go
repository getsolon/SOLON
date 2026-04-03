package storage

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	// encryptedPrefix marks a value as encrypted so we can distinguish from plaintext during migration.
	encryptedPrefix = "enc:"
	// secretKeyFile is stored alongside the database in the Solon data directory.
	secretKeyFile = "secret.key"
	// keySize is AES-256.
	keySize = 32
)

// secretKey holds the loaded encryption key for the lifetime of the DB.
var secretKey []byte

// initSecretKey loads or creates the encryption key in the Solon data directory.
// The key file is created with 0600 permissions.
func initSecretKey(dbPath string) error {
	if secretKey != nil {
		return nil
	}

	dir := filepath.Dir(dbPath)
	keyPath := filepath.Join(dir, secretKeyFile)

	data, err := os.ReadFile(keyPath)
	if err == nil && len(data) == keySize {
		secretKey = data
		return nil
	}

	// Generate new key
	key := make([]byte, keySize)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return fmt.Errorf("generating secret key: %w", err)
	}

	if err := os.WriteFile(keyPath, key, 0600); err != nil {
		return fmt.Errorf("writing secret key: %w", err)
	}

	secretKey = key
	return nil
}

// encryptValue encrypts a plaintext string using AES-256-GCM and returns an
// "enc:" prefixed base64 blob.
func encryptValue(plaintext string) (string, error) {
	if secretKey == nil {
		return plaintext, nil // No key loaded, store plaintext (non-standard path)
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return "", fmt.Errorf("creating cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("creating GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generating nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return encryptedPrefix + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decryptValue decrypts an "enc:" prefixed base64 blob back to plaintext.
// If the value is not prefixed, it is returned as-is (legacy plaintext).
func decryptValue(value string) (string, error) {
	if !strings.HasPrefix(value, encryptedPrefix) {
		return value, nil // Legacy plaintext — return as-is
	}

	if secretKey == nil {
		return "", fmt.Errorf("cannot decrypt: no secret key loaded")
	}

	data, err := base64.StdEncoding.DecodeString(value[len(encryptedPrefix):])
	if err != nil {
		return "", fmt.Errorf("decoding encrypted value: %w", err)
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return "", fmt.Errorf("creating cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("creating GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("encrypted value too short")
	}

	plaintext, err := gcm.Open(nil, data[:nonceSize], data[nonceSize:], nil)
	if err != nil {
		return "", fmt.Errorf("decrypting value: %w", err)
	}

	return string(plaintext), nil
}

// migrateProviderKeys re-encrypts any plaintext API keys in the providers table.
func (d *DB) migrateProviderKeys() {
	if secretKey == nil {
		return
	}

	rows, err := d.db.Query(`SELECT id, api_key FROM providers`)
	if err != nil {
		return
	}
	defer func() { _ = rows.Close() }()

	type row struct {
		id, key string
	}
	var toMigrate []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.key); err != nil {
			continue
		}
		if !strings.HasPrefix(r.key, encryptedPrefix) {
			toMigrate = append(toMigrate, r)
		}
	}

	for _, r := range toMigrate {
		encrypted, err := encryptValue(r.key)
		if err != nil {
			continue
		}
		_, _ = d.db.Exec(`UPDATE providers SET api_key = ? WHERE id = ?`, encrypted, r.id)
	}
}
