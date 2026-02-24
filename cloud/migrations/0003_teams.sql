CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active TEXT
);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE UNIQUE INDEX idx_team_members_team_email ON team_members(team_id, email);
