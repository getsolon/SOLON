# NemoClaw Managed Hosting - Personal Environment Variables
#
# SECURITY: Do NOT commit this file with real values to version control.
# Add this file to .gitignore or use environment variables instead:
#   export TF_VAR_hcloud_token="your-token-here"
#   export TF_VAR_ssh_public_key="ssh-ed25519 AAAA..."

# Hetzner Cloud API token (from https://console.hetzner.cloud)
# Note: This token is for the Cloud API only. The GEX44 dedicated server
# is managed via the separate Robot API (https://robot.hetzner.com).
hcloud_token = "REPLACE_WITH_YOUR_HCLOUD_API_TOKEN"

# SSH public key for server access
ssh_public_key = "REPLACE_WITH_YOUR_SSH_PUBLIC_KEY"
