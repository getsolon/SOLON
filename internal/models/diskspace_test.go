package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseName(t *testing.T) {
	tests := []struct {
		input    string
		wantName string
		wantSize string
	}{
		{"llama3.2:3b", "llama3.2", "3b"},
		{"deepseek-r1:14b", "deepseek-r1", "14b"},
		{"nomic-embed-text", "nomic-embed-text", ""},
		{"qwen2.5:1.5b", "qwen2.5", "1.5b"},
		{"mixtral:8x7b", "mixtral", "8x7b"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			name, size := parseName(tt.input)
			assert.Equal(t, tt.wantName, name)
			assert.Equal(t, tt.wantSize, size)
		})
	}
}

func TestEstimateModelSize(t *testing.T) {
	// Known models should return positive estimates
	assert.Greater(t, estimateModelSize("llama3.2:3b"), 0.0)
	assert.Greater(t, estimateModelSize("deepseek-r1:14b"), 0.0)
	assert.Greater(t, estimateModelSize("qwen2.5:7b"), 0.0)

	// Unknown models should return 0
	assert.Equal(t, 0.0, estimateModelSize("nonexistent:7b"))
	assert.Equal(t, 0.0, estimateModelSize("llama3.2:999b"))
}

func TestCheckDiskSpace(t *testing.T) {
	tmpDir := t.TempDir()

	// Zero or negative estimate should always pass
	assert.NoError(t, checkDiskSpace(tmpDir, 0))
	assert.NoError(t, checkDiskSpace(tmpDir, -1))

	// Reasonable estimate should pass (test machine has disk space)
	assert.NoError(t, checkDiskSpace(tmpDir, 0.001))

	// Absurdly large estimate should fail
	err := checkDiskSpace(tmpDir, 999999)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient disk space")
}
