import type { TierDefinition } from "./types";

const HOURS_PER_MONTH = 730; // industry standard (365.25 * 24 / 12)

/** Format a tier's price for display. Returns e.g. "$5.49/hr" or "$49/mo" */
export function formatPrice(tier: TierDefinition): string {
  const dollars = tier.price / 100;
  if (tier.billing === "hourly") {
    return `$${dollars.toFixed(2)}/hr`;
  }
  return `$${Math.round(dollars)}/mo`;
}

/** Monthly estimate for any tier. Hourly tiers assume 100% uptime. */
export function monthlyEstimate(tier: TierDefinition): number {
  if (tier.billing === "hourly") {
    return (tier.price / 100) * HOURS_PER_MONTH;
  }
  return tier.price / 100;
}

/** Format monthly estimate for display. Returns e.g. "~$3,999/mo" */
export function formatMonthlyEstimate(tier: TierDefinition): string {
  const estimate = monthlyEstimate(tier);
  return `~$${Math.round(estimate).toLocaleString("en-US")}/mo`;
}

/** Full price label for a tier. E.g. "$5.49/hr (~$3,999/mo)" or "$49/mo" */
export function priceLabel(tier: TierDefinition): string {
  if (tier.billing === "hourly") {
    return `${formatPrice(tier)} (${formatMonthlyEstimate(tier)})`;
  }
  return formatPrice(tier);
}
