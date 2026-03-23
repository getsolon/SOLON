module github.com/openclaw/solon

go 1.25

require (
	github.com/bodaay/HuggingFaceModelDownloader v0.0.0-20260130185755-acc130e740c4
	github.com/go-chi/chi/v5 v5.1.0
	github.com/google/uuid v1.6.0
	github.com/mattn/go-sqlite3 v1.14.24
	github.com/spf13/cobra v1.8.1
	github.com/stretchr/testify v1.11.1
	github.com/tcpipuk/llama-go v0.0.0-20260129181358-7fbd22088492
	golang.org/x/crypto v0.47.0
)

require (
	github.com/coder/websocket v1.8.14 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	golang.org/x/net v0.49.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

// Use local submodule for llama-go (requires libbinding.a from 'make build-llamacpp')
replace github.com/tcpipuk/llama-go => ./third_party/llama-go
