package backends

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Ollama implements the Backend interface by proxying to a running Ollama instance.
// This is the pragmatic approach for MVP: Ollama handles model management and inference,
// Solon adds auth, rate limiting, and the secure gateway layer.
type Ollama struct {
	baseURL    string
	httpClient *http.Client
}

// NewOllama creates a new Ollama backend that proxies to the given Ollama API endpoint.
func NewOllama(baseURL string) *Ollama {
	return &Ollama{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute, // Long timeout for inference
		},
	}
}

func (o *Ollama) Name() string {
	return "ollama"
}

func (o *Ollama) Available() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", o.baseURL+"/api/version", nil)
	if err != nil {
		return false
	}

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (o *Ollama) LoadModel(ctx context.Context, model *Model) error {
	// Ollama loads models on-demand, no explicit load needed
	return nil
}

func (o *Ollama) UnloadModel(ctx context.Context, model *Model) error {
	// Send a request with keep_alive=0 to unload
	body := map[string]any{
		"model":      model.Name,
		"keep_alive": 0,
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (o *Ollama) Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	// Text completions use /api/generate, chat completions use /api/chat
	if req.Prompt != "" {
		return o.completeGenerate(ctx, req)
	}
	return o.completeChat(ctx, req)
}

func (o *Ollama) completeChat(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	ollamaReq := ollamaChatRequest{
		Model:  req.Model,
		Stream: false,
		Options: ollamaOptions{
			Temperature: req.Temperature,
			NumPredict:  req.MaxTokens,
		},
	}

	for _, m := range req.Messages {
		ollamaReq.Messages = append(ollamaReq.Messages, ollamaChatMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	jsonBody, err := json.Marshal(ollamaReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/chat", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(body))
	}

	var ollamaResp ollamaChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return &CompletionResponse{
		ID:               fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano()),
		Content:          ollamaResp.Message.Content,
		FinishReason:     "stop",
		Created:          time.Now().Unix(),
		PromptTokens:     ollamaResp.PromptEvalCount,
		CompletionTokens: ollamaResp.EvalCount,
	}, nil
}

func (o *Ollama) completeGenerate(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error) {
	ollamaReq := map[string]any{
		"model":  req.Model,
		"prompt": req.Prompt,
		"stream": false,
		"options": ollamaOptions{
			Temperature: req.Temperature,
			NumPredict:  req.MaxTokens,
		},
	}

	jsonBody, err := json.Marshal(ollamaReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(body))
	}

	var ollamaResp struct {
		Response        string `json:"response"`
		Done            bool   `json:"done"`
		PromptEvalCount int    `json:"prompt_eval_count"`
		EvalCount       int    `json:"eval_count"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return &CompletionResponse{
		ID:               fmt.Sprintf("cmpl-%d", time.Now().UnixNano()),
		Content:          ollamaResp.Response,
		FinishReason:     "stop",
		Created:          time.Now().Unix(),
		PromptTokens:     ollamaResp.PromptEvalCount,
		CompletionTokens: ollamaResp.EvalCount,
	}, nil
}

func (o *Ollama) CompleteStream(ctx context.Context, req *CompletionRequest) (<-chan CompletionChunk, error) {
	ollamaReq := ollamaChatRequest{
		Model:  req.Model,
		Stream: true,
		Options: ollamaOptions{
			Temperature: req.Temperature,
			NumPredict:  req.MaxTokens,
		},
	}

	for _, m := range req.Messages {
		ollamaReq.Messages = append(ollamaReq.Messages, ollamaChatMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	jsonBody, err := json.Marshal(ollamaReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/chat", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Ollama: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(body))
	}

	ch := make(chan CompletionChunk, 16)
	id := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())

	go func() {
		defer close(ch)
		defer resp.Body.Close()

		decoder := json.NewDecoder(resp.Body)
		for decoder.More() {
			var chunk ollamaChatResponse
			if err := decoder.Decode(&chunk); err != nil {
				return
			}

			finishReason := ""
			if chunk.Done {
				finishReason = "stop"
			}

			ch <- CompletionChunk{
				ID:           id,
				Content:      chunk.Message.Content,
				FinishReason: finishReason,
				Created:      time.Now().Unix(),
			}
		}
	}()

	return ch, nil
}

func (o *Ollama) Embeddings(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error) {
	// Use Ollama's /api/embed endpoint
	ollamaReq := map[string]any{
		"model": req.Model,
		"input": req.Input,
	}

	jsonBody, err := json.Marshal(ollamaReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/embed", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(body))
	}

	var ollamaResp struct {
		Embeddings [][]float64 `json:"embeddings"`
		Model      string      `json:"model"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return &EmbeddingResponse{
		Embeddings: ollamaResp.Embeddings,
		Model:      ollamaResp.Model,
	}, nil
}

// ListModels fetches the list of installed models from Ollama.
func (o *Ollama) ListModels(ctx context.Context) ([]OllamaModelInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", o.baseURL+"/api/tags", nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Models []OllamaModelInfo `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return result.Models, nil
}

// PullModel pulls a model from the Ollama registry.
func (o *Ollama) PullModel(ctx context.Context, name string) error {
	body := map[string]any{
		"name":   name,
		"stream": false,
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", o.baseURL+"/api/pull", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// DeleteModel deletes a model from Ollama.
func (o *Ollama) DeleteModel(ctx context.Context, name string) error {
	body := map[string]string{"name": name}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "DELETE", o.baseURL+"/api/delete", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("calling Ollama: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Ollama returned %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// --- Ollama API types ---

type ollamaChatRequest struct {
	Model    string               `json:"model"`
	Messages []ollamaChatMessage  `json:"messages"`
	Stream   bool                 `json:"stream"`
	Options  ollamaOptions        `json:"options,omitempty"`
}

type ollamaChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ollamaOptions struct {
	Temperature float64 `json:"temperature,omitempty"`
	NumPredict  int     `json:"num_predict,omitempty"`
}

type ollamaChatResponse struct {
	Message         ollamaChatMessage `json:"message"`
	Done            bool              `json:"done"`
	PromptEvalCount int               `json:"prompt_eval_count"`
	EvalCount       int               `json:"eval_count"`
}

// OllamaModelInfo represents model info from Ollama's /api/tags endpoint.
type OllamaModelInfo struct {
	Name       string    `json:"name"`
	ModifiedAt time.Time `json:"modified_at"`
	Size       int64     `json:"size"`
	Digest     string    `json:"digest"`
	Details    struct {
		Format            string `json:"format"`
		Family            string `json:"family"`
		ParameterSize     string `json:"parameter_size"`
		QuantizationLevel string `json:"quantization_level"`
	} `json:"details"`
}
