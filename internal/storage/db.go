package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps a SQLite database connection with Solon-specific operations.
type DB struct {
	db *sql.DB
}

// Open opens or creates the Solon database. If path is empty, uses ~/.solon/solon.db.
func Open(path string) (*DB, error) {
	if path == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("getting home directory: %w", err)
		}
		dir := filepath.Join(home, ".solon")
		if err := os.MkdirAll(dir, 0700); err != nil {
			return nil, fmt.Errorf("creating data directory: %w", err)
		}
		path = filepath.Join(dir, "solon.db")
	}

	db, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// Enable WAL mode for concurrent reads
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("enabling WAL mode: %w", err)
	}

	store := &DB{db: db}
	if err := store.migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	return store, nil
}

// Close closes the database connection.
func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) migrate() error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS api_keys (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			prefix      TEXT NOT NULL,
			hash        TEXT NOT NULL,
			scope       TEXT DEFAULT 'user',
			rate_limit  INTEGER DEFAULT 60,
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_used   DATETIME,
			revoked     BOOLEAN DEFAULT FALSE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix)`,
		`CREATE TABLE IF NOT EXISTS requests (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			key_id      TEXT REFERENCES api_keys(id),
			method      TEXT NOT NULL,
			path        TEXT NOT NULL,
			model       TEXT,
			tokens_in   INTEGER,
			tokens_out  INTEGER,
			latency_ms  INTEGER,
			status_code INTEGER,
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_requests_key ON requests(key_id)`,
		`CREATE TABLE IF NOT EXISTS models (
			name         TEXT PRIMARY KEY,
			size_bytes   INTEGER,
			format       TEXT,
			family       TEXT,
			params       TEXT,
			quantization TEXT,
			pulled_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_used    DATETIME
		)`,
	}

	for _, m := range migrations {
		if _, err := d.db.Exec(m); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
