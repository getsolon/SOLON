package storage

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogRequest(t *testing.T) {
	db := testDB(t)

	key, err := db.CreateKey("log-test", "user")
	require.NoError(t, err)

	err = db.LogRequest(key.ID, "POST", "/v1/chat/completions", "llama3.2:8b", 100, 50, 250, 200)
	require.NoError(t, err)

	logs, err := db.GetRequestLog(10)
	require.NoError(t, err)
	require.Len(t, logs, 1)

	assert.Equal(t, key.ID, logs[0].KeyID)
	assert.Equal(t, "POST", logs[0].Method)
	assert.Equal(t, "/v1/chat/completions", logs[0].Path)
	assert.Equal(t, "llama3.2:8b", logs[0].Model)
	assert.Equal(t, 100, logs[0].TokensIn)
	assert.Equal(t, 50, logs[0].TokensOut)
	assert.Equal(t, 250, logs[0].LatencyMS)
	assert.Equal(t, 200, logs[0].StatusCode)
}

func TestGetRequestLogLimit(t *testing.T) {
	db := testDB(t)

	key, err := db.CreateKey("limit-test", "user")
	require.NoError(t, err)

	// Insert 5 requests
	for i := 0; i < 5; i++ {
		err = db.LogRequest(key.ID, "POST", "/v1/chat/completions", "llama3.2:8b", 10, 5, 100, 200)
		require.NoError(t, err)
	}

	// Request with limit of 3
	logs, err := db.GetRequestLog(3)
	require.NoError(t, err)
	assert.Len(t, logs, 3)

	// All 5
	logs, err = db.GetRequestLog(100)
	require.NoError(t, err)
	assert.Len(t, logs, 5)
}

func TestGetRequestLogEmpty(t *testing.T) {
	db := testDB(t)

	logs, err := db.GetRequestLog(10)
	require.NoError(t, err)
	assert.Empty(t, logs)
}

func TestGetUsageStats(t *testing.T) {
	db := testDB(t)

	// Empty stats
	stats, err := db.GetUsageStats()
	require.NoError(t, err)
	assert.Equal(t, int64(0), stats.TotalRequests)

	key, err := db.CreateKey("stats-test", "user")
	require.NoError(t, err)

	// Log some requests
	_ = db.LogRequest(key.ID, "POST", "/v1/chat/completions", "llama3.2:8b", 100, 50, 200, 200)
	_ = db.LogRequest(key.ID, "POST", "/v1/chat/completions", "llama3.2:8b", 200, 100, 400, 200)
	_ = db.LogRequest(key.ID, "POST", "/v1/embeddings", "nomic-embed-text", 50, 0, 50, 200)

	stats, err = db.GetUsageStats()
	require.NoError(t, err)

	assert.Equal(t, int64(3), stats.TotalRequests)
	assert.Equal(t, int64(350), stats.TotalTokensIn)
	assert.Equal(t, int64(150), stats.TotalTokensOut)
	assert.InDelta(t, 216.67, stats.AvgLatencyMS, 1.0)
	assert.Equal(t, int64(1), stats.UniqueKeysUsed)
	assert.Equal(t, "llama3.2:8b", stats.MostUsedModel)
}

func TestGetUsageStatsMultipleKeys(t *testing.T) {
	db := testDB(t)

	key1, _ := db.CreateKey("key-1", "user")
	key2, _ := db.CreateKey("key-2", "user")

	_ = db.LogRequest(key1.ID, "POST", "/v1/chat/completions", "llama3.2:8b", 10, 5, 100, 200)
	_ = db.LogRequest(key2.ID, "POST", "/v1/chat/completions", "mistral:7b", 20, 10, 150, 200)

	stats, err := db.GetUsageStats()
	require.NoError(t, err)

	assert.Equal(t, int64(2), stats.TotalRequests)
	assert.Equal(t, int64(2), stats.UniqueKeysUsed)
}
