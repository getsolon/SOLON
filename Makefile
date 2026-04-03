BINARY_NAME=solon
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS=-ldflags "-X main.version=$(VERSION)"
LLAMA_GO_DIR=third_party/llama-go

# CGO environment for llama.cpp integration
CGO_ENV=CGO_ENABLED=1 \
	CGO_CXXFLAGS="-std=c++17" \
	C_INCLUDE_PATH=$(PWD)/$(LLAMA_GO_DIR) \
	LIBRARY_PATH=$(PWD)/$(LLAMA_GO_DIR)

# macOS needs Metal + Accelerate frameworks and libomp (for -lgomp)
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
CGO_ENV += CGO_LDFLAGS="-lggml-metal -lggml-blas -framework Accelerate -framework Metal -framework Foundation -framework MetalKit"
endif

.PHONY: build build-dashboard build-llamacpp build-all test lint dev clean setup \
	build-sidecar build-desktop dev-desktop clean-desktop

# Build the binary (includes dashboard + llama.cpp)
build: build-dashboard build-llamacpp
	$(CGO_ENV) go build -tags llamacpp $(LDFLAGS) -o bin/$(BINARY_NAME) ./cmd/solon

# Build llama.cpp static library via llama-go
build-llamacpp:
	@if [ -d "$(LLAMA_GO_DIR)" ]; then \
		echo "Building llama.cpp via llama-go..."; \
		(cd $(LLAMA_GO_DIR) && CMAKE_ARGS="-DBUILD_SHARED_LIBS=OFF" make libbinding.a); \
		echo "Copying extra static libraries..."; \
		cp -f $(LLAMA_GO_DIR)/build/ggml/src/ggml-metal/libggml-metal.a $(LLAMA_GO_DIR)/ 2>/dev/null || true; \
		cp -f $(LLAMA_GO_DIR)/build/ggml/src/ggml-blas/libggml-blas.a $(LLAMA_GO_DIR)/ 2>/dev/null || true; \
		if [ "$(UNAME_S)" = "Darwin" ] && [ -f "/opt/homebrew/opt/libomp/lib/libomp.a" ]; then \
			ln -sf /opt/homebrew/opt/libomp/lib/libomp.a $(LLAMA_GO_DIR)/libgomp.a; \
		fi; \
	else \
		echo "Warning: $(LLAMA_GO_DIR) not found — skipping llama.cpp build"; \
		echo "Run: make setup"; \
	fi

# Build the React dashboard and copy to internal/dashboard/dist for go:embed
build-dashboard:
	cd dashboard && npm install && npm run build
	rm -rf internal/dashboard/dist
	cp -r dashboard/dist internal/dashboard/dist

# Build for all platforms
build-all: build-dashboard build-llamacpp
	GOOS=darwin GOARCH=arm64 $(CGO_ENV) go build -tags llamacpp $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-arm64 ./cmd/solon
	GOOS=darwin GOARCH=amd64 $(CGO_ENV) go build -tags llamacpp $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-amd64 ./cmd/solon
	GOOS=linux GOARCH=arm64 $(CGO_ENV) go build -tags llamacpp $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-arm64 ./cmd/solon
	GOOS=linux GOARCH=amd64 $(CGO_ENV) go build -tags llamacpp $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-amd64 ./cmd/solon

# Run all tests
test:
	$(CGO_ENV) go test -tags llamacpp ./... -v

# Run linter
lint:
	golangci-lint run ./...

# Build and run in development mode
dev: build
	./bin/$(BINARY_NAME) serve

# Initialize submodules and build dependencies (first-time setup)
setup:
	git submodule update --init --recursive
	$(MAKE) build-llamacpp

# Desktop app (Tauri)

# Detect target triple for sidecar naming
UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M),arm64)
TAURI_TARGET_TRIPLE := aarch64-apple-darwin
else
TAURI_TARGET_TRIPLE := x86_64-apple-darwin
endif

# Copy Go binary as Tauri sidecar
build-sidecar: build
	@mkdir -p desktop/src-tauri/bin
	cp bin/$(BINARY_NAME) desktop/src-tauri/bin/$(BINARY_NAME)-$(TAURI_TARGET_TRIPLE)

# Build desktop app (.dmg + .app)
build-desktop: build-sidecar
	cd desktop/src-tauri && cargo tauri build

# Run desktop app in dev mode
dev-desktop: build-sidecar
	cd desktop/src-tauri && cargo tauri dev

# Clean desktop build artifacts
clean-desktop:
	rm -f desktop/src-tauri/bin/solon-*
	rm -rf desktop/src-tauri/target

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf dashboard/dist/
	rm -rf dashboard/node_modules/
	rm -rf internal/dashboard/dist/
	@if [ -d "$(LLAMA_GO_DIR)" ]; then cd $(LLAMA_GO_DIR) && make clean 2>/dev/null || true; fi
