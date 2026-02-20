package gateway

import (
	"context"
	"net"
	"net/http"
	"strings"
)

type contextKey string

const keyContextKey contextKey = "api_key"

// Authenticate is middleware that validates API keys on every request.
// Auth is mandatory — there is no way to disable it.
func (g *Gateway) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeError(w, http.StatusUnauthorized, "missing Authorization header")
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "invalid Authorization header format, expected 'Bearer <key>'")
			return
		}

		rawKey := strings.TrimPrefix(authHeader, "Bearer ")
		if !strings.HasPrefix(rawKey, "sol_sk_") {
			writeError(w, http.StatusUnauthorized, "invalid API key format")
			return
		}

		apiKey, err := g.store.ValidateKey(rawKey)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid API key")
			return
		}

		// Convert to gateway KeyInfo for downstream handlers
		keyInfo := &KeyInfo{
			ID:        apiKey.ID,
			Name:      apiKey.Name,
			Scope:     apiKey.Scope,
			RateLimit: apiKey.RateLimit,
		}

		ctx := context.WithValue(r.Context(), keyContextKey, keyInfo)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// LocalhostOrAuth allows requests from localhost without auth (for the dashboard),
// but requires API key auth for remote requests.
func (g *Gateway) LocalhostOrAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isLocalhost(r) {
			next.ServeHTTP(w, r)
			return
		}
		// Remote request — require auth
		g.Authenticate(next).ServeHTTP(w, r)
	})
}

func isLocalhost(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	return host == "127.0.0.1" || host == "::1" || host == "localhost"
}
