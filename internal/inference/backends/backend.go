package backends

import "context"

// Backend is the interface all inference backends must implement.
type Backend interface {
	// Name returns the backend name (e.g., "llama.cpp", "mlx").
	Name() string

	// Available returns true if this backend can run on the current system.
	Available() bool

	// LoadModel loads a model into memory for inference.
	LoadModel(ctx context.Context, model *Model) error

	// UnloadModel unloads a model from memory.
	UnloadModel(ctx context.Context, model *Model) error

	// Complete performs a synchronous completion.
	Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)

	// CompleteStream performs a streaming completion.
	CompleteStream(ctx context.Context, req *CompletionRequest) (<-chan CompletionChunk, error)

	// Embeddings generates embeddings for input text.
	Embeddings(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error)
}

// Model represents a loaded model.
type Model struct {
	Name         string
	Path         string
	Size         int64
	Format       string
	Family       string
	Params       string
	Quantization string
}

// Message represents a chat message.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// CompletionRequest is the backend-agnostic completion request.
type CompletionRequest struct {
	Model       string
	Messages    []Message
	Prompt      string  // For text completions
	Temperature float64
	MaxTokens   int
	TopP        float64
	Stream      bool
}

// CompletionResponse is the backend-agnostic completion response.
type CompletionResponse struct {
	ID               string
	Content          string
	FinishReason     string
	Created          int64
	PromptTokens     int
	CompletionTokens int
}

// CompletionChunk is a single chunk in a streaming completion.
type CompletionChunk struct {
	ID           string
	Content      string
	FinishReason string
	Created      int64
}

// EmbeddingRequest is the backend-agnostic embedding request.
type EmbeddingRequest struct {
	Model string
	Input []string
}

// EmbeddingResponse is the backend-agnostic embedding response.
type EmbeddingResponse struct {
	Embeddings [][]float64
	Model      string
	TokenCount int
}
