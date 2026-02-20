# Solon — Vision & Positioning

## Mission

**Enable everyone to run their own AI, safely.**

Solon is named after the Athenian lawgiver who championed self-governance and fair access to civic institutions. Just as Solon gave Athenian citizens sovereignty over their governance, Solon gives users sovereignty over their AI infrastructure.

## Why Now

Four forces are converging to make self-hosted AI inevitable:

1. **Open-source models are good enough.** Llama 3, Mistral, Phi, Gemma — the gap between open and closed models shrinks every quarter. For most tasks, a local 8B parameter model is sufficient.

2. **Apple Silicon makes local inference viable.** The M-series unified memory architecture means a $999 MacBook can run a 7B model at 30+ tokens/second. No GPU required.

3. **Privacy is becoming law.** GDPR, CCPA, the EU AI Act — regulatory pressure is pushing organizations to keep data on-premises. Sending every prompt to OpenAI is becoming a liability.

4. **The security gap is dangerous.** 175,000+ Ollama instances are exposed to the internet without authentication. The current default path for self-hosted AI is a security disaster.

## Principles

### 1. Secure by Default
Auth is mandatory. There is no `--no-auth` flag, no `SOLON_DISABLE_AUTH=true`, no way to run without API keys. Every request is authenticated, logged, and rate-limited. Security is not a feature — it's the foundation.

### 2. One Binary
No Docker. No Python virtual environments. No dependency hell. Download one file, run it, you're serving AI. This is how software should work.

### 3. OpenAI-Compatible
Users shouldn't need new SDKs. Every OpenAI client library works with Solon out of the box. Change the base URL, add your Solon API key, and your existing code works.

### 4. Open-Source Core
The core product is MIT licensed and fully functional without paying anything. You can run Solon forever for free. Revenue comes from managed infrastructure and team features, not artificial limitations on the core product.

### 5. Works Alone, Works Together
Solon is useful on its own as a personal AI server. It's also the perfect inference backend for OpenClaw agents. Neither product requires the other, but together they form a complete sovereign AI stack.

## Relationship to OpenClaw

```
┌─────────────────────────────────────────────────┐
│                  OpenClaw                        │
│           (Agent Orchestration)                  │
│                                                  │
│  Agents → Tools → Models → ...where?             │
└────────────────────┬────────────────────────────┘
                     │
                     │  Provider Interface
                     │
┌────────────────────▼────────────────────────────┐
│                   Solon                          │
│            (Inference Runtime)                   │
│                                                  │
│  Gateway → Auth → Engine → llama.cpp → Response  │
└─────────────────────────────────────────────────┘
```

- **OpenClaw** is the agent layer — it orchestrates AI workflows, manages tools, and coordinates multi-step tasks.
- **Solon** is the inference layer — it runs models, authenticates requests, and serves completions.

Together: a fully self-hosted, self-governed AI stack. No cloud APIs required.

OpenClaw can use any provider (OpenAI, Anthropic, etc.), and Solon can serve any client (not just OpenClaw). They're complementary but independent.

## Market Opportunity

| Product | Local Inference | Auth | Remote Access | Dashboard | Single Binary |
|---------|:-:|:-:|:-:|:-:|:-:|
| **Ollama** | Yes | No | No | No | Yes |
| **LM Studio** | Yes | No | No | Yes (GUI) | No |
| **vLLM** | Yes | Optional | Manual | No | No |
| **LocalAI** | Yes | Optional | Manual | Basic | No |
| **Solon** | **Yes** | **Mandatory** | **Built-in** | **Yes** | **Yes** |

No product in the market combines all five. Solon is the first.

## Competitive Positioning

### vs. Ollama
Ollama made local inference accessible. Solon makes it safe. We fork Ollama's excellent model management and llama.cpp integration, then add everything it's missing: auth, tunnel, dashboard, analytics. Think of Solon as "Ollama for production."

### vs. LM Studio
LM Studio is a desktop app. Solon is a server. LM Studio is for experimenting with models in a GUI. Solon is for serving models via API with authentication and remote access.

### vs. vLLM / TGI
These are production inference servers for teams with DevOps. Solon is for everyone else — the developer who wants to `brew install` their way to a secure AI API.

### vs. Cloud APIs
Cloud APIs are the easiest path but the most expensive and least private. Solon is for users who want cloud-API simplicity with local-first sovereignty.

## 5-Year Vision

**Year 1**: Solon becomes the standard way to self-host AI models securely. 10,000+ active instances. Strong open-source community.

**Year 2**: Solon Relay becomes a revenue-generating product. Team features drive B2B adoption. MLX backend makes Apple Silicon the best platform for local AI.

**Year 3**: Multi-node clustering enables small teams to build GPU clusters. Fine-tuning support makes Solon a complete model lifecycle tool.

**Year 4**: Enterprise adoption accelerates. Solon becomes the default inference backend for organizations that can't use cloud APIs.

**Year 5**: Solon is to AI inference what nginx is to web serving — the standard, trusted, battle-tested way to serve AI models. Millions of instances worldwide.

## The Name

**Solon** (c. 630–560 BC) was an Athenian statesman and lawgiver. He:

- Gave citizens the right to self-governance
- Made the law accessible to everyone, not just elites
- Believed in fairness, transparency, and civic participation

Solon the product embodies these values:
- **Self-governance**: Run your own AI, on your own terms
- **Accessibility**: One command to install, one binary to run
- **Transparency**: Open-source core, audit logging, no black boxes
- **Fairness**: Free core product, no artificial limitations

*Your AI. Your rules.*
