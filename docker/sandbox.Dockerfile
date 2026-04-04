# solon/sandbox — Playwright-ready base image for sandboxes
# Published to ghcr.io/theodorthirtyseven37/solon-sandbox:latest
FROM node:22-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      chromium fonts-liberation libgbm1 libnss3 libxss1 libasound2 \
      ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g playwright && \
    echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium' >> /etc/profile.d/playwright.sh

LABEL org.opencontainers.image.source="https://github.com/theodorthirtyseven37/SOLON"
LABEL org.opencontainers.image.description="Solon sandbox base image with Chromium and Playwright"
