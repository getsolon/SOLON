package sandbox

// PolicyPresets defines the available network policy presets.
// Each preset specifies which external hosts a sandbox can reach.
var PolicyPresets = map[string]Preset{
	"full": {
		Name:        "full",
		Description: "Unrestricted network access",
	},
	"api-only": {
		Name:        "api-only",
		Description: "HTTPS access to known AI providers, npm, and PyPI only",
		AllowedHosts: []string{
			"api.anthropic.com",
			"api.openai.com",
			"integrate.api.nvidia.com",
			"registry.npmjs.org",
			"pypi.org",
			"files.pythonhosted.org",
			"github.com",
			"api.github.com",
		},
	},
	"inference-only": {
		Name:         "inference-only",
		Description:  "Only Solon inference on the Docker bridge — no internet access",
		AllowedHosts: []string{}, // Empty = only Docker bridge (Solon) allowed
	},
	"custom": {
		Name:        "custom",
		Description: "User-defined network policy",
	},
}

// ListPresets returns all available policy presets.
func ListPresets() []Preset {
	presets := make([]Preset, 0, len(PolicyPresets))
	for _, name := range []string{"full", "api-only", "inference-only", "custom"} {
		if p, ok := PolicyPresets[name]; ok {
			presets = append(presets, p)
		}
	}
	return presets
}

// ValidPolicy returns true if the given policy name is valid.
func ValidPolicy(name string) bool {
	_, ok := PolicyPresets[name]
	return ok
}
