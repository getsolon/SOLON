# solon/openclaw — OpenClaw agent runtime with gateway
# Published to ghcr.io/theodorthirtyseven37/solon-openclaw:latest
ARG BASE_IMAGE=ghcr.io/theodorthirtyseven37/solon-sandbox:latest
FROM ${BASE_IMAGE}

RUN npm install -g openclaw

# Pre-configure gateway auth
RUN mkdir -p /root/.openclaw && \
    printf '{"gateway":{"auth":{"mode":"token","token":"solon-openclaw-token"}}}' \
      > /root/.openclaw/openclaw.json

LABEL org.opencontainers.image.source="https://github.com/theodorthirtyseven37/SOLON"
LABEL org.opencontainers.image.description="Solon OpenClaw agent runtime with gateway"

CMD ["sleep", "infinity"]
