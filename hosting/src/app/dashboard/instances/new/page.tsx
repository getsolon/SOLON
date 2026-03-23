"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$25/mo",
    specs: "2 vCPU / 4 GB RAM / 40 GB NVMe",
    description: "Development and small workloads",
    hasGpu: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49/mo",
    specs: "4 vCPU / 16 GB RAM / 80 GB NVMe",
    description: "Production workloads with higher throughput",
    hasGpu: false,
  },
  {
    id: "gpu",
    name: "GPU",
    price: "$299/mo",
    specs: "8 vCPU / 32 GB RAM / NVIDIA L4 / 160 GB NVMe",
    description: "Dedicated GPU for local inference",
    hasGpu: true,
  },
];

const regions = [
  { id: "eu-central", name: "EU Central", location: "Falkenstein, DE" },
  { id: "eu-west", name: "EU West", location: "Helsinki, FI" },
  { id: "us-east", name: "US East", location: "Ashburn, VA" },
];

export default function NewInstancePage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState("starter");
  const [selectedRegion, setSelectedRegion] = useState("eu-central");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const currentTier = tiers.find((t) => t.id === selectedTier);
  const needsApiKey = selectedTier !== "gpu";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // TODO: Wire to tRPC mutation
    console.log("Creating instance:", {
      name,
      tier: selectedTier,
      region: selectedRegion,
      apiKey: needsApiKey ? apiKey : undefined,
    });

    // Simulate creation delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Instance
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure and deploy a new Solon inference instance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Instance Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-900"
          >
            Instance Name
          </label>
          <p className="mt-1 text-sm text-gray-500">
            A unique name for your instance (lowercase letters, numbers, and hyphens).
          </p>
          <input
            id="name"
            type="text"
            required
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
          <p className="mt-1 text-sm text-gray-500">
            Select the compute tier for your instance.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tiers.map((tier) => (
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
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
          <p className="mt-1 text-sm text-gray-500">
            Choose the data center region closest to your users.
          </p>
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

        {/* NVIDIA API Key (for cloud tiers) */}
        {needsApiKey && (
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-900"
            >
              NVIDIA API Key
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Required for cloud inference routing on Starter and Pro tiers.
              Your key is encrypted at rest.
            </p>
            <input
              id="apiKey"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
              placeholder="nvapi-..."
            />
          </div>
        )}

        {/* Summary */}
        {currentTier && (
          <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Tier</dt>
                <dd className="font-medium text-gray-900">{currentTier.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Specs</dt>
                <dd className="font-medium text-gray-900 font-mono text-xs">{currentTier.specs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Region</dt>
                <dd className="font-medium text-gray-900">
                  {regions.find((r) => r.id === selectedRegion)?.name}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="font-medium text-gray-900">Monthly Cost</dt>
                <dd className="font-semibold text-indigo-600">
                  {currentTier.price}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !name}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Create Instance"}
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
    </div>
  );
}
