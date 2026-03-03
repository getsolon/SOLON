const INSTALL_SCRIPT = `#!/bin/sh
# Solon installer — https://getsolon.dev
# Usage: curl -fsSL https://getsolon.dev | sh
set -e

REPO="theodorthirtyseven37/SOLON"
INSTALL_DIR="\${SOLON_INSTALL_DIR:-/usr/local/bin}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Error: unsupported OS: $OS"
    exit 1
    ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Error: unsupported architecture: $ARCH"
    exit 1
    ;;
esac

echo "Solon installer"
echo "  OS:   $OS"
echo "  Arch: $ARCH"
echo ""

# Get latest release tag
echo "Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/\${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\\1/')

if [ -z "$TAG" ]; then
  echo "Error: could not determine latest release"
  exit 1
fi

echo "  Version: $TAG"

# Download binary and checksums
BINARY_NAME="solon-\${OS}-\${ARCH}"
DOWNLOAD_URL="https://github.com/\${REPO}/releases/download/\${TAG}/\${BINARY_NAME}"
CHECKSUMS_URL="https://github.com/\${REPO}/releases/download/\${TAG}/checksums.txt"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Downloading \${BINARY_NAME}..."
curl -fsSL -o "\${TMPDIR}/solon" "$DOWNLOAD_URL"
curl -fsSL -o "\${TMPDIR}/checksums.txt" "$CHECKSUMS_URL"

# Verify checksum
echo "Verifying checksum..."
EXPECTED=$(grep "\${BINARY_NAME}" "\${TMPDIR}/checksums.txt" | awk '{print $1}')

if [ -z "$EXPECTED" ]; then
  echo "Warning: checksum not found for \${BINARY_NAME}, skipping verification"
else
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "\${TMPDIR}/solon" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL=$(shasum -a 256 "\${TMPDIR}/solon" | awk '{print $1}')
  else
    echo "Warning: no sha256sum or shasum found, skipping verification"
    ACTUAL="$EXPECTED"
  fi

  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "Error: checksum mismatch"
    echo "  Expected: $EXPECTED"
    echo "  Actual:   $ACTUAL"
    exit 1
  fi
  echo "  Checksum verified."
fi

# Install
echo "Installing to \${INSTALL_DIR}/solon..."
chmod +x "\${TMPDIR}/solon"

if [ -w "$INSTALL_DIR" ]; then
  mv "\${TMPDIR}/solon" "\${INSTALL_DIR}/solon"
else
  sudo mv "\${TMPDIR}/solon" "\${INSTALL_DIR}/solon"
fi

echo ""
echo "Solon \${TAG} installed successfully!"
echo ""
echo "Get started:"
echo "  solon serve              # Start the server"
echo "  solon models pull llama3.2:3b  # Download a model"
echo "  solon keys create --name my-app  # Create an API key"
echo ""
echo "Dashboard: http://localhost:8420"
`;

export default {
  async fetch(): Promise<Response> {
    return new Response(INSTALL_SCRIPT, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
