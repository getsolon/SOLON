package backends

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseProviderModel(t *testing.T) {
	tests := []struct {
		input    string
		provider string
		model    string
	}{
		{"anthropic/claude-sonnet-4-20250514", "anthropic", "claude-sonnet-4-20250514"},
		{"openai/gpt-4o", "openai", "gpt-4o"},
		{"llama3.2:3b", "", "llama3.2:3b"},
		{"custom/my-model/v2", "custom", "my-model/v2"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			prov, model := ParseProviderModel(tt.input)
			assert.Equal(t, tt.provider, prov)
			assert.Equal(t, tt.model, model)
		})
	}
}

func TestProxyBackend_HasProvider(t *testing.T) {
	pb := NewProxyBackend()
	assert.False(t, pb.HasProvider("anthropic"))
	assert.False(t, pb.Available())

	pb.AddProvider(Provider{Name: "anthropic", BaseURL: "https://api.anthropic.com", APIKey: "test"})
	assert.True(t, pb.HasProvider("anthropic"))
	assert.True(t, pb.Available())

	pb.RemoveProvider("anthropic")
	assert.False(t, pb.HasProvider("anthropic"))
}

func TestProxyBackend_CompleteOpenAI(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/chat/completions", r.URL.Path)
		assert.Equal(t, "Bearer test-key", r.Header.Get("Authorization"))

		var req map[string]any
		_ = json.NewDecoder(r.Body).Decode(&req)
		assert.Equal(t, "gpt-4o", req["model"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":      "chatcmpl-123",
			"created": 1234567890,
			"choices": []map[string]any{
				{
					"message":       map[string]string{"content": "Hello from OpenAI!"},
					"finish_reason": "stop",
				},
			},
			"usage": map[string]int{"prompt_tokens": 10, "completion_tokens": 5},
		})
	}))
	defer server.Close()

	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "openai", BaseURL: server.URL, APIKey: "test-key"})

	resp, err := pb.Complete(context.Background(), &CompletionRequest{
		Model:    "openai/gpt-4o",
		Messages: []Message{{Role: "user", Content: "hello"}},
	})
	require.NoError(t, err)
	assert.Equal(t, "Hello from OpenAI!", resp.Content)
	assert.Equal(t, 10, resp.PromptTokens)
	assert.Equal(t, 5, resp.CompletionTokens)
}

func TestProxyBackend_CompleteAnthropic(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/messages", r.URL.Path)
		assert.Equal(t, "test-key", r.Header.Get("x-api-key"))
		assert.Equal(t, "2023-06-01", r.Header.Get("anthropic-version"))

		var req map[string]any
		_ = json.NewDecoder(r.Body).Decode(&req)
		assert.Equal(t, "claude-sonnet-4-20250514", req["model"])
		assert.Equal(t, "You are helpful.", req["system"])

		// Verify system message was extracted from messages
		messages := req["messages"].([]any)
		assert.Len(t, messages, 1)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":   "msg_123",
			"type": "message",
			"content": []map[string]string{
				{"type": "text", "text": "Hello from Anthropic!"},
			},
			"stop_reason": "end_turn",
			"usage":       map[string]int{"input_tokens": 12, "output_tokens": 8},
		})
	}))
	defer server.Close()

	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "anthropic", BaseURL: server.URL, APIKey: "test-key"})

	resp, err := pb.Complete(context.Background(), &CompletionRequest{
		Model: "anthropic/claude-sonnet-4-20250514",
		Messages: []Message{
			{Role: "system", Content: "You are helpful."},
			{Role: "user", Content: "hello"},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, "Hello from Anthropic!", resp.Content)
	assert.Equal(t, 12, resp.PromptTokens)
	assert.Equal(t, 8, resp.CompletionTokens)
}

func TestProxyBackend_StreamOpenAI(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		flusher := w.(http.Flusher)

		chunks := []string{"Hello", " world", "!"}
		for _, c := range chunks {
			data, _ := json.Marshal(map[string]any{
				"id":      "chatcmpl-123",
				"created": 1234567890,
				"choices": []map[string]any{
					{"delta": map[string]string{"content": c}},
				},
			})
			_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}

		// Final chunk with finish_reason
		data, _ := json.Marshal(map[string]any{
			"id":      "chatcmpl-123",
			"created": 1234567890,
			"choices": []map[string]any{
				{"delta": map[string]string{}, "finish_reason": "stop"},
			},
		})
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
		flusher.Flush()
	}))
	defer server.Close()

	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "openai", BaseURL: server.URL, APIKey: "test-key"})

	ch, err := pb.CompleteStream(context.Background(), &CompletionRequest{
		Model:    "openai/gpt-4o",
		Messages: []Message{{Role: "user", Content: "hello"}},
		Stream:   true,
	})
	require.NoError(t, err)

	var content string
	var lastFinish string
	for chunk := range ch {
		content += chunk.Content
		if chunk.FinishReason != "" {
			lastFinish = chunk.FinishReason
		}
	}
	assert.Equal(t, "Hello world!", content)
	assert.Equal(t, "stop", lastFinish)
}

func TestProxyBackend_StreamAnthropic(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		flusher := w.(http.Flusher)

		events := []map[string]any{
			{"type": "content_block_delta", "delta": map[string]string{"type": "text_delta", "text": "Hello"}},
			{"type": "content_block_delta", "delta": map[string]string{"type": "text_delta", "text": " world!"}},
			{"type": "message_delta", "delta": map[string]string{"stop_reason": "end_turn"}},
		}

		for _, e := range events {
			data, _ := json.Marshal(e)
			_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}))
	defer server.Close()

	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "anthropic", BaseURL: server.URL, APIKey: "test-key"})

	ch, err := pb.CompleteStream(context.Background(), &CompletionRequest{
		Model:    "anthropic/claude-sonnet-4-20250514",
		Messages: []Message{{Role: "user", Content: "hello"}},
		Stream:   true,
	})
	require.NoError(t, err)

	var content string
	var lastFinish string
	for chunk := range ch {
		content += chunk.Content
		if chunk.FinishReason != "" {
			lastFinish = chunk.FinishReason
		}
	}
	assert.Equal(t, "Hello world!", content)
	assert.Equal(t, "stop", lastFinish)
}

func TestProxyBackend_EmbeddingsAnthropicUnsupported(t *testing.T) {
	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "anthropic", BaseURL: "https://api.anthropic.com", APIKey: "test"})

	_, err := pb.Embeddings(context.Background(), &EmbeddingRequest{
		Model: "anthropic/claude-sonnet-4-20250514",
		Input: []string{"hello"},
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not supported")
}

func TestProxyBackend_ListAvailableModels(t *testing.T) {
	pb := NewProxyBackend()
	pb.AddProvider(Provider{Name: "anthropic", BaseURL: "https://api.anthropic.com", APIKey: "test"})

	models := pb.ListAvailableModels()
	assert.True(t, len(models) > 0)

	found := false
	for _, m := range models {
		if m.Name == "anthropic/claude-sonnet-4-20250514" {
			found = true
			break
		}
	}
	assert.True(t, found, "should include anthropic/claude-sonnet-4-20250514")
}

func TestProxyBackend_LoadUnloadNoOp(t *testing.T) {
	pb := NewProxyBackend()
	assert.NoError(t, pb.LoadModel(context.Background(), &Model{Name: "test"}))
	assert.NoError(t, pb.UnloadModel(context.Background(), &Model{Name: "test"}))
}
