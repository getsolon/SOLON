package gateway

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/openclaw/solon/internal/dashboard"
	"github.com/openclaw/solon/internal/guardrails"
	"github.com/openclaw/solon/internal/inference"
	"github.com/openclaw/solon/internal/models"
	"github.com/openclaw/solon/internal/storage"
	"github.com/openclaw/solon/internal/tunnel"
)

// Config holds gateway configuration.
type Config struct {
	Port       int
	Version    string
	Engine     *inference.Engine
	Store      *storage.DB
	Tunnel     tunnel.Tunnel
	Guardrails *guardrails.Config
	Policies   *guardrails.PolicyStore
}

// Gateway is the main HTTP server that handles auth, routing, and middleware.
type Gateway struct {
	router     chi.Router
	engine     *inference.Engine
	store      *storage.DB
	tunnel     tunnel.Tunnel
	port       int
	version    string
	guardrails *guardrails.Config
	policies   *guardrails.PolicyStore
	shield     *guardrails.Shield
}

// New creates a new Gateway with the given configuration.
func New(cfg Config) (*Gateway, error) {
	grCfg := cfg.Guardrails
	if grCfg == nil {
		grCfg = guardrails.DefaultConfig()
	}

	var shield *guardrails.Shield
	if grCfg.Enabled && grCfg.Shield.Enabled {
		shield = guardrails.NewShield(grCfg.Shield.Threshold)
	}

	g := &Gateway{
		router:     chi.NewRouter(),
		engine:     cfg.Engine,
		store:      cfg.Store,
		tunnel:     cfg.Tunnel,
		port:       cfg.Port,
		version:    cfg.Version,
		guardrails: grCfg,
		policies:   cfg.Policies,
		shield:     shield,
	}

	g.setupRoutes()
	return g, nil
}

func (g *Gateway) setupRoutes() {
	r := g.router

	// Global middleware
	r.Use(RequestID)
	r.Use(Logger)
	r.Use(CORS)
	r.Use(Recovery)

	// Health check (no auth required)
	r.Get("/api/v1/health", g.handleHealth)

	// OpenAI-compatible inference API (localhost bypass for dashboard, auth for remote)
	r.Group(func(r chi.Router) {
		r.Use(g.LocalhostOrAuth)
		r.Use(g.RateLimit)

		r.Post("/v1/chat/completions", g.handleChatCompletions)
		r.Post("/v1/completions", g.handleCompletions)
		r.Post("/v1/embeddings", g.handleEmbeddings)
		r.Get("/v1/models", g.handleListModels)
	})

	// Management API (localhost-only, no API key needed for dashboard access)
	r.Group(func(r chi.Router) {
		r.Use(g.LocalhostOrAuth)
		r.Use(g.RequireAdminScope)

		// Key management
		r.Get("/api/v1/keys", g.handleListKeys)
		r.Post("/api/v1/keys", g.handleCreateKey)
		r.Delete("/api/v1/keys/{id}", g.handleRevokeKey)

		// Model management
		r.Get("/api/v1/models", g.handleListModelsDetailed)
		r.Post("/api/v1/models/pull", g.handlePullModel)
		r.Delete("/api/v1/models/{name}", g.handleDeleteModel)

		// Analytics
		r.Get("/api/v1/analytics/requests", g.handleRequestLog)
		r.Get("/api/v1/analytics/usage", g.handleUsageStats)
		r.Get("/api/v1/analytics/guardrails", g.handleGuardrailEvents)

		// Tunnel
		r.Get("/api/v1/tunnel/status", g.handleTunnelStatus)
		r.Post("/api/v1/tunnel/enable", g.handleTunnelEnable)
		r.Post("/api/v1/tunnel/disable", g.handleTunnelDisable)
	})

	// Dashboard — serve embedded static files (no auth, localhost only)
	r.Handle("/*", dashboard.Handler())
}

// ListenAndServe starts the HTTP server.
func (g *Gateway) ListenAndServe() error {
	addr := fmt.Sprintf(":%d", g.port)
	return http.ListenAndServe(addr, g.router)
}

// --- Inference handlers ---

