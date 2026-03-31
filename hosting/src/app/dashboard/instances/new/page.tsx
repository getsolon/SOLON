"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

const managedTiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$29/mo",
    specs: "2 vCPU / 4 GB RAM / 40 GB NVMe",
    description: "Development and small workloads",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$59/mo",
    specs: "4 vCPU / 16 GB RAM / 80 GB NVMe",
    description: "Production workloads with higher throughput",
  },
  {
    id: "gpu",
    name: "GPU",
    price: "$349/mo",
    specs: "8 vCPU / 32 GB RAM / NVIDIA L4 / 160 GB NVMe",
    description: "Dedicated GPU for local inference",
  },
];

const regions = [
  { id: "eu-central", name: "EU Central", location: "Falkenstein, DE" },
  { id: "eu-west", name: "EU West", location: "Helsinki, FI" },
];

type Mode = "managed" | "self-managed";

export default function NewInstancePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("managed");
  const [selectedTier, setSelectedTier] = useState("starter");
  const [selectedRegion, setSelectedRegion] = useState("eu-central");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManagedSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api<{ checkout_url: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          tier: selectedTier,
          region: selectedRegion,
          name: name || undefined,
        }),
      });

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create checkout session");
      }
    }
  }

  async function handleSelfManagedSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api("/api/instances", {
        method: "POST",
        body: JSON.stringify({
          name,
          url: url.replace(/\/$/, ""),
          api_key: apiKey,
        }),
      });

      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to add instance");
      }
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Add Instance
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Deploy a managed instance or connect an existing one.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-8 flex gap-2 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setMode("managed")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "managed"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Deploy Managed
        </button>
        <button
          onClick={() => setMode("self-managed")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            mode === "self-managed"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Connect Existing
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "managed" ? (
        <form onSubmit={handleManagedSubmit} className="space-y-8">
          {/* Instance Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-900"
            >
              Instance Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="my-inference-server"
            />
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Tier
            </label>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {managedTiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    selectedTier === tier.id
                      ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {tier.name}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        selectedTier === tier.id
                          ? "text-indigo-600"
                          : "text-gray-500"
                      }`}
                    >
                      {tier.price}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 font-mono">
                    {tier.specs}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {tier.description}
                  </p>
                  {selectedTier === tier.id && (
                    <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Region Selection */}
          <div>
            <label
              htmlFor="region"
              className="block text-sm font-medium text-gray-900"
            >
              Region
            </label>
            <select
              id="region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name} ({region.location})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Redirecting to checkout..." : "Continue to Payment"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSelfManagedSubmit} className="space-y-6">
          <p className="text-sm text-gray-600">
            Connect an existing Solon instance running on your own hardware.
          </p>

          <div>
            <label
              htmlFor="sm-name"
              className="block text-sm font-medium text-gray-900"
            >
              Display Name
            </label>
            <input
              id="sm-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="My Solon Server"
            />
          </div>

          <div>
            <label
              htmlFor="sm-url"
              className="block text-sm font-medium text-gray-900"
            >
              Instance URL
            </label>
            <input
              id="sm-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
              placeholder="https://your-server.example.com"
            />
          </div>

          <div>
            <label
              htmlFor="sm-key"
              className="block text-sm font-medium text-gray-900"
            >
              API Key
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Your Solon API key (starts with sol_sk_). Encrypted at rest.
            </p>
            <input
              id="sm-key"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
              placeholder="sol_sk_live_..."
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || !name || !url || !apiKey}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Connecting..." : "Connect Instance"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
