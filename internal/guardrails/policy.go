package guardrails

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Policy defines security rules for a model's inference behavior.
type Policy struct {
	// SystemPrompt is always prepended to conversations. Cannot be overridden by API callers.
	SystemPrompt string `yaml:"system_prompt"`

	// DenyUserSystem strips user-supplied system messages when a pinned system prompt exists.
	DenyUserSystem bool `yaml:"deny_user_system"`

	// TagUntrustedInput wraps user message content in delimiter tags.
	TagUntrustedInput bool `yaml:"tag_untrusted_input"`

	// Delimiter is the XML tag name for untrusted content (default: "user_input").
	Delimiter string `yaml:"delimiter"`
}

// Message is a minimal chat message used by the guardrails layer.
type Message struct {
	Role    string
	Content string
}

// Apply transforms a message list according to the policy.
func (p *Policy) Apply(messages []Message) []Message {
	if p == nil {
		return messages
	}

	delimiter := p.Delimiter
	if delimiter == "" {
		delimiter = "user_input"
	}

	var result []Message

	// Prepend pinned system prompt
	if p.SystemPrompt != "" {
		result = append(result, Message{
			Role:    "system",
			Content: p.SystemPrompt,
		})
	}

	for _, msg := range messages {
		// Strip user-supplied system messages if denied
		if msg.Role == "system" && p.DenyUserSystem {
			continue
		}
		// Also skip user system messages if we already prepended a pinned one
		if msg.Role == "system" && p.SystemPrompt != "" {
			continue
		}

		// Tag untrusted input
		if msg.Role == "user" && p.TagUntrustedInput {
			msg.Content = "<" + delimiter + ">\n" + msg.Content + "\n</" + delimiter + ">"
		}

		result = append(result, msg)
	}

	return result
}

// PolicyStore loads and caches per-model policies from disk.
type PolicyStore struct {
	policies map[string]*Policy
	fallback *Policy
}

// NewPolicyStore creates a policy store, loading policies from the given directory.
// Directory structure: <dir>/<model-name>.yaml (colons replaced with dashes).
// Also loads <dir>/default.yaml as the fallback policy.
func NewPolicyStore(dir string) *PolicyStore {
	ps := &PolicyStore{
		policies: make(map[string]*Policy),
	}

	if dir == "" {
		return ps
	}

	// Load default policy
	if p, err := loadPolicy(filepath.Join(dir, "default.yaml")); err == nil {
		ps.fallback = p
	}

	// Load per-model policies
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ps
	}
	for _, entry := range entries {
		name := entry.Name()
		if name == "default.yaml" || filepath.Ext(name) != ".yaml" {
			continue
		}
		modelName := name[:len(name)-len(".yaml")]
		if p, err := loadPolicy(filepath.Join(dir, name)); err == nil {
			ps.policies[modelName] = p
		}
	}

	return ps
}

// ForModel returns the policy for a given model name, or the default, or nil.
func (ps *PolicyStore) ForModel(model string) *Policy {
	if ps == nil {
		return nil
	}

	// Try exact match (with colons replaced by dashes for filesystem safety)
	safe := safeName(model)
	if p, ok := ps.policies[safe]; ok {
		return p
	}

	// Try exact match with original name
	if p, ok := ps.policies[model]; ok {
		return p
	}

	return ps.fallback
}

func safeName(model string) string {
	result := make([]byte, len(model))
	for i := range model {
		if model[i] == ':' || model[i] == '/' {
			result[i] = '-'
		} else {
			result[i] = model[i]
		}
	}
	return string(result)
}

func loadPolicy(path string) (*Policy, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var p Policy
	if err := yaml.Unmarshal(data, &p); err != nil {
		return nil, err
	}

	return &p, nil
}
