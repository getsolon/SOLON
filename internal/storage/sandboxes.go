package storage

import (
	"fmt"
	"time"
)

// SandboxRecord represents a sandbox row in the database.
type SandboxRecord struct {
	ID          string
	Name        string
	ContainerID string
	Status      string
	Policy      string
	APIKeyID    string
	Config      string
	CreatedAt   time.Time
	StartedAt   *time.Time
	StoppedAt   *time.Time
}

// CreateSandbox inserts a new sandbox record.
func (d *DB) CreateSandbox(id, name, containerID, policy, apiKeyID string, config *string) error {
	cfgVal := ""
	if config != nil {
		cfgVal = *config
	}
	_, err := d.db.Exec(
		`INSERT INTO sandboxes (id, name, container_id, status, policy, api_key_id, config)
		 VALUES (?, ?, ?, 'created', ?, ?, ?)`,
		id, name, containerID, policy, apiKeyID, cfgVal,
	)
	if err != nil {
		return fmt.Errorf("inserting sandbox: %w", err)
	}
	return nil
}

// GetSandbox returns a sandbox by ID.
func (d *DB) GetSandbox(id string) (*SandboxRecord, error) {
	row := d.db.QueryRow(
		`SELECT id, name, container_id, status, policy, api_key_id, config, created_at, started_at, stopped_at
		 FROM sandboxes WHERE id = ?`, id,
	)

	var sb SandboxRecord
	var containerID, apiKeyID, config *string
	var startedAt, stoppedAt *string

	if err := row.Scan(&sb.ID, &sb.Name, &containerID, &sb.Status, &sb.Policy, &apiKeyID, &config, &sb.CreatedAt, &startedAt, &stoppedAt); err != nil {
		return nil, fmt.Errorf("scanning sandbox: %w", err)
	}

	if containerID != nil {
		sb.ContainerID = *containerID
	}
	if apiKeyID != nil {
		sb.APIKeyID = *apiKeyID
	}
	if config != nil {
		sb.Config = *config
	}
	if startedAt != nil {
		t, err := time.Parse("2006-01-02 15:04:05", *startedAt)
		if err == nil {
			sb.StartedAt = &t
		}
	}
	if stoppedAt != nil {
		t, err := time.Parse("2006-01-02 15:04:05", *stoppedAt)
		if err == nil {
			sb.StoppedAt = &t
		}
	}

	return &sb, nil
}

// ListSandboxes returns all sandboxes.
func (d *DB) ListSandboxes() ([]*SandboxRecord, error) {
	rows, err := d.db.Query(
		`SELECT id, name, container_id, status, policy, api_key_id, config, created_at, started_at, stopped_at
		 FROM sandboxes ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying sandboxes: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var sandboxes []*SandboxRecord
	for rows.Next() {
		var sb SandboxRecord
		var containerID, apiKeyID, config *string
		var startedAt, stoppedAt *string

		if err := rows.Scan(&sb.ID, &sb.Name, &containerID, &sb.Status, &sb.Policy, &apiKeyID, &config, &sb.CreatedAt, &startedAt, &stoppedAt); err != nil {
			return nil, fmt.Errorf("scanning sandbox row: %w", err)
		}

		if containerID != nil {
			sb.ContainerID = *containerID
		}
		if apiKeyID != nil {
			sb.APIKeyID = *apiKeyID
		}
		if config != nil {
			sb.Config = *config
		}
		if startedAt != nil {
			t, err := time.Parse("2006-01-02 15:04:05", *startedAt)
			if err == nil {
				sb.StartedAt = &t
			}
		}
		if stoppedAt != nil {
			t, err := time.Parse("2006-01-02 15:04:05", *stoppedAt)
			if err == nil {
				sb.StoppedAt = &t
			}
		}

		sandboxes = append(sandboxes, &sb)
	}

	return sandboxes, rows.Err()
}

// UpdateSandboxStatus updates a sandbox's status and the corresponding timestamp.
func (d *DB) UpdateSandboxStatus(id, status string) error {
	var query string
	switch status {
	case "running":
		query = `UPDATE sandboxes SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`
	case "stopped":
		query = `UPDATE sandboxes SET status = ?, stopped_at = CURRENT_TIMESTAMP WHERE id = ?`
	default:
		query = `UPDATE sandboxes SET status = ? WHERE id = ?`
	}
	_, err := d.db.Exec(query, status, id)
	if err != nil {
		return fmt.Errorf("updating sandbox status: %w", err)
	}
	return nil
}

// UpdateSandboxContainer updates the container ID for a sandbox.
func (d *DB) UpdateSandboxContainer(id, containerID string) error {
	_, err := d.db.Exec(`UPDATE sandboxes SET container_id = ? WHERE id = ?`, containerID, id)
	if err != nil {
		return fmt.Errorf("updating sandbox container: %w", err)
	}
	return nil
}

// DeleteSandbox removes a sandbox record from the database.
func (d *DB) DeleteSandbox(id string) error {
	_, err := d.db.Exec(`DELETE FROM sandboxes WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting sandbox: %w", err)
	}
	return nil
}
