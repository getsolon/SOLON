package gateway

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTokenBucketAllow(t *testing.T) {
	tests := []struct {
		name      string
		maxTokens float64
		refill    float64
		requests  int
		wantAllow int
	}{
		{
			name:      "all requests allowed within burst",
			maxTokens: 10,
			refill:    1,
			requests:  10,
			wantAllow: 10,
		},
		{
			name:      "excess requests denied",
			maxTokens: 3,
			refill:    0,
			requests:  5,
			wantAllow: 3,
		},
		{
			name:      "single token bucket",
			maxTokens: 1,
			refill:    0,
			requests:  3,
			wantAllow: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bucket := newTokenBucket(tt.maxTokens, tt.refill)
			allowed := 0
			for i := 0; i < tt.requests; i++ {
				if bucket.allow() {
					allowed++
				}
			}
			assert.Equal(t, tt.wantAllow, allowed)
		})
	}
}

func TestTokenBucketRefill(t *testing.T) {
	bucket := newTokenBucket(1, 100) // 100 tokens/sec refill
	// Exhaust the bucket
	assert.True(t, bucket.allow())
	assert.False(t, bucket.allow())

	// Wait for refill
	time.Sleep(20 * time.Millisecond)

	// Should be allowed again
	assert.True(t, bucket.allow())
}

func TestRateLimiterPerKey(t *testing.T) {
	rl := newRateLimiter()

	// Key A with 60 req/min (burst = 10)
	allowed := 0
	for i := 0; i < 20; i++ {
		if rl.allow("key-a", 60) {
			allowed++
		}
	}
	assert.Equal(t, 10, allowed, "burst should be rate/6 = 10")

	// Key B is independent — should still have its full burst
	assert.True(t, rl.allow("key-b", 60))
}

func TestRateLimitMiddleware(t *testing.T) {
	gw, store := testGateway(t)

	key, err := store.CreateKey("rl-test", "user")
	require.NoError(t, err)

	// Create a handler chain: auth → rate limit → success
	handler := gw.Authenticate(gw.RateLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	// Reset global rate limiter for a clean test
	globalRateLimiter = newRateLimiter()

	// The key has rate_limit=60, burst=10. Send 15 requests.
	// Note: bcrypt auth takes ~100ms/request, so token refill (1/sec) may
	// add 1-2 extra tokens during the loop. Use range assertions.
	var okCount, rateLimited int
	for i := 0; i < 15; i++ {
		req := httptest.NewRequest("POST", "/v1/chat/completions", nil)
		req.Header.Set("Authorization", "Bearer "+key.Raw)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		switch rec.Code {
		case http.StatusOK:
			okCount++
		case http.StatusTooManyRequests:
			rateLimited++
		}
	}

	assert.GreaterOrEqual(t, okCount, 10, "burst allows at least 10 requests")
	assert.LessOrEqual(t, okCount, 12, "should not allow more than burst + refill")
	assert.Equal(t, 15, okCount+rateLimited, "all requests should be OK or rate limited")
}

func TestRateLimitRetryAfterHeader(t *testing.T) {
	gw, store := testGateway(t)

	key, err := store.CreateKey("retry-test", "user")
	require.NoError(t, err)

	handler := gw.Authenticate(gw.RateLimit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	globalRateLimiter = newRateLimiter()

	// Use a very low rate to trigger limit quickly
	// Default rate is 60/min. Exhaust the burst first.
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest("POST", "/v1/chat/completions", nil)
		req.Header.Set("Authorization", "Bearer "+key.Raw)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
	}

	// Next request should be rate limited with Retry-After
	req := httptest.NewRequest("POST", "/v1/chat/completions", nil)
	req.Header.Set("Authorization", "Bearer "+key.Raw)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
	assert.Equal(t, "1", rec.Header().Get("Retry-After"))
}
