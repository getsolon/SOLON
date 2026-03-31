import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$25",
    period: "/mo",
    description: "Perfect for development and small workloads",
    features: [
      "2 vCPU / 4 GB RAM",
      "40 GB NVMe storage",
      "Solon inference server",
      "Tenant isolation",
      "Automatic TLS",
      "Basic monitoring",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For production workloads with higher throughput",
    features: [
      "4 vCPU / 16 GB RAM",
      "80 GB NVMe storage",
      "Solon inference server",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Priority monitoring",
      "Multi-model routing",
      "Request logging",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "GPU",
    price: "$299",
    period: "/mo",
    description: "Dedicated GPU for local inference with NVIDIA hardware",
    features: [
      "8 vCPU / 32 GB RAM",
      "NVIDIA L4 GPU",
      "160 GB NVMe storage",
      "Local + cloud inference",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Full monitoring suite",
      "Custom model deployment",
    ],
    cta: "Deploy GPU",
    highlighted: false,
  },
];

const features = [
  {
    title: "Autonomous Agents",
    description:
      "Deploy agents with tools, skills, and MCP connections. They research, write, analyze, and execute — not just respond.",
    icon: (
      <svg className="h-8 w-8 text-brand-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Your Model or Theirs",
    description:
      "Bring your own API key (Anthropic, OpenAI) or run open-source models locally on dedicated NVIDIA A100, H100, and H200 GPUs.",
    icon: (
      <svg className="h-8 w-8 text-brand-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "Dedicated & Secure",
    description:
      "Every instance runs on its own server. API keys encrypted at rest, automatic TLS, mandatory auth, firewall hardening.",
    icon: (
      <svg className="h-8 w-8 text-brand-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Channel Integrations",
    description:
      "Connect agents to WhatsApp, Telegram, Slack, and Discord from the dashboard. Your agents meet your users where they are.",
    icon: (
      <svg className="h-8 w-8 text-brand-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{filter: "drop-shadow(0 0 6px rgba(108, 99, 255, 0.4))"}}>
                <circle cx="14" cy="14" r="11" className="fill-brand" />
              </svg>
              <span className="text-xl font-extrabold tracking-tight text-brand">
                Solon
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Your AI.{" "}
              <span className="text-brand-light">Your rules.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Deploy AI agents on dedicated hardware. Bring your own API keys
              or run open-source models on NVIDIA GPUs. Connect to WhatsApp,
              Slack, and Telegram. No DevOps required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
              >
                Deploy in 5 Minutes
              </Link>
              <a
                href="#pricing"
                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Everything you need for AI agents
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From BYOK API access to dedicated GPU inference. Deploy in minutes, not months.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white p-6 shadow-sm border border-gray-100"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose the tier that fits your workload. Scale up anytime.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 ${
                  tier.highlighted
                    ? "bg-brand text-white ring-2 ring-brand-light shadow-xl scale-105"
                    : "bg-white text-gray-900 ring-1 ring-gray-200 shadow-sm"
                }`}
              >
                <h3
                  className={`text-lg font-semibold ${
                    tier.highlighted ? "text-white/80" : "text-brand-light"
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span
                    className={`text-sm ${
                      tier.highlighted ? "text-white/60" : "text-gray-500"
                    }`}
                  >
                    {tier.period}
                  </span>
                </div>
                <p
                  className={`mt-4 text-sm ${
                    tier.highlighted ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  {tier.description}
                </p>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className={`h-5 w-5 flex-shrink-0 ${
                          tier.highlighted ? "text-white/60" : "text-brand-light"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? "bg-white text-brand-light hover:bg-brand-light/10"
                      : "bg-brand text-white hover:opacity-90"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 28 28" fill="none" style={{filter: "drop-shadow(0 0 4px rgba(108, 99, 255, 0.3))"}}>
                <circle cx="14" cy="14" r="11" className="fill-brand" />
              </svg>
              <span className="text-sm font-medium text-gray-500">
                Solon
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Your AI. Your rules.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
