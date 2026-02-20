package openclaw

import (
	"context"

	"github.com/openclaw/solon/internal/inference"
)

// Provider implements the OpenClaw provider plugin interface.
// This allows OpenClaw to use Solon as an inference backend.
type Provider struct {
	engine   *inference.Engine
	endpoint string
}

// NewProvider creates a new OpenClaw provider.
func NewProvider(engine *inference.Engine, endpoint string) *Provider {
	return &Provider{
		engine:   engine,
		endpoint: endpoint,
	}
}

// ModelInfo describes a model available through the provider.
type ModelInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Provider string `json:"provider"`
	Size     int64  `json:"size"`
}

// ListModels returns all models available through the Solon provider.
func (p *Provider) ListModels(ctx context.Context) ([]ModelInfo, error) {
	models, err := p.engine.ListModels(ctx)
	if err != nil {
		return nil, err
	}

	var result []ModelInfo
	for _, m := range models {
		result = append(result, ModelInfo{
			ID:       "solon/" + m.Name,
			Name:     m.Name,
			Provider: "solon",
			Size:     m.Size,
		})
	}
	return result, nil
}

// Complete performs a chat completion through the Solon inference engine.
func (p *Provider) Complete(ctx context.Context, req *inference.ChatCompletionRequest) (*inference.ChatCompletionResponse, error) {
	return p.engine.ChatCompletion(ctx, req)
}

// Endpoint returns the Solon API endpoint URL.
func (p *Provider) Endpoint() string {
	return p.endpoint
}
