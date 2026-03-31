"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api, ApiError } from "@/lib/api";
import type { Instance, ManagedInstance } from "@/lib/types";

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  online: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  provisioning: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  pending: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  stopped: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  offline: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  suspended: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

type DetailData = {
  id: string;
  name: string;
  tier: string;
  status: string;
  ipv4: string | null;
  region: string | null;
  url: string | null;
  createdAt: string;
  type: "self-managed" | "managed";
};

function InstanceDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "managed";

  const [instance, setInstance] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      router.replace("/dashboard");
      return;
    }

    async function fetchInstance() {
      try {
        if (type === "self-managed") {
          const data = await api<Instance>(`/api/instances/${id}`);
          setInstance({
            id: data.id,
            name: data.name,
            tier: "Self-managed",
            status: data.status,
            ipv4: null,
            region: null,
            url: data.url,
            createdAt: data.added_at,
            type: "self-managed",
          });
        } else {
          const billing = await api<{ instances: ManagedInstance[] }>(
            "/api/billing/managed",
          );
          const managed = billing.instances.find((i) => i.id === id);
          if (!managed) throw new ApiError(404, "Instance not found");
          setInstance({
            id: managed.id,
            name: managed.name,
            tier: managed.tier,
            status: managed.status,
            ipv4: managed.ipv4,
            region: managed.region,
            url: managed.dashboard_url,
            createdAt: managed.created_at,
            type: "managed",
          });
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load instance");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchInstance();
  }, [id, type, router]);

  async function handleDelete() {
    if (!id || !instance) return;
    setDeleting(true);
    try {
      if (instance.type === "self-managed") {
        await api(`/api/instances/${id}`, { method: "DELETE" });
      }
      router.push("/dashboard");
    } catch (err) {
      setDeleting(false);
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-transparent" />
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error || "Instance not found"}
      </div>
    );
  }

  const status = statusColors[instance.status] || statusColors.pending;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {instance.name}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {instance.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {instance.tier} {instance.region ? `in ${instance.region}` : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Instances
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-white p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Connection Info
            </h2>
            <dl className="mt-4 space-y-4">
              {instance.ipv4 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    IPv4 Address
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                      {instance.ipv4}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(instance.ipv4!)
                      }
                      className="text-gray-400 hover:text-gray-600"
                      title="Copy IP"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                        />
                      </svg>
                    </button>
                  </dd>
                </div>
              )}
              {instance.url && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    {instance.type === "self-managed"
                      ? "Instance URL"
                      : "Solon API Endpoint"}
                  </dt>
                  <dd className="mt-1">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                      {instance.url}
                    </code>
                  </dd>
                </div>
              )}
              {instance.ipv4 && instance.type === "managed" && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    SSH Access
                  </dt>
                  <dd className="mt-1">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                      ssh root@{instance.ipv4}
                    </code>
                  </dd>
                </div>
              )}
              {!instance.ipv4 && !instance.url && (
                <p className="text-sm text-gray-500">
                  Connection details will be available once the instance is
                  running.
                </p>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Instance ID</dt>
                <dd className="text-sm font-mono text-gray-900 truncate ml-2 max-w-[140px]">
                  {instance.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900 capitalize">
                  {instance.tier}
                </dd>
              </div>
              {instance.region && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Region</dt>
                  <dd className="text-sm text-gray-900">{instance.region}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(instance.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-red-200">
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="mt-2 text-sm text-gray-500">
              {instance.type === "managed"
                ? "Cancel your subscription through Stripe to remove this instance."
                : "Removing this instance will disconnect it from your Solon account."}
            </p>
            {instance.type === "self-managed" && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-4 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                  >
                    Remove Instance
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-red-700">
                      Are you sure?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deleting ? "Removing..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstanceDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center pt-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-transparent" />
        </div>
      }
    >
      <InstanceDetail />
    </Suspense>
  );
}
