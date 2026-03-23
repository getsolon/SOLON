import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { instances, provisioningJobs } from "@/server/db/schema";

export const instancesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userInstances = await ctx.db.query.instances.findMany({
      where: and(
        eq(instances.userId, ctx.user.id),
        ne(instances.status, "deleted")
      ),
      orderBy: (instances, { desc }) => [desc(instances.createdAt)],
    });
    return userInstances;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const instance = await ctx.db.query.instances.findFirst({
        where: and(
          eq(instances.id, input.id),
          eq(instances.userId, ctx.user.id)
        ),
      });

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instance not found.",
        });
      }

      return instance;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
        tier: z.enum(["starter", "pro", "gpu"]),
        region: z.enum(["eu-central", "eu-west", "us-east"]),
        apiKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Cloud tiers require an API key
      if (input.tier !== "gpu" && !input.apiKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An NVIDIA API key is required for Starter and Pro tiers.",
        });
      }

      // Create the instance record
      const [instance] = await ctx.db
        .insert(instances)
        .values({
          userId: ctx.user.id,
          name: input.name,
          tier: input.tier,
          region: input.region,
          status: "pending",
        })
        .returning();

      // Create a provisioning job
      await ctx.db.insert(provisioningJobs).values({
        instanceId: instance.id,
        action: "create",
        status: "pending",
      });

      // TODO: If apiKey provided, encrypt and store in apiKeys table

      return instance;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const instance = await ctx.db.query.instances.findFirst({
        where: and(
          eq(instances.id, input.id),
          eq(instances.userId, ctx.user.id)
        ),
      });

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Instance not found.",
        });
      }

      if (instance.status === "deleted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Instance is already deleted.",
        });
      }

      // Soft-delete the instance
      await ctx.db
        .update(instances)
        .set({
          status: "deleted",
          deletedAt: new Date().toISOString(),
        })
        .where(eq(instances.id, input.id));

      // Create a delete provisioning job
      await ctx.db.insert(provisioningJobs).values({
        instanceId: instance.id,
        action: "delete",
        status: "pending",
      });

      return { success: true };
    }),
});
