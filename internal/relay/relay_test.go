package relay

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateInstanceID(t *testing.T) {
	id, err := GenerateInstanceID()
	require.NoError(t, err)
	assert.Len(t, id, 24, "instance ID should be 24 hex chars")

	// Verify uniqueness
	id2, err := GenerateInstanceID()
	require.NoError(t, err)
	assert.NotEqual(t, id, id2, "two generated IDs should differ")
}

func TestRequestMsgJSON(t *testing.T) {
	msg := RequestMsg{
		Type:    "request",
		ID:      "req-1",
		Method:  "POST",
		Path:    "/v1/chat/completions",
		Headers: map[string]string{"Authorization": "Bearer sk-test"},
		Body:    `{"model":"llama3.2:3b"}`,
	}

	data, err := json.Marshal(msg)
	require.NoError(t, err)

	var decoded RequestMsg
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, msg, decoded)
}

func TestResponseMsgJSON(t *testing.T) {
	msg := ResponseMsg{
		Type:    "response",
		ID:      "req-1",
		Status:  200,
		Headers: map[string]string{"Content-Type": "application/json"},
		Body:    `{"choices":[]}`,
	}

	data, err := json.Marshal(msg)
	require.NoError(t, err)

	var decoded ResponseMsg
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, msg, decoded)
}

func TestStreamProtocolJSON(t *testing.T) {
	// Stream start
	start := StreamStartMsg{Type: "response_start", ID: "req-2", Status: 200}
	data, err := json.Marshal(start)
	require.NoError(t, err)
	assert.Contains(t, string(data), `"response_start"`)

	// Stream chunk
	chunk := StreamChunkMsg{Type: "response_chunk", ID: "req-2", Data: "data: {}\n\n"}
	data, err = json.Marshal(chunk)
	require.NoError(t, err)
	assert.Contains(t, string(data), `"response_chunk"`)

	// Stream end
	end := StreamEndMsg{Type: "response_end", ID: "req-2"}
	data, err = json.Marshal(end)
	require.NoError(t, err)
	assert.Contains(t, string(data), `"response_end"`)
}

func TestGenericMsgTypeDispatch(t *testing.T) {
	messages := []struct {
		json     string
		wantType string
		wantID   string
	}{
		{`{"type":"request","id":"r1"}`, "request", "r1"},
		{`{"type":"response","id":"r1"}`, "response", "r1"},
		{`{"type":"response_start","id":"r2"}`, "response_start", "r2"},
		{`{"type":"ping"}`, "ping", ""},
		{`{"type":"init"}`, "init", ""},
	}

	for _, tt := range messages {
		var msg GenericMsg
		err := json.Unmarshal([]byte(tt.json), &msg)
		require.NoError(t, err)
		assert.Equal(t, tt.wantType, msg.Type)
		assert.Equal(t, tt.wantID, msg.ID)
	}
}

func TestInitMsgJSON(t *testing.T) {
	msg := InitMsg{
		Type:       "init",
		InstanceID: "abc123def456abc123def456",
		Version:    "0.1.0",
	}

	data, err := json.Marshal(msg)
	require.NoError(t, err)

	var decoded InitMsg
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)
	assert.Equal(t, msg, decoded)
}
