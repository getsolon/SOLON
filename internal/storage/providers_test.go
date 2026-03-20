package storage

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProviderCRUD(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "test.db"))
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	// Create
	p, err := db.CreateProvider("anthropic", "https://api.anthropic.com", "sk-ant-test-key-1234")
	require.NoError(t, err)
	assert.Equal(t, "anthropic", p.Name)
	assert.Equal(t, "https://api.anthropic.com", p.BaseURL)
	assert.Equal(t, "...1234", p.APIKey) // masked

	// List
	providers, err := db.ListProviders()
	require.NoError(t, err)
	assert.Len(t, providers, 1)
	assert.Equal(t, "...1234", providers[0].APIKey) // masked

	// Get
	got, err := db.GetProvider("anthropic")
	require.NoError(t, err)
	assert.Equal(t, "anthropic", got.Name)
	assert.Equal(t, "...1234", got.APIKey)

	// GetProviderKey (raw)
	key, err := db.GetProviderKey("anthropic")
	require.NoError(t, err)
	assert.Equal(t, "sk-ant-test-key-1234", key)

	// Delete
	err = db.DeleteProvider("anthropic")
	require.NoError(t, err)

	providers, err = db.ListProviders()
	require.NoError(t, err)
	assert.Len(t, providers, 0)
}

func TestProviderDuplicateName(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "test.db"))
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	_, err = db.CreateProvider("openai", "https://api.openai.com", "sk-test-1")
	require.NoError(t, err)

	_, err = db.CreateProvider("openai", "https://api.openai.com", "sk-test-2")
	assert.Error(t, err) // UNIQUE constraint
}

func TestProviderDeleteNotFound(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "test.db"))
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	err = db.DeleteProvider("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestLoadProviders(t *testing.T) {
	dir := t.TempDir()
	db, err := Open(filepath.Join(dir, "test.db"))
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	_, err = db.CreateProvider("anthropic", "https://api.anthropic.com", "sk-ant-key")
	require.NoError(t, err)
	_, err = db.CreateProvider("openai", "https://api.openai.com", "sk-openai-key")
	require.NoError(t, err)

	providers, err := db.LoadProviders()
	require.NoError(t, err)
	assert.Len(t, providers, 2)

	// Raw keys should be returned for engine use
	for _, p := range providers {
		assert.NotContains(t, p.APIKey, "...")
	}
}

func TestMaskKey(t *testing.T) {
	assert.Equal(t, "...5678", maskKey("sk-ant-1234-5678"))
	assert.Equal(t, "****", maskKey("test"))
	assert.Equal(t, "****", maskKey("abc"))
	assert.Equal(t, "****", maskKey(""))
}

func TestProviderMigration(t *testing.T) {
	// Ensure the DB can be opened fresh with provider migrations
	dir := t.TempDir()
	path := filepath.Join(dir, "migration_test.db")
	db, err := Open(path)
	require.NoError(t, err)
	_ = db.Close()

	// Reopen — migrations should be idempotent
	db, err = Open(path)
	require.NoError(t, err)
	defer func() { _ = db.Close() }()

	// Provider table should exist
	providers, err := db.ListProviders()
	require.NoError(t, err)
	assert.Empty(t, providers)
	_ = os.Remove(path)
}
