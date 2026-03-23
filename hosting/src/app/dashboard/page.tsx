"use client";

import Link from "next/link";

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  provisioning: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  pending: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  stopped: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

// Placeholder data
const instances = [
  {
    id: "inst_1",
    name: "production-api",
    tier: "Pro",
    status: "running",
    ipv4: "65.108.42.115",
    region: "eu-central",
    createdAt: "2026-03-15",
  },
  {
    id: "inst_2",
    name: "staging-server",
    tier: "Starter",
    status: "running",
    ipv4: "95.217.163.88",
    region: "eu-central",
    createdAt: "2026-03-18",
  },
  {
    id: "inst_3",
    name: "ml-inference-gpu",
    tier: "GPU",
    status: "provisioning",
    ipv4: null,
    region: "eu-central",
    createdAt: "2026-03-20",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instances</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your Solon inference instances
          </p>
        </div>
        <Link
          href="/dashboard/instances/new"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          New Instance
        </Link>
      </div>

      {instances.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12">
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No instances yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Deploy your first Solon instance to get started.
          </p>
          <Link
            href="/dashboard/instances/new"
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Create Instance
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instances.map((instance) => {
                const status = statusColors[instance.status] || statusColors.pending;
                return (
                  <tr key={instance.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {instance.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                        {instance.tier}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {instance.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 font-mono">
                      {instance.ipv4 || "--"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {instance.region}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {instance.createdAt}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/instances/${instance.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
