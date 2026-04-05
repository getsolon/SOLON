package models

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRegistry(t *testing.T) *Registry {
	t.Helper()
	tmpDir := t.TempDir()
	r, err := NewRegistry(tmpDir)
	require.NoError(t, err)
	return r
}

func TestNewRegistry(t *testing.T) {
	tmpDir := t.TempDir()
	r, err := NewRegistry(tmpDir)
	require.NoError(t, err)

	// Directories should be created
	assert.DirExists(t, filepath.Join(tmpDir, "models", "manifests"))
	assert.DirExists(t, filepath.Join(tmpDir, "models", "blobs"))

	// Should have default models loaded
	known := r.KnownModels()
	assert.NotEmpty(t, known)
	assert.Contains(t, known, "llama3.2:3b")
}

func TestRegistryResolveSource(t *testing.T) {
	r := setupTestRegistry(t)

	tests := []struct {
		name    string
		input   string
		wantErr bool
		check   func(t *testing.T, s ModelSource)
	}{
		{
			name:  "known model",
			input: "llama3.2:3b",
			check: func(t *testing.T, s ModelSource) {
				assert.NotEmpty(t, s.Repo)
				assert.NotEmpty(t, s.File)
			},
		},
		{
			name:  "direct HF reference",
			input: "bartowski/some-model-GGUF",
			check: func(t *testing.T, s ModelSource) {
				assert.Equal(t, "bartowski/some-model-GGUF", s.Repo)
				assert.Equal(t, "Q4_K_M", s.File) // default quantization
			},
		},
		{
			name:  "direct HF reference with quant",
			input: "bartowski/some-model-GGUF:Q8_0",
			check: func(t *testing.T, s ModelSource) {
				assert.Equal(t, "bartowski/some-model-GGUF", s.Repo)
				assert.Equal(t, "Q8_0", s.File)
			},
		},
		{
			name:    "unknown model",
			input:   "nonexistent-model",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			source, err := r.resolveSource(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			if tt.check != nil {
				tt.check(t, source)
			}
		})
	}
}

func TestRegistryListEmpty(t *testing.T) {
	r := setupTestRegistry(t)

	models, err := r.List()
	require.NoError(t, err)
	assert.Empty(t, models)
}

func TestRegistryRemoveNotFound(t *testing.T) {
	r := setupTestRegistry(t)

	err := r.Remove("nonexistent:7b")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestRegistryResolveNotFound(t *testing.T) {
	r := setupTestRegistry(t)

	_, err := r.Resolve("nonexistent:7b")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestRegistryCustomMapping(t *testing.T) {
	r := setupTestRegistry(t)

	source := ModelSource{
		Repo: "custom/model-GGUF",
		File: "Q4_K_M",
	}

	err := r.AddCustomMapping("my-model:7b", source)
	require.NoError(t, err)

	// Should be resolvable now
	resolved, err := r.resolveSource("my-model:7b")
	require.NoError(t, err)
	assert.Equal(t, "custom/model-GGUF", resolved.Repo)

	// Should persist across registry reload
	r2, err := NewRegistry(filepath.Dir(r.modelsDir))
	require.NoError(t, err)
	resolved2, err := r2.resolveSource("my-model:7b")
	require.NoError(t, err)
	assert.Equal(t, "custom/model-GGUF", resolved2.Repo)
}

func TestRegistryPullAndResolve(t *testing.T) {
	// Create a test HTTP server serving a fake GGUF file
	fakeGGUF := []byte("GGUF-fake-model-data-for-testing-purposes-only")
	h := sha256.Sum256(fakeGGUF)
	expectedHash := fmt.Sprintf("%x", h[:])

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(fakeGGUF)))
		_, _ = w.Write(fakeGGUF)
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	r, err := NewRegistry(tmpDir)
	require.NoError(t, err)

	// Add a custom mapping pointing to our test server
	err = r.AddCustomMapping("test-model:tiny", ModelSource{
		Repo:  "test/model",
		File:  "Q4_K_M",
		R2URL: server.URL + "/test-model.gguf",
	})
	require.NoError(t, err)

	// Pull the model
	var events []DownloadProgress
	err = r.Pull(context.Background(), "test-model:tiny", func(p DownloadProgress) {
		events = append(events, p)
	})
	require.NoError(t, err)

	// Should have received progress events
	assert.NotEmpty(t, events)
	hasStart := false
	hasDone := false
	for _, e := range events {
		if e.Event == "start" {
			hasStart = true
		}
		if e.Event == "done" {
			hasDone = true
		}
	}
	assert.True(t, hasStart, "should have start event")
	assert.True(t, hasDone, "should have done event")

	// Should be listed
	models, err := r.List()
	require.NoError(t, err)
	require.Len(t, models, 1)
	assert.Equal(t, "test-model:tiny", models[0].Name)
	assert.Equal(t, int64(len(fakeGGUF)), models[0].Size)

	// Should be resolvable
	path, err := r.Resolve("test-model:tiny")
	require.NoError(t, err)
	assert.FileExists(t, path)

	// Verify file content
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, fakeGGUF, data)

	// Verify manifest has correct SHA256
	manifestData, err := os.ReadFile(filepath.Join(tmpDir, "models", "manifests", "test-model-tiny.json"))
	require.NoError(t, err)
	assert.Contains(t, string(manifestData), expectedHash)

	// Remove the model
	err = r.Remove("test-model:tiny")
	require.NoError(t, err)

	// Should no longer be listed
	models, err = r.List()
	require.NoError(t, err)
	assert.Empty(t, models)

	// Should no longer be resolvable
	_, err = r.Resolve("test-model:tiny")
	assert.Error(t, err)
}

func TestDownloadFromURL(t *testing.T) {
	fakeContent := []byte("test-gguf-content-for-download-verification")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(fakeContent)))
		_, _ = w.Write(fakeContent)
	}))
	defer server.Close()

	blobsDir := t.TempDir()
	result, err := DownloadFromURL(context.Background(), server.URL+"/model.gguf", blobsDir, nil)
	require.NoError(t, err)

	assert.Equal(t, "model.gguf", result.Filename)
	assert.Equal(t, int64(len(fakeContent)), result.Size)
	assert.NotEmpty(t, result.SHA256)
	assert.Contains(t, result.RelPath, "sha256-")

	// Verify the blob file exists
	blobPath := filepath.Join(blobsDir, filepath.Base(result.RelPath))
	assert.FileExists(t, blobPath)
}

func TestDownloadFromURLError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	blobsDir := t.TempDir()
	_, err := DownloadFromURL(context.Background(), server.URL+"/missing.gguf", blobsDir, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "404")
}

func TestDownloadFromURLCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "1000000")
		// Write a small amount then block — context cancellation should interrupt
		_, _ = w.Write([]byte("partial"))
		<-r.Context().Done()
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	blobsDir := t.TempDir()
	_, err := DownloadFromURL(ctx, server.URL+"/model.gguf", blobsDir, nil)
	assert.Error(t, err)
}
