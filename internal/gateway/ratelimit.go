package gateway

import (
	"net/http"
	"sync"
	"time"
)

// tokenBucket implements a simple token bucket rate limiter.
type tokenBucket struct {
	tokens     float64
	maxTokens  float64
	refillRate float64 // tokens per second
	lastRefill time.Time
	mu         sync.Mutex
}

func newTokenBucket(maxTokens, refillRate float64) *tokenBucket {
	return &tokenBucket{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (b *tokenBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens += elapsed * b.refillRate
	if b.tokens > b.maxTokens {
		b.tokens = b.maxTokens
	}
	b.lastRefill = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

// rateLimiter manages per-key rate limiting.
type rateLimiter struct {
	buckets map[string]*tokenBucket
	mu      sync.RWMutex
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*tokenBucket),
	}
}

func (rl *rateLimiter) allow(keyID string, ratePerMinute int) bool {
	rl.mu.RLock()
	bucket, ok := rl.buckets[keyID]
	rl.mu.RUnlock()

	if !ok {
		rl.mu.Lock()
		// Double-check after acquiring write lock
		bucket, ok = rl.buckets[keyID]
		if !ok {
			rps := float64(ratePerMinute) / 60.0
			burst := float64(ratePerMinute) / 6.0 // 10-second burst
			if burst < 1 {
				burst = 1
			}
			bucket = newTokenBucket(burst, rps)
			rl.buckets[keyID] = bucket
		}
		rl.mu.Unlock()
	}

	return bucket.allow()
}

var globalRateLimiter = newRateLimiter()

// RateLimit is middleware that enforces per-key rate limits using a token bucket.
func (g *Gateway) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keyInfo, ok := r.Context().Value(keyContextKey).(*KeyInfo)
		if !ok {
			// No key in context — auth middleware should have caught this
			next.ServeHTTP(w, r)
			return
		}

		if !globalRateLimiter.allow(keyInfo.ID, keyInfo.RateLimit) {
			w.Header().Set("Retry-After", "1")
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// KeyInfo holds information about an authenticated API key.
type KeyInfo struct {
	ID        string
	Name      string
	Scope     string
	RateLimit int // requests per minute
}
