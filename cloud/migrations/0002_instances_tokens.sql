CREATE TABLE instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  version TEXT,
  models_count INTEGER DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_instances_user ON instances(user_id);

CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  last_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
