package inference

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChatContentUnmarshalString(t *testing.T) {
	var c ChatContent
	err := json.Unmarshal([]byte(`"Hello, world!"`), &c)
	require.NoError(t, err)
	assert.Equal(t, "Hello, world!", c.Text)
}

func TestChatContentUnmarshalArray(t *testing.T) {
	var c ChatContent
	input := `[{"type":"text","text":"Hello"},{"type":"text","text":" world"}]`
	err := json.Unmarshal([]byte(input), &c)
	require.NoError(t, err)
	assert.Equal(t, "Hello world", c.Text)
}

func TestChatContentUnmarshalArraySkipsNonText(t *testing.T) {
	var c ChatContent
	input := `[{"type":"image_url","image_url":"data:..."},{"type":"text","text":"describe this"}]`
	err := json.Unmarshal([]byte(input), &c)
	require.NoError(t, err)
	assert.Equal(t, "describe this", c.Text)
}

func TestChatContentUnmarshalEmpty(t *testing.T) {
	var c ChatContent
	err := json.Unmarshal([]byte(`""`), &c)
	require.NoError(t, err)
	assert.Equal(t, "", c.Text)
}

func TestChatContentUnmarshalInvalid(t *testing.T) {
	var c ChatContent
	err := json.Unmarshal([]byte(`123`), &c)
	assert.Error(t, err)
}

func TestChatContentMarshal(t *testing.T) {
	c := ChatContent{Text: "Hello"}
	data, err := json.Marshal(c)
	require.NoError(t, err)
	assert.Equal(t, `"Hello"`, string(data))
}

func TestChatContentRoundTrip(t *testing.T) {
	original := ChatContent{Text: "round trip test"}
	data, err := json.Marshal(original)
	require.NoError(t, err)

	var decoded ChatContent
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, original.Text, decoded.Text)
}

func TestChatMessageJSON(t *testing.T) {
	// String content format
	input := `{"role":"user","content":"Hello"}`
	var msg ChatMessage
	err := json.Unmarshal([]byte(input), &msg)
	require.NoError(t, err)
	assert.Equal(t, "user", msg.Role)
	assert.Equal(t, "Hello", msg.Content.Text)

	// Array content format (multi-modal)
	var msg2 ChatMessage
	input = `{"role":"user","content":[{"type":"text","text":"What is this?"}]}`
	err = json.Unmarshal([]byte(input), &msg2)
	require.NoError(t, err)
	assert.Equal(t, "user", msg2.Role)
	assert.Equal(t, "What is this?", msg2.Content.Text)
}

func TestSizeHuman(t *testing.T) {
	tests := []struct {
		size     int64
		expected string
	}{
		{0, "0 B"},
		{500, "500 B"},
		{1024 * 1024, "1.0 MB"},
		{5 * 1024 * 1024, "5.0 MB"},
		{1024 * 1024 * 1024, "1.0 GB"},
		{5046586573, "4.7 GB"},   // ~4.7 GB
		{45634560819, "42.5 GB"}, // ~42.5 GB
	}

	for _, tt := range tests {
		m := ModelInfo{Size: tt.size}
		assert.Equal(t, tt.expected, m.SizeHuman(), "size=%d", tt.size)
	}
}

func TestChatCompletionRequestJSON(t *testing.T) {
	input := `{
		"model": "llama3.2:3b",
		"messages": [
			{"role": "system", "content": "You are helpful."},
			{"role": "user", "content": "Hello"}
		],
		"temperature": 0.7,
		"max_tokens": 100,
		"stream": false
	}`

	var req ChatCompletionRequest
	err := json.Unmarshal([]byte(input), &req)
	require.NoError(t, err)
	assert.Equal(t, "llama3.2:3b", req.Model)
	assert.Len(t, req.Messages, 2)
	assert.Equal(t, "system", req.Messages[0].Role)
	assert.Equal(t, "You are helpful.", req.Messages[0].Content.Text)
	assert.Equal(t, "user", req.Messages[1].Role)
	assert.Equal(t, "Hello", req.Messages[1].Content.Text)
	assert.InDelta(t, 0.7, req.Temperature, 0.001)
	assert.Equal(t, 100, req.MaxTokens)
	assert.False(t, req.Stream)
}

func TestChatCompletionResponseJSON(t *testing.T) {
	resp := ChatCompletionResponse{
		ID:      "chatcmpl-123",
		Object:  "chat.completion",
		Created: 1700000000,
		Model:   "llama3.2:3b",
		Choices: []ChatCompletionChoice{
			{
				Index: 0,
				Message: ChatMessage{
					Role:    "assistant",
					Content: ChatContent{Text: "Hello!"},
				},
				FinishReason: "stop",
			},
		},
		Usage: Usage{
			PromptTokens:     10,
			CompletionTokens: 5,
			TotalTokens:      15,
		},
	}

	data, err := json.Marshal(resp)
	require.NoError(t, err)

	var decoded ChatCompletionResponse
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, resp.ID, decoded.ID)
	assert.Equal(t, resp.Object, decoded.Object)
	assert.Equal(t, "Hello!", decoded.Choices[0].Message.Content.Text)
	assert.Equal(t, 15, decoded.Usage.TotalTokens)
}

func TestEmbeddingRequestJSON(t *testing.T) {
	input := `{"model":"mxbai-embed-large","input":["hello","world"]}`
	var req EmbeddingRequest
	err := json.Unmarshal([]byte(input), &req)
	require.NoError(t, err)
	assert.Equal(t, "mxbai-embed-large", req.Model)
	assert.Equal(t, []string{"hello", "world"}, req.Input)
}

func TestTextCompletionRequestJSON(t *testing.T) {
	input := `{"model":"codellama:7b","prompt":"def fibonacci(n):","max_tokens":200,"temperature":0.3}`
	var req TextCompletionRequest
	err := json.Unmarshal([]byte(input), &req)
	require.NoError(t, err)
	assert.Equal(t, "codellama:7b", req.Model)
	assert.Equal(t, "def fibonacci(n):", req.Prompt)
	assert.Equal(t, 200, req.MaxTokens)
	assert.InDelta(t, 0.3, req.Temperature, 0.001)
}

func TestToBackendMessages(t *testing.T) {
	messages := []ChatMessage{
		{Role: "system", Content: ChatContent{Text: "You are helpful."}},
		{Role: "user", Content: ChatContent{Text: "Hello"}},
		{Role: "assistant", Content: ChatContent{Text: "Hi there!"}},
	}

	result := toBackendMessages(messages)
	assert.Len(t, result, 3)
	assert.Equal(t, "system", result[0].Role)
	assert.Equal(t, "You are helpful.", result[0].Content)
	assert.Equal(t, "user", result[1].Role)
	assert.Equal(t, "Hello", result[1].Content)
	assert.Equal(t, "assistant", result[2].Role)
	assert.Equal(t, "Hi there!", result[2].Content)
}
