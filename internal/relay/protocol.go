package relay

// Message types for the Solon ↔ Relay WebSocket protocol.

// RequestMsg is sent from relay to Solon when an API request arrives.
type RequestMsg struct {
	Type    string            `json:"type"` // "request"
	ID      string            `json:"id"`
	Method  string            `json:"method"`
	Path    string            `json:"path"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// ResponseMsg is sent from Solon to relay with the complete response.
type ResponseMsg struct {
	Type    string            `json:"type"` // "response"
	ID      string            `json:"id"`
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
}

// StreamStartMsg begins a streaming response.
type StreamStartMsg struct {
	Type    string            `json:"type"` // "response_start"
	ID      string            `json:"id"`
	Status  int               `json:"status"`
	Headers map[string]string `json:"headers,omitempty"`
}

// StreamChunkMsg sends one chunk of a streaming response.
type StreamChunkMsg struct {
	Type string `json:"type"` // "response_chunk"
	ID   string `json:"id"`
	Data string `json:"data"`
}

// StreamEndMsg ends a streaming response.
type StreamEndMsg struct {
	Type string `json:"type"` // "response_end"
	ID   string `json:"id"`
}

// InitMsg is sent by Solon on connection.
type InitMsg struct {
	Type       string `json:"type"` // "init"
	InstanceID string `json:"instance_id"`
	Version    string `json:"version"`
}

// InitOKMsg is the relay's response to init.
type InitOKMsg struct {
	Type string `json:"type"` // "init_ok"
	URL  string `json:"url"`
}

// PingMsg / PongMsg for keepalive.
type PingMsg struct {
	Type string `json:"type"` // "ping"
}

// GenericMsg is used for initial JSON parsing to determine message type.
type GenericMsg struct {
	Type string `json:"type"`
	ID   string `json:"id,omitempty"`
}