func (g *Gateway) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	// Limit body size to prevent OOM
	r.Body = http.MaxBytesReader(w, r.Body, int64(g.guardrails.Gate.MaxBodyBytes))

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "request body too large or unreadable")
		return
	}

	var req inference.ChatCompletionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("decode error: %v | body: %s", err, string(body[:min(len(body), 500)]))
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	// Step 1: Structural validation
	if err := validateChatRequest(&req); err != nil {
		g.logGuardrailEvent(r, req.Model, "gate", "block", err.Error(), 0)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Step 2: Shield — prompt injection detection
	if g.shield != nil {
		msgs := chatMessagesToGuardrailMessages(req.Messages)
		result := g.shield.Scan(msgs)
		if result.Blocked && g.guardrails.Shield.Action == "block" {
			g.logGuardrailEvent(r, req.Model, "shield", "block", fmt.Sprintf("patterns: %v", result.Patterns), result.Score)
			writeError(w, http.StatusBadRequest, "request blocked by content policy")
			return
		}
		if len(result.Patterns) > 0 {
			g.logGuardrailEvent(r, req.Model, "shield", "flag", fmt.Sprintf("patterns: %v", result.Patterns), result.Score)
		}
	}

	// Step 3: Policy — system prompt pinning + content tagging
	if g.policies != nil {
		if policy := g.policies.ForModel(req.Model); policy != nil {
			msgs := chatMessagesToGuardrailMessages(req.Messages)
			transformed := policy.Apply(msgs)
			req.Messages = guardrailMessagesToChatMessages(transformed)
		}
	}

	start := time.Now()

	if req.Stream {
		g.handleChatCompletionsStream(w, r, &req, start)
		return
	}

	resp, err := g.engine.ChatCompletion(r.Context(), &req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Log request
	if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok {
		_ = g.store.LogRequest(keyInfo.ID, r.Method, r.URL.Path, req.Model,
			resp.Usage.PromptTokens, resp.Usage.CompletionTokens,
			int(time.Since(start).Milliseconds()), http.StatusOK)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (g *Gateway) handleChatCompletionsStream(w http.ResponseWriter, r *http.Request, req *inference.ChatCompletionRequest, start time.Time) {
	// Unwrap to get the underlying http.Flusher (chi wraps the ResponseWriter)
	flusher, ok := w.(http.Flusher)
	if !ok {
		// Try unwrapping
		if u, ok2 := w.(interface{ Unwrap() http.ResponseWriter }); ok2 {
			flusher, ok = u.Unwrap().(http.Flusher)
		}
	}
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	chunks, err := g.engine.ChatCompletionStream(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	totalCompletion := 0
	for chunk := range chunks {
		totalCompletion++
		data := inference.ChatCompletionStreamChunk{
			ID:      chunk.ID,
			Object:  "chat.completion.chunk",
			Created: chunk.Created,
			Model:   req.Model,
			Choices: []inference.ChatCompletionStreamChoice{
				{
					Index: 0,
					Delta: inference.ChatMessageDelta{
						Role:    "assistant",
						Content: chunk.Content,
					},
					FinishReason: chunk.FinishReason,
				},
			},
		}

		jsonData, err := json.Marshal(data)
		if err != nil {
			return
		}

		_, _ = fmt.Fprintf(w, "data: %s\n\n", jsonData)
		flusher.Flush()
	}

	_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	flusher.Flush()

	// Log request
	if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok {
		_ = g.store.LogRequest(keyInfo.ID, r.Method, r.URL.Path, req.Model,
			0, totalCompletion, int(time.Since(start).Milliseconds()), http.StatusOK)
	}
}

func (g *Gateway) handleCompletions(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, int64(g.guardrails.Gate.MaxBodyBytes))

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "request body too large or unreadable")
		return
	}

	var req inference.TextCompletionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	// Structural validation
	if err := validateTextRequest(&req); err != nil {
		g.logGuardrailEvent(r, req.Model, "gate", "block", err.Error(), 0)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	start := time.Now()

	resp, err := g.engine.TextCompletion(r.Context(), &req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok {
		_ = g.store.LogRequest(keyInfo.ID, r.Method, r.URL.Path, req.Model,
			resp.Usage.PromptTokens, resp.Usage.CompletionTokens,
			int(time.Since(start).Milliseconds()), http.StatusOK)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (g *Gateway) handleEmbeddings(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, int64(g.guardrails.Gate.MaxBodyBytes))

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "request body too large or unreadable")
		return
	}

	// OpenAI accepts input as string or []string — normalize to []string
	var raw struct {
		Model string          `json:"model"`
		Input json.RawMessage `json:"input"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	var input []string
	// Try string first
	var single string
	if err := json.Unmarshal(raw.Input, &single); err == nil {
		input = []string{single}
	} else {
		// Try []string
		if err := json.Unmarshal(raw.Input, &input); err != nil {
			writeError(w, http.StatusBadRequest, "input must be a string or array of strings")
			return
		}
	}

	req := &inference.EmbeddingRequest{
		Model: raw.Model,
		Input: input,
	}

	start := time.Now()

	resp, err := g.engine.Embeddings(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok {
		_ = g.store.LogRequest(keyInfo.ID, r.Method, r.URL.Path, req.Model,
			resp.Usage.PromptTokens, 0,
			int(time.Since(start).Milliseconds()), http.StatusOK)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (g *Gateway) handleListModels(w http.ResponseWriter, r *http.Request) {
	models, err := g.engine.ListModels(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Format as OpenAI-compatible response
	type modelObj struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		OwnedBy string `json:"owned_by"`
	}

	var data []modelObj
	for _, m := range models {
		data = append(data, modelObj{
			ID:      m.Name,
			Object:  "model",
			Created: m.Modified.Unix(),
			OwnedBy: "solon",
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"object": "list",
		"data":   data,
	})
}

// --- Management handlers ---

func (g *Gateway) handleHealth(w http.ResponseWriter, r *http.Request) {
	v := g.version
	if v == "" {
		v = "dev"
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"version": v,
	})
}

func (g *Gateway) handleListKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := g.store.ListKeys()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": keys})
}

func (g *Gateway) handleCreateKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name  string `json:"name"`
		Scope string `json:"scope"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Scope == "" {
		req.Scope = "user"
	}
	if req.Scope != "admin" && req.Scope != "user" {
		writeError(w, http.StatusBadRequest, "scope must be 'admin' or 'user'")
		return
	}

	// Only admin keys (or localhost with no key) can create admin-scoped keys
	if req.Scope == "admin" {
		if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok && keyInfo.Scope != "admin" {
			writeError(w, http.StatusForbidden, "only admin keys can create admin-scoped keys")
			return
		}
	}

	key, err := g.store.CreateKey(req.Name, req.Scope)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"key":  key.Raw,
		"name": key.Name,
		"id":   key.ID,
	})
}

func (g *Gateway) handleRevokeKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := g.store.RevokeKey(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}

func (g *Gateway) handleListModelsDetailed(w http.ResponseWriter, r *http.Request) {
	models, err := g.engine.ListModels(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"models": models})
}

