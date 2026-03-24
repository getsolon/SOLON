package sandbox

// TierConfigs maps tier levels to their concrete Docker container configurations.
var TierConfigs = map[int]TierConfig{
	Tier1Locked: {
		Level:        1,
		Name:         "Locked",
		Description:  "No internet except Solon API. No browser, no shell exec.",
		Network:      NetworkTier1,
		Image:        DefaultImage,
		MemoryMB:     512,
		AllowExec:    false,
		AllowBrowser: false,
		Persistent:   false,
		CapAdd:       []string{"NET_BIND_SERVICE"},
	},
	Tier2Standard: {
		Level:        2,
		Name:         "Standard",
		Description:  "Full internet access, headless browser (Playwright), shell exec.",
		Network:      NetworkTier2,
		Image:        SandboxImage,
		MemoryMB:     2048,
		AllowExec:    true,
		AllowBrowser: true,
		Persistent:   false,
		CapAdd:       []string{"NET_BIND_SERVICE", "SYS_CHROOT"},
	},
	Tier3Advanced: {
		Level:        3,
		Name:         "Advanced",
		Description:  "Persistent storage, SSH-ready, background agents.",
		Network:      NetworkTier2,
		Image:        SandboxImage,
		MemoryMB:     4096,
		AllowExec:    true,
		AllowBrowser: true,
		Persistent:   true,
		CapAdd:       []string{"NET_BIND_SERVICE", "SYS_CHROOT", "NET_RAW"},
	},
	Tier4Maximum: {
		Level:        4,
		Name:         "Maximum",
		Description:  "Full access. Privileged capabilities, no memory limit.",
		Network:      NetworkName,
		Image:        SandboxImage,
		MemoryMB:     0,
		AllowExec:    true,
		AllowBrowser: true,
		Persistent:   true,
		CapAdd:       []string{"NET_BIND_SERVICE", "SYS_CHROOT", "NET_RAW", "SYS_ADMIN", "SYS_PTRACE"},
	},
}

// ValidTier returns true if the given tier level is valid.
func ValidTier(tier int) bool {
	_, ok := TierConfigs[tier]
	return ok
}

// ListTiers returns all tier configurations in order.
func ListTiers() []TierConfig {
	tiers := make([]TierConfig, 0, len(TierConfigs))
	for _, level := range []int{Tier1Locked, Tier2Standard, Tier3Advanced, Tier4Maximum} {
		if t, ok := TierConfigs[level]; ok {
			tiers = append(tiers, t)
		}
	}
	return tiers
}

// PolicyToTier maps a legacy policy name to a tier level.
func PolicyToTier(policy string) int {
	switch policy {
	case "inference-only":
		return Tier1Locked
	case "api-only":
		return Tier2Standard
	case "full":
		return Tier4Maximum
	case "custom":
		return Tier2Standard
	default:
		return Tier2Standard
	}
}
