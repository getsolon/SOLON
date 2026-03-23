"use client";

// Placeholder billing data
const subscription = {
  plan: "Pro",
  status: "active",
  currentPeriodEnd: "2026-04-15",
  monthlyTotal: 49,
  instances: [
    { name: "production-api", tier: "Pro", cost: 49 },
  ],
};

const invoices = [
  { id: "inv_001", date: "2026-03-01", amount: 49, status: "paid" },
  { id: "inv_002", date: "2026-02-01", amount: 49, status: "paid" },
  { id: "inv_003", date: "2026-01-01", amount: 25, status: "paid" },
];

export default function BillingPage() {
  async function handlePortalRedirect() {
    // TODO: Wire to tRPC mutation that creates a Stripe portal session
    console.log("Redirecting to Stripe customer portal...");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and payment details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Plan
              </h2>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                {subscription.status}
              </span>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${subscription.monthlyTotal}
                </span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Next billing date: {subscription.currentPeriodEnd}
              </p>
            </div>

            {/* Active instances */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">
                Active Instances
              </h3>
              <div className="mt-3 divide-y divide-gray-100">
                {subscription.instances.map((inst) => (
                  <div
                    key={inst.name}
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
                    <span className="text-sm font-medium text-gray-900">
                      ${inst.cost}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handlePortalRedirect}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Manage in Stripe
              </button>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Invoices
            </h2>
            <div className="mt-4">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Invoice
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 text-sm font-mono text-gray-900">
                        {invoice.id}
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {invoice.date}
                      </td>
                      <td className="py-3 text-sm font-medium text-gray-900">
                        ${invoice.amount}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Method
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gray-100">
                <span className="text-xs font-bold text-gray-500">VISA</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  **** **** **** 4242
                </p>
                <p className="text-xs text-gray-500">Expires 12/2027</p>
              </div>
            </div>
            <button
              onClick={handlePortalRedirect}
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Update Payment Method
            </button>
          </div>

          <div className="mt-6 rounded-xl bg-indigo-50 p-6">
            <h3 className="text-sm font-semibold text-indigo-900">
              Need more instances?
            </h3>
            <p className="mt-2 text-sm text-indigo-700">
              Each instance is billed separately based on its tier. Deploy as
              many as you need.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