func (g *Gateway) handlePullModel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string `json:"name"`
		Stream bool   `json:"stream"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "model name is required")
		return
	}

	if !req.Stream {
		if err := g.engine.PullModel(r.Context(), req.Name, nil); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "pulled"})
		return
	}

	// SSE streaming progress
	flusher, ok := w.(http.Flusher)
	if !ok {
		if u, ok2 := w.(interface{ Unwrap() http.ResponseWriter }); ok2 {
			flusher, ok = u.Unwrap().(http.Flusher)
		}
	}
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	err := g.engine.PullModel(r.Context(), req.Name, func(p models.DownloadProgress) {
		data, _ := json.Marshal(p)
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	})

	if err != nil {
		data, _ := json.Marshal(map[string]string{"event": "error", "message": err.Error()})
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		return
	}

	data, _ := json.Marshal(map[string]string{"event": "done", "status": "pulled"})
	_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
}

func (g *Gateway) handleDeleteModel(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if err := g.engine.RemoveModel(r.Context(), name); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (g *Gateway) handleRequestLog(w http.ResponseWriter, r *http.Request) {
	logs, err := g.store.GetRequestLog(100)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"requests": logs})
}

func (g *Gateway) handleUsageStats(w http.ResponseWriter, r *http.Request) {
	stats, err := g.store.GetUsageStats()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (g *Gateway) handleTunnelStatus(w http.ResponseWriter, r *http.Request) {
	if g.tunnel == nil {
		writeJSON(w, http.StatusOK, map[string]any{"enabled": false, "provider": ""})
		return
	}
	status, err := g.tunnel.Status(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func (g *Gateway) handleTunnelEnable(w http.ResponseWriter, r *http.Request) {
	if g.tunnel == nil {
		writeError(w, http.StatusBadRequest, "no tunnel provider configured")
		return
	}
	if err := g.tunnel.Enable(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	status, _ := g.tunnel.Status(r.Context())
	writeJSON(w, http.StatusOK, status)
}

func (g *Gateway) handleTunnelDisable(w http.ResponseWriter, r *http.Request) {
	if g.tunnel == nil {
		writeError(w, http.StatusBadRequest, "no tunnel provider configured")
		return
	}
	if err := g.tunnel.Disable(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "disabled"})
}

func (g *Gateway) handleGuardrailEvents(w http.ResponseWriter, r *http.Request) {
	events, err := g.store.GetGuardrailEvents(100)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	stats, _ := g.store.GetGuardrailStats()
	writeJSON(w, http.StatusOK, map[string]any{
		"events": events,
		"stats":  stats,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]any{
			"message": message,
			"type":    http.StatusText(status),
		},
	})
}

// --- Guardrails helpers ---

func chatMessagesToGuardrailMessages(msgs []inference.ChatMessage) []guardrails.Message {
	result := make([]guardrails.Message, len(msgs))
	for i, m := range msgs {
		result[i] = guardrails.Message{Role: m.Role, Content: m.Content.Text}
	}
	return result
}

func guardrailMessagesToChatMessages(msgs []guardrails.Message) []inference.ChatMessage {
	result := make([]inference.ChatMessage, len(msgs))
	for i, m := range msgs {
		result[i] = inference.ChatMessage{
			Role:    m.Role,
			Content: inference.ChatContent{Text: m.Content},
		}
	}
	return result
}

func (g *Gateway) logGuardrailEvent(r *http.Request, model, stage, action, reason string, score float64) {
	if g.store == nil || g.guardrails == nil || !g.guardrails.Audit.Enabled {
		return
	}

	requestID := r.Header.Get("X-Request-ID")
	keyID := ""
	if keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo); ok {
		keyID = keyInfo.ID
	}

	_ = g.store.LogGuardrailEvent(requestID, keyID, model, stage, action, reason, score)
}
