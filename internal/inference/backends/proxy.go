package backends

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Provider represents an external API provider (e.g., Anthropic, OpenAI).
type Provider struct {
	Name    string
	BaseURL string
	APIKey  string
}

// ProxyBackend proxies inference requests to external API providers.
type ProxyBackend struct {
	providers  map[string]*Provider
	httpClient *http.Client
	mu         sync.RWMutex
}

// NewProxyBackend creates a new proxy backend.
func NewProxyBackend() *ProxyBackend {
	return &ProxyBackend{
		providers: make(map[string]*Provider),
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (p *ProxyBackend) Name() string { return "proxy" }

func (p *ProxyBackend) Available() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.providers) > 0
}

func (p *ProxyBackend) LoadModel(_ context.Context, _ *Model) error   { return nil }
func (p *ProxyBackend) UnloadModel(_ context.Context, _ *Model) error { return nil }

// AddProvider registers a provider for proxying.
func (p *ProxyBackend) AddProvider(prov Provider) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.providers[prov.Name] = &prov
}

// RemoveProvider unregisters a provider.
func (p *ProxyBackend) RemoveProvider(name string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.providers, name)
}

// HasProvider returns true if the named provider is registered.
func (p *ProxyBackend) HasProvider(name string) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	_, ok := p.providers[name]
	return ok
}

// ParseProviderModel splits "provider/model" into provider name and model ID.
// Returns empty provider if no slash is present.
func ParseProviderModel(model string) (provider, modelID string) {
	parts := strings.SplitN(model, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", model
}

func (p *ProxyBackend) getProvider(name string) (*Provider, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	prov, ok := p.providers[name]
	if !ok {
		return nil, fmt.Errorf("provider %q not configured", name)
	}
	return prov, nil
}

// Complete performs a synchronous completion via the external provider.
func (p *ProxyBackend) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	provName, modelID := ParseProviderModel(req.Model)
	prov, err := p.getProvider(provName)
	if err != nil {
		return nil, err
	}

	if provName == "anthropic" {
		return p.completeAnthropic(ctx, prov, modelID, req)
	}
	return p.completeOpenAI(ctx, prov, modelID, req)
}

// CompleteStream performs a streaming completion via the external provider.
func (p *ProxyBackend) CompleteStream(ctx context.Context, req *CompletionRequest) (<-chan CompletionChunk, error) {
	provName, modelID := ParseProviderModel(req.Model)
	prov, err := p.getProvider(provName)
	if err != nil {
		return nil, err
	}

	if provName == "anthropic" {
		return p.streamAnthropic(ctx, prov, modelID, req)
	}
	return p.streamOpenAI(ctx, prov, modelID, req)
}

// Embeddings generates embeddings — only supported for OpenAI-compatible providers.
func (p *ProxyBackend) Embeddings(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	provName, modelID := ParseProviderModel(req.Model)
	prov, err := p.getProvider(provName)
	if err != nil {
		return nil, err
	}

	if provName == "anthropic" {
		return nil, fmt.Errorf("embeddings not supported for Anthropic")
	}

	return p.embeddingsOpenAI(ctx, prov, modelID, req)
}

// ListAvailableModels returns well-known models for each configured provider.
func (p *ProxyBackend) ListAvailableModels() []Model {
	p.mu.RLock()
	defer p.mu.RUnlock()

	var models []Model
	for name := range p.providers {
		for _, m := range wellKnownModels[name] {
			models = append(models, Model{
				Name: name + "/" + m,
			})
		}
	}
	return models
}

// --- Anthropic implementation ---

func (p *ProxyBackend) completeAnthropic(ctx context.Context, prov *Provider, model string, req *CompletionRequest) (*CompletionResponse, error) {
	anthropicReq := buildAnthropicRequest(model, req, false)

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", prov.BaseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	setAnthropicHeaders(httpReq, prov.APIKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Anthropic: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("anthropic returned %d: %s", resp.StatusCode, string(respBody))
	}

	var anthropicResp anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	content := ""
	for _, block := range anthropicResp.Content {
		if block.Type == "text" {
			content += block.Text
		}
	}

	finishReason := "stop"
	if anthropicResp.StopReason == "max_tokens" {
		finishReason = "length"
	}

	return &CompletionResponse{
		ID:               anthropicResp.ID,
		Content:          content,
		FinishReason:     finishReason,
		Created:          time.Now().Unix(),
		PromptTokens:     anthropicResp.Usage.InputTokens,
		CompletionTokens: anthropicResp.Usage.OutputTokens,
	}, nil
}

func (p *ProxyBackend) streamAnthropic(ctx context.Context, prov *Provider, model string, req *CompletionRequest) (<-chan CompletionChunk, error) {
	anthropicReq := buildAnthropicRequest(model, req, true)

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", prov.BaseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	setAnthropicHeaders(httpReq, prov.APIKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Anthropic: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return nil, fmt.Errorf("anthropic returned %d: %s", resp.StatusCode, string(respBody))
	}

	ch := make(chan CompletionChunk, 16)
	id := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())

	go func() {
		defer close(ch)
		defer func() { _ = resp.Body.Close() }()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				break
			}

			var event anthropicStreamEvent
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				continue
			}

			switch event.Type {
			case "content_block_delta":
				if event.Delta.Type == "text_delta" {
					ch <- CompletionChunk{
						ID:      id,
						Content: event.Delta.Text,
						Created: time.Now().Unix(),
					}
				}
			case "message_delta":
				finishReason := "stop"
				if event.Delta.StopReason == "max_tokens" {
					finishReason = "length"
				}
				ch <- CompletionChunk{
					ID:           id,
					FinishReason: finishReason,
					Created:      time.Now().Unix(),
				}
			}
		}
	}()

	return ch, nil
}

