import { router, publicProcedure, protectedProcedure } from "../trpc";

export const authRouter = router({
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return {
      user: ctx.user,
    };
  }),

  getUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
