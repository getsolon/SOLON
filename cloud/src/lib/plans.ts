export interface PlanLimits {
  instances: number
  members: number
  requestsPerMin: number
}

export const PLANS: Record<string, PlanLimits> = {
  free: {
    instances: 1,
    members: 1,
    requestsPerMin: 60,
  },
  pro: {
    instances: 10,
    members: 1,
    requestsPerMin: 300,
  },
  team: {
    instances: 50,
    members: 25,
    requestsPerMin: 1000,
  },
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan] || PLANS.free
}
