import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const instances = sqliteTable("instances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  tier: text("tier", {
    enum: ["starter", "pro", "gpu", "gpu-a100", "gpu-h100", "gpu-h200"],
  }).notNull(),
  provider: text("provider", { enum: ["hetzner", "datacrunch"] })
    .notNull()
    .default("hetzner"),
  status: text("status", {
    enum: ["pending", "provisioning", "configuring", "running", "stopped", "failed", "deleted"],
  })
    .notNull()
    .default("pending"),
  providerServerId: text("provider_server_id"),
  ipv4: text("ipv4"),
  region: text("region").notNull().default("eu-central"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  deletedAt: text("deleted_at"),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  instanceId: text("instance_id")
    .notNull()
    .references(() => instances.id),
  provider: text("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const provisioningJobs = sqliteTable("provisioning_jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  instanceId: text("instance_id")
    .notNull()
    .references(() => instances.id),
  action: text("action", { enum: ["create", "delete"] }).notNull(),
  status: text("status", {
    enum: [
      "pending",
      "creating_server",
      "configuring_server",
      "completed",
      "failed",
    ],
  })
    .notNull()
    .default("pending"),
  logs: text("logs"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

// Type exports for convenience
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Instance = typeof instances.$inferSelect;
export type NewInstance = typeof instances.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ProvisioningJob = typeof provisioningJobs.$inferSelect;
export type NewProvisioningJob = typeof provisioningJobs.$inferInsert;
