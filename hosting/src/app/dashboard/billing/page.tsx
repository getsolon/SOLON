"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BillingInfo } from "@/lib/types";

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const data = await api<BillingInfo>("/api/billing");
        setBilling(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load billing info");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBilling();
  }, []);

  async function handlePortalRedirect() {
    setPortalLoading(true);
    try {
      const data = await api<{ portal_url: string }>("/api/billing/portal", {
        method: "POST",
      });
      window.location.href = data.portal_url;
    } catch (err) {
      setPortalLoading(false);
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !billing) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and payment details.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Plan
              </h2>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                {billing?.status || "active"}
              </span>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 capitalize">
                  {billing?.plan || "free"}
                </span>
              </div>
            </div>

            {/* Usage */}
            {billing?.usage && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium text-gray-900">Usage</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Instances</span>
                  <span className="text-gray-900">
                    {billing.usage.instances.used} /{" "}
                    {billing.usage.instances.limit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Team Members</span>
                  <span className="text-gray-900">
                    {billing.usage.team_members.used} /{" "}
                    {billing.usage.team_members.limit}
                  </span>
                </div>
              </div>
            )}

            {/* Managed Instances */}
            {billing?.managed_instances &&
              billing.managed_instances.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900">
                    Managed Instances
                  </h3>
                  <div className="mt-3 divide-y divide-gray-100">
                    {billing.managed_instances.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {inst.name}
                          </span>
                          <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {inst.tier}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 capitalize">
                          {inst.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handlePortalRedirect}
                disabled={portalLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {portalLoading ? "Opening..." : "Manage in Stripe"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl bg-indigo-50 p-6">
            <h3 className="text-sm font-semibold text-indigo-900">
              Need more instances?
            </h3>
            <p className="mt-2 text-sm text-indigo-700">
              Each managed instance is billed separately based on its tier.
              Deploy as many as you need.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
