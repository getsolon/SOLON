package guardrails

import (
	"strings"
	"unicode"
)

// ShieldResult holds the outcome of scanning messages for injection patterns.
type ShieldResult struct {
	Score    float64  // 0.0 = clean, 1.0 = definite injection
	Blocked  bool     // true if score exceeded threshold
	Patterns []string // names of patterns that matched
}

// Shield scans messages for prompt injection patterns.
type Shield struct {
	Threshold float64 // score above which requests are blocked (default 0.7)
}

// NewShield creates a shield with the given threshold.
func NewShield(threshold float64) *Shield {
	if threshold <= 0 {
		threshold = 0.7
	}
	return &Shield{Threshold: threshold}
}

// Scan checks all messages for injection patterns and returns a result.
func (s *Shield) Scan(messages []Message) ShieldResult {
	var result ShieldResult

	for _, msg := range messages {
		if msg.Role == "system" {
			continue // trust system messages (they're either pinned or already validated)
		}

		content := strings.ToLower(msg.Content)

		// Check each detector
		for _, d := range detectors {
			if d.check(content) {
				result.Score += d.weight
				result.Patterns = append(result.Patterns, d.name)
			}
		}
	}

	// Cap at 1.0
	if result.Score > 1.0 {
		result.Score = 1.0
	}

	result.Blocked = result.Score >= s.Threshold
	return result
}

type detector struct {
	name   string
	weight float64
	check  func(content string) bool
}

var detectors = []detector{
	{
		name:   "instruction_override",
		weight: 0.5,
		check:  checkInstructionOverride,
	},
	{
		name:   "chat_template_markers",
		weight: 0.4,
		check:  checkChatTemplateMarkers,
	},
	{
		name:   "delimiter_injection",
		weight: 0.3,
		check:  checkDelimiterInjection,
	},
	{
		name:   "zero_width_chars",
		weight: 0.3,
		check:  checkZeroWidthChars,
	},
	{
		name:   "role_impersonation",
		weight: 0.4,
		check:  checkRoleImpersonation,
	},
}

// checkInstructionOverride detects phrases that attempt to override system instructions.
func checkInstructionOverride(content string) bool {
	phrases := []string{
		"ignore previous instructions",
		"ignore all instructions",
		"ignore above instructions",
		"ignore your instructions",
		"ignore the above",
		"ignore all previous",
		"disregard previous instructions",
		"disregard your instructions",
		"disregard all instructions",
		"forget your instructions",
		"forget all instructions",
		"forget previous instructions",
		"override your instructions",
		"new instructions:",
		"new objective:",
		"your new task",
		"you are now",
		"act as if you have no restrictions",
		"pretend you are",
		"from now on you",
		"do not follow your",
	}
	for _, p := range phrases {
		if strings.Contains(content, p) {
			return true
		}
	}
	return false
}

// checkChatTemplateMarkers detects chat template tokens embedded in user content.
func checkChatTemplateMarkers(content string) bool {
	markers := []string{
		"<|system|>",
		"<|user|>",
		"<|assistant|>",
		"<|im_start|>",
		"<|im_end|>",
		"<|endoftext|>",
		"<<sys>>",
		"<</sys>>",
		"[inst]",
		"[/inst]",
		"### system:",
		"### human:",
		"### assistant:",
		"<|begin_of_text|>",
		"<|end_of_turn|>",
		"<|eot_id|>",
		"<|start_header_id|>",
		"<|end_header_id|>",
	}
	for _, m := range markers {
		if strings.Contains(content, m) {
			return true
		}
	}
	return false
}

// checkDelimiterInjection detects attempts to close/reopen XML-like delimiters.
func checkDelimiterInjection(content string) bool {
	delimiters := []string{
		"</user_input>",
		"</system>",
		"</instructions>",
		"</context>",
		"</message>",
		"</prompt>",
	}
	for _, d := range delimiters {
		if strings.Contains(content, d) {
			return true
		}
	}
	return false
}

// checkZeroWidthChars detects invisible unicode characters used for evasion.
func checkZeroWidthChars(content string) bool {
	for _, r := range content {
		switch r {
		case '\u200B', // zero-width space
			'\u200C', // zero-width non-joiner
			'\u200D', // zero-width joiner
			'\uFEFF', // zero-width no-break space (BOM)
			'\u2060', // word joiner
			'\u2061', // function application
			'\u2062', // invisible times
			'\u2063', // invisible separator
			'\u2064': // invisible plus
			return true
		}
		// Also flag other invisible format characters (excluding normal whitespace)
		if unicode.Is(unicode.Cf, r) && r != '\n' && r != '\r' && r != '\t' {
			return true
		}
	}
	return false
}

// checkRoleImpersonation detects attempts to simulate role boundaries in content.
func checkRoleImpersonation(content string) bool {
	patterns := []string{
		"\nassistant:",
		"\nsystem:",
		"\nuser:",
		"assistant:\n",
		"system:\n",
	}
	for _, p := range patterns {
		if strings.Contains(content, p) {
			return true
		}
	}
	return false
}
