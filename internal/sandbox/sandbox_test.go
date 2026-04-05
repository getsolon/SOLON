package sandbox

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidTier(t *testing.T) {
	assert.True(t, ValidTier(Tier1Locked))
	assert.True(t, ValidTier(Tier2Standard))
	assert.True(t, ValidTier(Tier3Advanced))
	assert.True(t, ValidTier(Tier4Maximum))
	assert.False(t, ValidTier(0))
	assert.False(t, ValidTier(5))
	assert.False(t, ValidTier(-1))
}

func TestListTiers(t *testing.T) {
	tiers := ListTiers()
	assert.Len(t, tiers, 4)
	assert.Equal(t, 1, tiers[0].Level)
	assert.Equal(t, "Locked", tiers[0].Name)
	assert.Equal(t, 4, tiers[3].Level)
	assert.Equal(t, "Maximum", tiers[3].Name)

	// Verify ordering
	for i := 1; i < len(tiers); i++ {
		assert.Greater(t, tiers[i].Level, tiers[i-1].Level)
	}
}

func TestTierConfigProperties(t *testing.T) {
	// Tier 1: most restricted
	t1 := TierConfigs[Tier1Locked]
	assert.False(t, t1.AllowExec)
	assert.False(t, t1.AllowBrowser)
	assert.False(t, t1.Persistent)
	assert.Equal(t, int64(512), t1.MemoryMB)
	assert.Equal(t, NetworkTier1, t1.Network)

	// Tier 2: standard
	t2 := TierConfigs[Tier2Standard]
	assert.True(t, t2.AllowExec)
	assert.True(t, t2.AllowBrowser)
	assert.False(t, t2.Persistent)

	// Tier 3: advanced
	t3 := TierConfigs[Tier3Advanced]
	assert.True(t, t3.Persistent)

	// Tier 4: maximum
	t4 := TierConfigs[Tier4Maximum]
	assert.True(t, t4.Persistent)
	assert.Equal(t, int64(0), t4.MemoryMB, "Tier 4 should have no memory limit")
}

func TestPolicyToTier(t *testing.T) {
	assert.Equal(t, Tier1Locked, PolicyToTier("inference-only"))
	assert.Equal(t, Tier2Standard, PolicyToTier("api-only"))
	assert.Equal(t, Tier4Maximum, PolicyToTier("full"))
	assert.Equal(t, Tier2Standard, PolicyToTier("custom"))
	assert.Equal(t, Tier2Standard, PolicyToTier("unknown"))
}

func TestValidPolicy(t *testing.T) {
	assert.True(t, ValidPolicy("full"))
	assert.True(t, ValidPolicy("api-only"))
	assert.True(t, ValidPolicy("inference-only"))
	assert.True(t, ValidPolicy("custom"))
	assert.False(t, ValidPolicy("nonexistent"))
	assert.False(t, ValidPolicy(""))
}

func TestListPresets(t *testing.T) {
	presets := ListPresets()
	assert.Len(t, presets, 4)

	// Verify order
	names := make([]string, len(presets))
	for i, p := range presets {
		names[i] = p.Name
	}
	assert.Equal(t, []string{"full", "api-only", "inference-only", "custom"}, names)

	// api-only should have allowed hosts
	for _, p := range presets {
		if p.Name == "api-only" {
			assert.Contains(t, p.AllowedHosts, "api.openai.com")
			assert.Contains(t, p.AllowedHosts, "api.anthropic.com")
		}
		if p.Name == "inference-only" {
			assert.Empty(t, p.AllowedHosts)
		}
	}
}
