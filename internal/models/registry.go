package models

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ModelSource maps a friendly name to a HuggingFace repo and file filter.
type ModelSource struct {
	Repo string `json:"repo"` // "bartowski/Llama-3.2-3B-Instruct-GGUF"
	File string `json:"file"` // "Q4_K_M" (substring filter for GGUF filename)
}

// DefaultModels contains built-in model name mappings.
var DefaultModels = map[string]ModelSource{
	"llama3.2:8b":      {Repo: "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF", File: "Q4_K_M"},
	"llama3.2:3b":      {Repo: "bartowski/Llama-3.2-3B-Instruct-GGUF", File: "Q4_K_M"},
	"mistral:7b":       {Repo: "mistralai/Mistral-7B-Instruct-v0.3-GGUF", File: "Q4_K_M"},
	"phi4:14b":         {Repo: "bartowski/phi-4-GGUF", File: "Q4_K_M"},
	"gemma3:9b":        {Repo: "bartowski/gemma-2-9b-it-GGUF", File: "Q4_K_M"},
	"qwen2.5:7b":       {Repo: "Qwen/Qwen2.5-7B-Instruct-GGUF", File: "Q4_K_M"},
	"nomic-embed-text": {Repo: "nomic-ai/nomic-embed-text-v1.5-GGUF", File: "Q8_0"},
}

// Manifest represents a downloaded model's metadata.
type Manifest struct {
	Name     string    `json:"name"`
	Repo     string    `json:"repo"`
	File     string    `json:"file"`
	Size     int64     `json:"size"`
	SHA256   string    `json:"sha256"`
	Path     string    `json:"path"` // relative path under modelsDir, e.g. "blobs/sha256-abc.gguf"
	PulledAt time.Time `json:"pulled_at"`
}

// ModelInfo holds information about a locally available model.
type ModelInfo struct {
	Name     string    `json:"name"`
	Size     int64     `json:"size"`
	Path     string    `json:"path"`
	PulledAt time.Time `json:"pulled_at"`
	Backend  string    `json:"backend"` // "native" or "ollama"
}

// Registry manages model name mapping, downloads, and local model storage.
type Registry struct {
	modelsDir    string                  // ~/.solon/models/
	mapping      map[string]ModelSource  // merged: defaults + custom
	customFile   string                  // path to custom_registry.json
}

// NewRegistry creates a new model registry.
func NewRegistry(dataDir string) (*Registry, error) {
	modelsDir := filepath.Join(dataDir, "models")
	if err := os.MkdirAll(filepath.Join(modelsDir, "manifests"), 0755); err != nil {
		return nil, fmt.Errorf("creating manifests dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(modelsDir, "blobs"), 0755); err != nil {
		return nil, fmt.Errorf("creating blobs dir: %w", err)
	}

	r := &Registry{
		modelsDir:  modelsDir,
		mapping:    make(map[string]ModelSource),
		customFile: filepath.Join(modelsDir, "custom_registry.json"),
	}

	// Load defaults
	for k, v := range DefaultModels {
		r.mapping[k] = v
	}

	// Load custom mappings
	r.loadCustomMappings()

	return r, nil
}

// Pull downloads a model by name or direct HF repo reference.
func (r *Registry) Pull(ctx context.Context, name string, progressFn func(event DownloadProgress)) error {
	source, err := r.resolveSource(name)
	if err != nil {
		return err
	}

	result, err := DownloadModel(ctx, source.Repo, source.File, filepath.Join(r.modelsDir, "blobs"), progressFn)
	if err != nil {
		return fmt.Errorf("downloading model %s: %w", name, err)
	}

	// Normalize model name for manifest filename
	safeName := strings.ReplaceAll(name, "/", "--")
	safeName = strings.ReplaceAll(safeName, ":", "-")

	manifest := Manifest{
		Name:     name,
		Repo:     source.Repo,
		File:     result.Filename,
		Size:     result.Size,
		SHA256:   result.SHA256,
		Path:     result.RelPath,
		PulledAt: time.Now(),
	}

	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling manifest: %w", err)
	}

	manifestPath := filepath.Join(r.modelsDir, "manifests", safeName+".json")
	if err := os.WriteFile(manifestPath, data, 0644); err != nil {
		return fmt.Errorf("writing manifest: %w", err)
	}

	return nil
}

