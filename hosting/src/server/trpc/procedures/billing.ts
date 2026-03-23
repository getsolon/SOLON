import { router, protectedProcedure } from "../trpc";
import { createPortalSession as stripePortalSession } from "@/server/billing/stripe";

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Fetch subscription data from Stripe using the user's stripeCustomerId
    // For now, return placeholder data
    return {
      plan: "pro" as const,
      status: "active" as const,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      monthlyTotal: 4900, // cents
    };
  }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    // In production, look up the user's stripeCustomerId from the database
    const user = ctx.user;

    // TODO: Get stripeCustomerId from user record
    const stripeCustomerId = "cus_placeholder";

    const session = await stripePortalSession(stripeCustomerId);
    return { url: session.url };
  }),
});
