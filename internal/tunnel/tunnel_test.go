package tunnel

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseTunnelID(t *testing.T) {
	jsonOutput := `[
		{"id": "abc-123", "name": "solon"},
		{"id": "def-456", "name": "other-tunnel"}
	]`

	id, err := parseTunnelID([]byte(jsonOutput), "solon")
	require.NoError(t, err)
	assert.Equal(t, "abc-123", id)
}

func TestParseTunnelIDNotFound(t *testing.T) {
	jsonOutput := `[{"id": "abc-123", "name": "other"}]`
	_, err := parseTunnelID([]byte(jsonOutput), "solon")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestParseTunnelIDEmptyList(t *testing.T) {
	_, err := parseTunnelID([]byte(`[]`), "solon")
	assert.Error(t, err)
}

func TestParseTunnelIDInvalidJSON(t *testing.T) {
	_, err := parseTunnelID([]byte(`not json`), "solon")
	assert.Error(t, err)
}

func TestCredentialStoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store := NewCredentialStore(dir)

	// Initially empty
	creds, err := store.Load()
	require.NoError(t, err)
	assert.Nil(t, creds)
	assert.False(t, store.Exists())

	// Save credentials
	err = store.Save(&Credentials{
		TunnelID:   "test-tunnel-id",
		TunnelName: "solon",
		AccountTag: "acc-123",
		URL:        "test-tunnel-id.cfargotunnel.com",
	})
	require.NoError(t, err)
	assert.True(t, store.Exists())

	// Load and verify
	creds, err = store.Load()
	require.NoError(t, err)
	require.NotNil(t, creds)
	assert.Equal(t, "test-tunnel-id", creds.TunnelID)
	assert.Equal(t, "solon", creds.TunnelName)
	assert.Equal(t, "acc-123", creds.AccountTag)
	assert.Equal(t, "test-tunnel-id.cfargotunnel.com", creds.URL)

	// Delete and verify gone
	err = store.Delete()
	require.NoError(t, err)
	assert.False(t, store.Exists())
}

func TestCredentialStorePaths(t *testing.T) {
	store := NewCredentialStore("/tmp/test-tunnel")
	assert.Equal(t, "/tmp/test-tunnel", store.Dir())
	assert.Equal(t, "/tmp/test-tunnel/cert.pem", store.CloudflaredCredPath())
	assert.Equal(t, "/tmp/test-tunnel/abc-123.json", store.TunnelCredPath("abc-123"))
}
