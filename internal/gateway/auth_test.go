package gateway

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/openclaw/solon/internal/storage"
)

func testStore(t *testing.T) *storage.DB {
	t.Helper()
	dir := t.TempDir()
	db, err := storage.Open(filepath.Join(dir, "test.db"))
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return db
}

func testGateway(t *testing.T) (*Gateway, *storage.DB) {
	t.Helper()
	store := testStore(t)
	gw := &Gateway{store: store}
	return gw, store
}

func TestAuthenticate(t *testing.T) {
	tests := []struct {
		name       string
		authHeader string
		setupKey   bool
		revokeKey  bool
		wantStatus int
	}{
		{
			name:       "missing auth header",
			authHeader: "",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "invalid format — no Bearer prefix",
			authHeader: "Basic abc123",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "invalid key prefix",
			authHeader: "Bearer invalid_key_format",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "nonexistent key",
			authHeader: "Bearer sol_sk_live_nonexistent_key_value",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "valid key",
			authHeader: "", // set dynamically
			setupKey:   true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "revoked key",
			authHeader: "", // set dynamically
			setupKey:   true,
			revokeKey:  true,
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gw, store := testGateway(t)

			authHeader := tt.authHeader
			if tt.setupKey {
				key, err := store.CreateKey("test-key", "user")
				require.NoError(t, err)
				authHeader = "Bearer " + key.Raw

				if tt.revokeKey {
					require.NoError(t, store.RevokeKey(key.ID))
				}
			}

			handler := gw.Authenticate(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify key info is in context
				keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo)
				assert.True(t, ok)
				assert.NotEmpty(t, keyInfo.ID)
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest("GET", "/v1/models", nil)
			if authHeader != "" {
				req.Header.Set("Authorization", authHeader)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func TestLocalhostOrAuth(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		authHeader string
		setupKey   bool
		wantStatus int
	}{
		{
			name:       "localhost IPv4 — no auth needed",
			remoteAddr: "127.0.0.1:12345",
			authHeader: "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "localhost IPv6 — no auth needed",
			remoteAddr: "[::1]:12345",
			authHeader: "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "remote without auth — rejected",
			remoteAddr: "192.168.1.100:12345",
			authHeader: "",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "remote with valid auth — allowed",
			remoteAddr: "192.168.1.100:12345",
			authHeader: "", // set dynamically
			setupKey:   true,
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gw, store := testGateway(t)

			authHeader := tt.authHeader
			if tt.setupKey {
				key, err := store.CreateKey("test-key", "user")
				require.NoError(t, err)
				authHeader = "Bearer " + key.Raw
			}

			handler := gw.LocalhostOrAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest("GET", "/api/v1/keys", nil)
			req.RemoteAddr = tt.remoteAddr
			if authHeader != "" {
				req.Header.Set("Authorization", authHeader)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func TestIsLocalhost(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		want       bool
	}{
		{"IPv4 localhost", "127.0.0.1:8080", true},
		{"IPv6 localhost", "[::1]:8080", true},
		{"remote IP", "10.0.0.1:8080", false},
		{"public IP", "8.8.8.8:443", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = tt.remoteAddr
			assert.Equal(t, tt.want, isLocalhost(req))
		})
	}
}

func TestRequireAdminScope(t *testing.T) {
	tests := []struct {
		name       string
		setupKey   func(*storage.DB) string // returns raw key or ""
		remoteAddr string
		wantStatus int
	}{
		{
			name:       "localhost without key — allowed",
			setupKey:   func(db *storage.DB) string { return "" },
			remoteAddr: "127.0.0.1:12345",
			wantStatus: http.StatusOK,
		},
		{
			name: "admin key — allowed",
			setupKey: func(db *storage.DB) string {
				key, _ := db.CreateKey("admin-key", "admin")
				return key.Raw
			},
			remoteAddr: "192.168.1.100:12345",
			wantStatus: http.StatusOK,
		},
		{
			name: "user key — rejected",
			setupKey: func(db *storage.DB) string {
				key, _ := db.CreateKey("user-key", "user")
				return key.Raw
			},
			remoteAddr: "192.168.1.100:12345",
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gw, store := testGateway(t)

			rawKey := tt.setupKey(store)

			// Chain LocalhostOrAuth → RequireAdminScope → handler
			handler := gw.LocalhostOrAuth(gw.RequireAdminScope(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})))

			req := httptest.NewRequest("GET", "/api/v1/keys", nil)
			req.RemoteAddr = tt.remoteAddr
			if rawKey != "" {
				req.Header.Set("Authorization", "Bearer "+rawKey)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

// Ensure HOME isn't touched during tests
func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
