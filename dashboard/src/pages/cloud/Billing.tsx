import { useState, useEffect } from 'react'
import { cloudAPI } from '../../api/cloud'
import TopBar from '../../components/TopBar'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import type { BillingInfo } from '../../api/types'

const plans = [
  { id: 'free', name: 'Free', price: '$0', instances: 2, requests: '10K', team: false },
  { id: 'pro', name: 'Pro', price: '$19', instances: 10, requests: '100K', team: false },
  { id: 'team', name: 'Team', price: '$49', instances: 50, requests: '500K', team: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', instances: -1, requests: 'Unlimited', team: true },
]

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text)]">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-hover)]">
        <div
          className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-[var(--red)]' : pct > 70 ? 'bg-yellow-500' : 'bg-brand-light'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Billing() {
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cloudAPI.getBilling().then(b => { setBilling(b); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <>
        <TopBar title="Billing" />
        <main className="p-4 lg:p-6">
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title="Billing" />
      <main className="p-4 lg:p-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-secondary)]">Current Plan</h3>
              <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{billing?.plan.toUpperCase()}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={billing?.status === 'active' ? 'green' : 'red'}>{billing?.status}</Badge>
                {billing?.current_period_end && (
                  <span className="text-xs text-[var(--text-tertiary)]">
                    Renews {new Date(billing.current_period_end).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {billing?.plan !== 'enterprise' && (
              <Button size="sm">Upgrade</Button>
            )}
          </div>
        </Card>

        {billing?.usage && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Usage This Period</h3>
            <div className="space-y-4">
              <UsageMeter label="Instances" used={billing.usage.instances.used} limit={billing.usage.instances.limit} />
              <UsageMeter label="API Requests" used={billing.usage.requests.used} limit={billing.usage.requests.limit} />
              <UsageMeter label="Team Members" used={billing.usage.team_members.used} limit={billing.usage.team_members.limit} />
            </div>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Available Plans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 ${
                  plan.id === billing?.plan
                    ? 'border-brand-light bg-[var(--bg-card)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)]'
                }`}
              >
                <h4 className="font-semibold text-[var(--text)]">{plan.name}</h4>
                <p className="mt-1 text-2xl font-bold text-[var(--text)]">
                  {plan.price}<span className="text-sm font-normal text-[var(--text-secondary)]">/mo</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
                  <li>{plan.instances === -1 ? 'Unlimited' : plan.instances} instances</li>
                  <li>{plan.requests} requests/mo</li>
                  <li>{plan.team ? 'Team collaboration' : 'Single user'}</li>
                </ul>
                {plan.id === billing?.plan ? (
                  <Badge variant="green" className="mt-3">Current</Badge>
                ) : (
                  <Button variant="secondary" size="sm" className="mt-3 w-full">
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Select'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {billing?.payment_method && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Payment Method</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 rounded border border-[var(--border)] bg-[var(--bg-input)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)] uppercase">
                  {billing.payment_method.type}
                </div>
                <div>
                  <p className="text-sm text-[var(--text)]">&bull;&bull;&bull;&bull; {billing.payment_method.last4}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Expires {billing.payment_method.exp}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm">Update</Button>
            </div>
          </Card>
        )}
      </main>
    </>
  )
}
