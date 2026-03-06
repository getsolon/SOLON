package gateway

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/openclaw/solon/internal/inference"
)

// Default validation limits.
const (
	DefaultMaxBodyBytes     = 1 << 20 // 1 MB
	DefaultMaxMessages      = 256
	DefaultMaxContentLength = 100_000
	DefaultMaxTokensCap     = 8192
	DefaultMaxStopSequences = 4
	DefaultMaxStopLength    = 64
)

var validRoles = map[string]bool{
	"system":    true,
	"user":      true,
	"assistant": true,
}

// modelNamePattern allows alphanumeric, colons, dots, hyphens, underscores, and slashes.
var modelNamePattern = regexp.MustCompile(`^[a-zA-Z0-9_.:\-/]+$`)

// validateModelName checks a model name for valid characters and rejects path traversal.
func validateModelName(name string) error {
	if name == "" {
		return fmt.Errorf("model is required")
	}
	if !modelNamePattern.MatchString(name) {
		return fmt.Errorf("invalid model name")
	}
	if strings.Contains(name, "..") {
		return fmt.Errorf("invalid model name")
	}
	return nil
}

// validateChatRequest validates a chat completion request.
func validateChatRequest(req *inference.ChatCompletionRequest) error {
	if err := validateModelName(req.Model); err != nil {
		return err
	}

	if len(req.Messages) == 0 {
		return fmt.Errorf("messages must not be empty")
	}
	if len(req.Messages) > DefaultMaxMessages {
		return fmt.Errorf("too many messages (max %d)", DefaultMaxMessages)
	}

	for i, msg := range req.Messages {
		if !validRoles[msg.Role] {
			return fmt.Errorf("message %d: invalid role %q", i, msg.Role)
		}
		if len(msg.Content.Text) > DefaultMaxContentLength {
			return fmt.Errorf("message %d: content too long (max %d chars)", i, DefaultMaxContentLength)
		}
		// System messages only allowed at position 0
		if msg.Role == "system" && i > 0 {
			return fmt.Errorf("message %d: system messages only allowed at position 0", i)
		}
	}

	if err := validateSamplingParams(req.Temperature, req.TopP, req.MaxTokens); err != nil {
		return err
	}

	if len(req.Stop) > DefaultMaxStopSequences {
		return fmt.Errorf("too many stop sequences (max %d)", DefaultMaxStopSequences)
	}
	for i, s := range req.Stop {
		if len(s) > DefaultMaxStopLength {
			return fmt.Errorf("stop sequence %d: too long (max %d chars)", i, DefaultMaxStopLength)
		}
	}

	return nil
}

// validateTextRequest validates a text completion request.
func validateTextRequest(req *inference.TextCompletionRequest) error {
	if err := validateModelName(req.Model); err != nil {
		return err
	}

	if len(req.Prompt) > DefaultMaxContentLength {
		return fmt.Errorf("prompt too long (max %d chars)", DefaultMaxContentLength)
	}

	if err := validateSamplingParams(req.Temperature, req.TopP, req.MaxTokens); err != nil {
		return err
	}

	if len(req.Stop) > DefaultMaxStopSequences {
		return fmt.Errorf("too many stop sequences (max %d)", DefaultMaxStopSequences)
	}
	for i, s := range req.Stop {
		if len(s) > DefaultMaxStopLength {
			return fmt.Errorf("stop sequence %d: too long (max %d chars)", i, DefaultMaxStopLength)
		}
	}

	return nil
}

func validateSamplingParams(temperature, topP float64, maxTokens int) error {
	if temperature < 0 || temperature > 2.0 {
		return fmt.Errorf("temperature must be between 0 and 2.0")
	}
	if topP < 0 || topP > 1.0 {
		return fmt.Errorf("top_p must be between 0 and 1.0")
	}
	if maxTokens < 0 {
		return fmt.Errorf("max_tokens must not be negative")
	}
	if maxTokens > DefaultMaxTokensCap {
		return fmt.Errorf("max_tokens exceeds server limit (%d)", DefaultMaxTokensCap)
	}
	return nil
}
