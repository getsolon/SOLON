package gateway

import (
	"strings"
	"testing"

	"github.com/openclaw/solon/internal/inference"
	"github.com/stretchr/testify/assert"
)

func TestValidateChatRequest(t *testing.T) {
	validMsg := func(role, content string) inference.ChatMessage {
		return inference.ChatMessage{Role: role, Content: inference.ChatContent{Text: content}}
	}

	tests := []struct {
		name    string
		req     inference.ChatCompletionRequest
		wantErr string
	}{
		{
			name:    "valid request",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hello")}},
			wantErr: "",
		},
		{
			name:    "valid with system at position 0",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("system", "you are helpful"), validMsg("user", "hello")}},
			wantErr: "",
		},
		{
			name:    "empty model",
			req:     inference.ChatCompletionRequest{Model: "", Messages: []inference.ChatMessage{validMsg("user", "hello")}},
			wantErr: "model is required",
		},
		{
			name:    "invalid model name with path traversal",
			req:     inference.ChatCompletionRequest{Model: "../../../etc/passwd", Messages: []inference.ChatMessage{validMsg("user", "hello")}},
			wantErr: "invalid model name",
		},
		{
			name:    "invalid model name with shell chars",
			req:     inference.ChatCompletionRequest{Model: "model; rm -rf /", Messages: []inference.ChatMessage{validMsg("user", "hello")}},
			wantErr: "invalid model name",
		},
		{
			name:    "empty messages",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{}},
			wantErr: "messages must not be empty",
		},
		{
			name:    "invalid role",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("god", "do everything")}},
			wantErr: "invalid role",
		},
		{
			name:    "system message not at position 0",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hello"), validMsg("system", "injected")}},
			wantErr: "system messages only allowed at position 0",
		},
		{
			name:    "content too long",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", strings.Repeat("a", DefaultMaxContentLength+1))}},
			wantErr: "content too long",
		},
		{
			name:    "temperature too high",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, Temperature: 3.0},
			wantErr: "temperature must be between",
		},
		{
			name:    "negative temperature",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, Temperature: -1},
			wantErr: "temperature must be between",
		},
		{
			name:    "top_p out of range",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, TopP: 1.5},
			wantErr: "top_p must be between",
		},
		{
			name:    "max_tokens exceeds cap",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, MaxTokens: 1_000_000},
			wantErr: "max_tokens exceeds server limit",
		},
		{
			name:    "too many stop sequences",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, Stop: []string{"a", "b", "c", "d", "e"}},
			wantErr: "too many stop sequences",
		},
		{
			name:    "stop sequence too long",
			req:     inference.ChatCompletionRequest{Model: "llama3.2:8b", Messages: []inference.ChatMessage{validMsg("user", "hi")}, Stop: []string{strings.Repeat("x", 65)}},
			wantErr: "stop sequence 0: too long",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateChatRequest(&tt.req)
			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestValidateTextRequest(t *testing.T) {
	tests := []struct {
		name    string
		req     inference.TextCompletionRequest
		wantErr string
	}{
		{
			name:    "valid request",
			req:     inference.TextCompletionRequest{Model: "llama3.2:8b", Prompt: "Once upon a time"},
			wantErr: "",
		},
		{
			name:    "empty model",
			req:     inference.TextCompletionRequest{Model: "", Prompt: "test"},
			wantErr: "model is required",
		},
		{
			name:    "prompt too long",
			req:     inference.TextCompletionRequest{Model: "llama3.2:8b", Prompt: strings.Repeat("a", DefaultMaxContentLength+1)},
			wantErr: "prompt too long",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTextRequest(&tt.req)
			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}