// List returns all locally available models.
func (r *Registry) List() ([]ModelInfo, error) {
	entries, err := os.ReadDir(filepath.Join(r.modelsDir, "manifests"))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading manifests: %w", err)
	}

	var models []ModelInfo
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(r.modelsDir, "manifests", entry.Name()))
		if err != nil {
			continue
		}

		var m Manifest
		if err := json.Unmarshal(data, &m); err != nil {
			continue
		}

		models = append(models, ModelInfo{
			Name:     m.Name,
			Size:     m.Size,
			Path:     filepath.Join(r.modelsDir, m.Path),
			PulledAt: m.PulledAt,
			Backend:  "native",
		})
	}

	return models, nil
}

// Remove deletes a model's manifest and blob.
func (r *Registry) Remove(name string) error {
	safeName := strings.ReplaceAll(name, "/", "--")
	safeName = strings.ReplaceAll(safeName, ":", "-")
	manifestPath := filepath.Join(r.modelsDir, "manifests", safeName+".json")

	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("model %q not found: %w", name, err)
	}

	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return fmt.Errorf("reading manifest: %w", err)
	}

	// Remove blob
	blobPath := filepath.Join(r.modelsDir, m.Path)
	_ = os.Remove(blobPath)

	// Remove manifest
	_ = os.Remove(manifestPath)

	return nil
}

// Resolve returns the absolute path to the GGUF file for a model name.
func (r *Registry) Resolve(name string) (string, error) {
	safeName := strings.ReplaceAll(name, "/", "--")
	safeName = strings.ReplaceAll(safeName, ":", "-")
	manifestPath := filepath.Join(r.modelsDir, "manifests", safeName+".json")

	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return "", fmt.Errorf("model %q not found locally", name)
	}

	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return "", fmt.Errorf("reading manifest for %q: %w", name, err)
	}

	absPath := filepath.Join(r.modelsDir, m.Path)
	if _, err := os.Stat(absPath); err != nil {
		return "", fmt.Errorf("model file missing for %q: %w", name, err)
	}

	return absPath, nil
}

// AddCustomMapping adds a user-defined model name mapping.
func (r *Registry) AddCustomMapping(name string, source ModelSource) error {
	r.mapping[name] = source

	// Load existing custom mappings
	custom := make(map[string]ModelSource)
	if data, err := os.ReadFile(r.customFile); err == nil {
		_ = json.Unmarshal(data, &custom)
	}

	custom[name] = source

	data, err := json.MarshalIndent(custom, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling custom registry: %w", err)
	}

	return os.WriteFile(r.customFile, data, 0644)
}

// KnownModels returns the full mapping of model names to sources.
func (r *Registry) KnownModels() map[string]ModelSource {
	return r.mapping
}

// resolveSource resolves a model name to a HuggingFace source.
// Supports: known names ("llama3.2:3b"), direct HF refs ("org/repo"), direct refs with quant ("org/repo:Q4_K_M").
func (r *Registry) resolveSource(name string) (ModelSource, error) {
	// Check known mappings first
	if source, ok := r.mapping[name]; ok {
		return source, nil
	}

	// Try as direct HF reference: "org/repo" or "org/repo:quantization"
	if strings.Contains(name, "/") {
		parts := strings.SplitN(name, ":", 2)
		repo := parts[0]
		file := "Q4_K_M" // default quantization
		if len(parts) == 2 {
			file = parts[1]
		}
		return ModelSource{Repo: repo, File: file}, nil
	}

	return ModelSource{}, fmt.Errorf("unknown model %q — use 'solon models pull <hf-org>/<repo>' for direct HuggingFace reference", name)
}

func (r *Registry) loadCustomMappings() {
	data, err := os.ReadFile(r.customFile)
	if err != nil {
		return
	}

	var custom map[string]ModelSource
	if err := json.Unmarshal(data, &custom); err != nil {
		return
	}

	for k, v := range custom {
		r.mapping[k] = v
	}
}

// DataDir returns the default Solon data directory (~/.solon).
func DataDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("getting home directory: %w", err)
	}
	return filepath.Join(home, ".solon"), nil
}
