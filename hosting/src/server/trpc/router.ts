import { router } from "./trpc";
import { instancesRouter } from "./procedures/instances";
import { billingRouter } from "./procedures/billing";
import { authRouter } from "./procedures/auth";

export const appRouter = router({
  instances: instancesRouter,
  billing: billingRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
