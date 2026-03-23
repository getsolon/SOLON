"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Placeholder data for a single instance
const instance = {
  id: "inst_1",
  name: "production-api",
  tier: "Pro",
  status: "running" as const,
  ipv4: "65.108.42.115",
  region: "eu-central",
  hetznerServerId: "48291573",
  createdAt: "2026-03-15T10:30:00Z",
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  provisioning: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  pending: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  stopped: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const logs = [
  { time: "2026-03-15 10:30:05", message: "Provisioning job created" },
  { time: "2026-03-15 10:30:12", message: "Terraform init completed" },
  { time: "2026-03-15 10:30:45", message: "Terraform apply: creating hcloud_server..." },
  { time: "2026-03-15 10:32:18", message: "Terraform apply: server created (id: 48291573)" },
  { time: "2026-03-15 10:32:25", message: "Waiting for SSH availability..." },
  { time: "2026-03-15 10:33:01", message: "Ansible playbook started: solon-setup.yml" },
  { time: "2026-03-15 10:34:42", message: "Ansible: Docker installed and configured" },
  { time: "2026-03-15 10:35:10", message: "Ansible: Solon container deployed" },
  { time: "2026-03-15 10:35:28", message: "Ansible: Caddy reverse proxy configured" },
  { time: "2026-03-15 10:35:35", message: "Provisioning completed successfully" },
];

export default function InstanceDetailPage() {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = statusColors[instance.status] || statusColors.pending;

  function handleDelete() {
    setDeleting(true);
    // TODO: Wire to tRPC mutation
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

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
            {instance.tier} tier in {instance.region}
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
        {/* Instance Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Info */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Connection Info
            </h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  IPv4 Address
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                    {instance.ipv4}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(instance.ipv4)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy IP"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Solon API Endpoint
                </dt>
                <dd className="mt-1">
                  <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900">
                    https://{instance.ipv4}:443/v1
                  </code>
                </dd>
              </div>
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
            </dl>
          </div>

          {/* Provisioning Logs */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Provisioning Logs
            </h2>
            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg bg-gray-900 p-4">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex-shrink-0 text-gray-500">
                      {log.time}
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Instance ID</dt>
                <dd className="text-sm font-mono text-gray-900">
                  {instance.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Tier</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {instance.tier}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Region</dt>
                <dd className="text-sm text-gray-900">{instance.region}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Hetzner Server</dt>
                <dd className="text-sm font-mono text-gray-900">
                  {instance.hetznerServerId}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(instance.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-red-200">
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="mt-2 text-sm text-gray-500">
              Deleting an instance will destroy the server and all associated
              data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                Delete Instance
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-red-700">
                  Are you sure? This will permanently destroy the server.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
