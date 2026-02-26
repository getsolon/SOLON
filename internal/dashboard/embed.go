package dashboard

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

// staticFiles embeds the built dashboard SPA.
// The dashboard is built from dashboard/src/ to internal/dashboard/dist/ at build time.
//
//go:embed all:dist
var staticFiles embed.FS

// Handler returns an http.Handler that serves the embedded dashboard files
// with SPA fallback (serves index.html for client-side routes).
func Handler() http.Handler {
	dist, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		// If dist doesn't exist yet (pre-build), serve a placeholder
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte("<html><body><h1>Solon Dashboard</h1><p>Dashboard not yet built. Run <code>make build-dashboard</code>.</p></body></html>"))
		})
	}

	fileServer := http.FileServer(http.FS(dist))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the requested file
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if the file exists in the embedded FS
		if f, err := dist.Open(path); err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// SPA fallback: serve index.html for client-side routing
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
