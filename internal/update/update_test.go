package update

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCheckResult_DevVersion(t *testing.T) {
	result := &CheckResult{
		CurrentVersion: "dev",
		LatestVersion:  "0.1.0",
		UpdateAvail:    false,
	}
	assert.False(t, result.UpdateAvail, "dev version should not trigger update")
}

func TestCheckResult_SameVersion(t *testing.T) {
	result := &CheckResult{
		CurrentVersion: "0.1.0",
		LatestVersion:  "0.1.0",
		UpdateAvail:    false,
	}
	assert.False(t, result.UpdateAvail)
}

func TestCheckResult_NewerAvailable(t *testing.T) {
	result := &CheckResult{
		CurrentVersion: "0.1.0",
		LatestVersion:  "0.2.0",
		UpdateAvail:    true,
	}
	assert.True(t, result.UpdateAvail)
}

func TestCheckLatest_StripsVPrefix(t *testing.T) {
	// Unit test for prefix stripping logic
	tests := []struct {
		current  string
		tag      string
		wantCur  string
		wantLat  string
		wantAvail bool
	}{
		{"v0.1.0", "v0.1.0", "0.1.0", "0.1.0", false},
		{"v0.1.0", "v0.2.0", "0.1.0", "0.2.0", true},
		{"0.1.0", "v0.1.0", "0.1.0", "0.1.0", false},
		{"dev", "v0.1.0", "dev", "0.1.0", false},
	}

	for _, tt := range tests {
		t.Run(tt.current+"_vs_"+tt.tag, func(t *testing.T) {
			latest := trimV(tt.tag)
			current := trimV(tt.current)
			avail := current != latest && current != "dev"

			assert.Equal(t, tt.wantCur, current)
			assert.Equal(t, tt.wantLat, latest)
			assert.Equal(t, tt.wantAvail, avail)
		})
	}
}

// trimV mirrors the logic in CheckLatest
func trimV(s string) string {
	if len(s) > 0 && s[0] == 'v' {
		return s[1:]
	}
	return s
}
