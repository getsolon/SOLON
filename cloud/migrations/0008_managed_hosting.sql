-- Managed hosting instances (provisioned Hetzner servers running Solon)
CREATE TABLE IF NOT EXISTS managed_instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  tier TEXT NOT NULL,               -- starter, pro, gpu
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, provisioning, running, suspended, deleting, deleted
  hetzner_server_id TEXT,
  ipv4 TEXT,
  region TEXT NOT NULL DEFAULT 'eu-central',
  solon_api_key_enc TEXT,           -- AES-GCM encrypted Solon admin API key
  dashboard_url TEXT,
  stripe_subscription_id TEXT,
  provisioning_job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ready_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_managed_instances_user ON managed_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_managed_instances_status ON managed_instances(status);