func buildAnthropicRequest(model string, req *CompletionRequest, stream bool) map[string]any {
	result := map[string]any{
		"model":  model,
		"stream": stream,
	}

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 4096
	}
	result["max_tokens"] = maxTokens

	if req.Temperature > 0 {
		result["temperature"] = req.Temperature
	}

	// Extract system messages to top-level field
	var system string
	var messages []map[string]string
	for _, m := range req.Messages {
		if m.Role == "system" {
			if system != "" {
				system += "\n"
			}
			system += m.Content
		} else {
			messages = append(messages, map[string]string{
				"role":    m.Role,
				"content": m.Content,
			})
		}
	}

	if system != "" {
		result["system"] = system
	}
	result["messages"] = messages

	return result
}

func setAnthropicHeaders(req *http.Request, apiKey string) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
}

// --- OpenAI implementation ---

func (p *ProxyBackend) completeOpenAI(ctx context.Context, prov *Provider, model string, req *CompletionRequest) (*CompletionResponse, error) {
	openaiReq := buildOpenAIRequest(model, req, false)

	body, err := json.Marshal(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", prov.BaseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	setOpenAIHeaders(httpReq, prov.APIKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling OpenAI: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI returned %d: %s", resp.StatusCode, string(respBody))
	}

	var openaiResp openaiChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	content := ""
	finishReason := "stop"
	if len(openaiResp.Choices) > 0 {
		content = openaiResp.Choices[0].Message.Content
		if openaiResp.Choices[0].FinishReason != "" {
			finishReason = openaiResp.Choices[0].FinishReason
		}
	}

	return &CompletionResponse{
		ID:               openaiResp.ID,
		Content:          content,
		FinishReason:     finishReason,
		Created:          openaiResp.Created,
		PromptTokens:     openaiResp.Usage.PromptTokens,
		CompletionTokens: openaiResp.Usage.CompletionTokens,
	}, nil
}

func (p *ProxyBackend) streamOpenAI(ctx context.Context, prov *Provider, model string, req *CompletionRequest) (<-chan CompletionChunk, error) {
	openaiReq := buildOpenAIRequest(model, req, true)

	body, err := json.Marshal(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", prov.BaseURL+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	setOpenAIHeaders(httpReq, prov.APIKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling OpenAI: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		return nil, fmt.Errorf("OpenAI returned %d: %s", resp.StatusCode, string(respBody))
	}

	ch := make(chan CompletionChunk, 16)

	go func() {
		defer close(ch)
		defer func() { _ = resp.Body.Close() }()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				break
			}

			var chunk openaiStreamChunk
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}

			if len(chunk.Choices) > 0 {
				ch <- CompletionChunk{
					ID:           chunk.ID,
					Content:      chunk.Choices[0].Delta.Content,
					FinishReason: chunk.Choices[0].FinishReason,
					Created:      chunk.Created,
				}
			}
		}
	}()

	return ch, nil
}

func (p *ProxyBackend) embeddingsOpenAI(ctx context.Context, prov *Provider, model string, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	openaiReq := map[string]any{
		"model": model,
		"input": req.Input,
	}

	body, err := json.Marshal(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", prov.BaseURL+"/v1/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	setOpenAIHeaders(httpReq, prov.APIKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling OpenAI: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI returned %d: %s", resp.StatusCode, string(respBody))
	}

	var openaiResp struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
		Model string `json:"model"`
		Usage struct {
			PromptTokens int `json:"prompt_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	embeddings := make([][]float64, len(openaiResp.Data))
	for i, d := range openaiResp.Data {
		embeddings[i] = d.Embedding
	}

	return &EmbeddingResponse{
		Embeddings: embeddings,
		Model:      openaiResp.Model,
		TokenCount: openaiResp.Usage.PromptTokens,
	}, nil
}

func buildOpenAIRequest(model string, req *CompletionRequest, stream bool) map[string]any {
	result := map[string]any{
		"model":  model,
		"stream": stream,
	}

	if req.MaxTokens > 0 {
		result["max_tokens"] = req.MaxTokens
	}
	if req.Temperature > 0 {
		result["temperature"] = req.Temperature
	}

	var messages []map[string]string
	for _, m := range req.Messages {
		messages = append(messages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}
	result["messages"] = messages

	return result
}

func setOpenAIHeaders(req *http.Request, apiKey string) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
}

// --- Anthropic API types ---

type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

type anthropicStreamEvent struct {
	Type  string `json:"type"`
	Delta struct {
		Type       string `json:"type"`
		Text       string `json:"text"`
		StopReason string `json:"stop_reason"`
	} `json:"delta"`
}

// --- OpenAI API types ---

type openaiChatResponse struct {
	ID      string `json:"id"`
	Created int64  `json:"created"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
	} `json:"usage"`
}

type openaiStreamChunk struct {
	ID      string `json:"id"`
	Created int64  `json:"created"`
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

// --- Well-known models per provider ---

var wellKnownModels = map[string][]string{
	"anthropic": {
		"claude-sonnet-4-20250514",
		"claude-haiku-4-5-20251001",
		"claude-opus-4-20250514",
	},
	"openai": {
		"gpt-4o",
		"gpt-4o-mini",
		"gpt-4-turbo",
		"gpt-3.5-turbo",
	},
}
