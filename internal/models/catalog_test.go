package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetCatalog(t *testing.T) {
	catalog := GetCatalog()
	require.NotEmpty(t, catalog, "catalog should not be empty")

	// Verify basic structure of each model
	for _, m := range catalog {
		assert.NotEmpty(t, m.Name, "model name should not be empty")
		assert.NotEmpty(t, m.Description, "description should not be empty for %s", m.Name)
		assert.NotEmpty(t, m.Creator, "creator should not be empty for %s", m.Name)
		assert.NotEmpty(t, m.Sizes, "sizes should not be empty for %s", m.Name)
		assert.NotEmpty(t, m.Category, "category should not be empty for %s", m.Name)
		assert.NotEmpty(t, m.Sources, "sources should not be empty for %s", m.Name)
		assert.Greater(t, m.Context, 0, "context should be positive for %s", m.Name)

		// Every listed size should have a corresponding source
		for _, size := range m.Sizes {
			source, ok := m.Sources[size]
			assert.True(t, ok, "model %s should have source for size %s", m.Name, size)
			if ok {
				assert.NotEmpty(t, source.Repo, "repo should not be empty for %s:%s", m.Name, size)
				assert.NotEmpty(t, source.File, "file filter should not be empty for %s:%s", m.Name, size)
				assert.NotEmpty(t, source.R2URL, "R2 URL should not be empty for %s:%s", m.Name, size)
			}
		}

		// Every listed size should have VRAM info
		for _, size := range m.Sizes {
			vram, ok := m.VRAM[size]
			assert.True(t, ok, "model %s should have VRAM info for size %s", m.Name, size)
			if ok {
				assert.Greater(t, vram, 0.0, "VRAM should be positive for %s:%s", m.Name, size)
			}
		}
	}
}

func TestGetCatalogKnownModels(t *testing.T) {
	catalog := GetCatalog()

	// Verify some expected models exist
	names := make(map[string]bool)
	for _, m := range catalog {
		names[m.Name] = true
	}

	expectedModels := []string{"llama3.2", "gemma3", "qwen2.5", "mistral", "deepseek-r1"}
	for _, name := range expectedModels {
		assert.True(t, names[name], "catalog should contain %s", name)
	}
}

func TestGetCatalogCategories(t *testing.T) {
	catalog := GetCatalog()

	validCategories := map[string]bool{"chat": true, "code": true, "embedding": true}
	for _, m := range catalog {
		assert.True(t, validCategories[m.Category], "model %s has invalid category %q", m.Name, m.Category)
	}
}

func TestDefaultModelsFromCatalog(t *testing.T) {
	models := DefaultModelsFromCatalog()
	require.NotEmpty(t, models, "default models should not be empty")

	// Check that model:size keys are generated
	assert.Contains(t, models, "llama3.2:3b")
	assert.Contains(t, models, "qwen2.5:7b")
	assert.Contains(t, models, "deepseek-r1:14b")

	// Embedding models should be accessible without size suffix
	assert.Contains(t, models, "nomic-embed-text")
	assert.Contains(t, models, "mxbai-embed-large")

	// Verify a specific source
	llama := models["llama3.2:3b"]
	assert.NotEmpty(t, llama.Repo)
	assert.NotEmpty(t, llama.File)
	assert.NotEmpty(t, llama.R2URL)
}
