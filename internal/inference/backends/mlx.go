package backends

import (
	"context"
	"fmt"
	"runtime"
)

// MLX implements the Backend interface using Apple's MLX framework.
// Only available on macOS with Apple Silicon (v0.2 feature).
type MLX struct{}

// NewMLX creates a new MLX backend.
func NewMLX() *MLX {
	return &MLX{}
}

func (m *MLX) Name() string {
	return "mlx"
}

func (m *MLX) Available() bool {
	// MLX is only available on macOS ARM64 (Apple Silicon)
	return runtime.GOOS == "darwin" && runtime.GOARCH == "arm64"
}

func (m *MLX) LoadModel(ctx context.Context, model *Model) error {
	// TODO: Implement for v0.2 — load model via MLX subprocess
	return fmt.Errorf("MLX backend not yet implemented (planned for v0.2)")
}

func (m *MLX) UnloadModel(ctx context.Context, model *Model) error {
	return fmt.Errorf("MLX backend not yet implemented (planned for v0.2)")
}

func (m *MLX) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	return nil, fmt.Errorf("MLX backend not yet implemented (planned for v0.2)")
}

func (m *MLX) CompleteStream(ctx context.Context, req *CompletionRequest) (<-chan CompletionChunk, error) {
	return nil, fmt.Errorf("MLX backend not yet implemented (planned for v0.2)")
}

func (m *MLX) Embeddings(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	return nil, fmt.Errorf("MLX backend not yet implemented (planned for v0.2)")
}
