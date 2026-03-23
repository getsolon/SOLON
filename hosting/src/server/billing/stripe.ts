import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

/**
 * Create a Stripe customer for a new user.
 */
export async function createCustomer(
  email: string,
  name: string
): Promise<Stripe.Customer> {
  return getStripe().customers.create({
    email,
    name,
    metadata: { platform: "nemoclaw" },
  });
}

/**
 * Create a subscription for a customer on a given price.
 * The priceId should correspond to the tier's Stripe Price.
 */
export async function createSubscription(
  customerId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });
}

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Create a Stripe Customer Portal session so the user can manage
 * their subscription, payment methods, and invoices.
 */
export async function createPortalSession(
  customerId: string
): Promise<Stripe.BillingPortal.Session> {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });
}

export { getStripe };
