//go:build !llamacpp

package backends

import "context"

// LlamaCpp is a stub when CGO is disabled.
type LlamaCpp struct{}

func NewLlamaCpp(_ string) *LlamaCpp { return &LlamaCpp{} }

func (l *LlamaCpp) Name() string      { return "llama.cpp" }
func (l *LlamaCpp) Available() bool    { return false }

func (l *LlamaCpp) LoadModel(_ context.Context, _ *Model) error   { return nil }
func (l *LlamaCpp) UnloadModel(_ context.Context, _ *Model) error { return nil }

func (l *LlamaCpp) Complete(_ context.Context, _ *CompletionRequest) (*CompletionResponse, error) {
	return nil, ErrBackendUnavailable
}

func (l *LlamaCpp) CompleteStream(_ context.Context, _ *CompletionRequest) (<-chan CompletionChunk, error) {
	return nil, ErrBackendUnavailable
}

func (l *LlamaCpp) Embeddings(_ context.Context, _ *EmbeddingRequest) (*EmbeddingResponse, error) {
	return nil, ErrBackendUnavailable
}
