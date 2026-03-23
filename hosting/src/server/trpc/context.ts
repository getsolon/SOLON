import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { SessionUser } from "@/lib/types";

export interface Context {
  user: SessionUser | null;
  db: typeof db;
}

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  // Extract session from better-auth cookie/header
  // In production this would validate the session token via better-auth
  const sessionToken = opts.req.headers.get("cookie");

  let user: SessionUser | null = null;

  if (sessionToken) {
    // TODO: Validate session via better-auth
    // For now, this is a placeholder that will be wired up
    // once better-auth is configured
    try {
      // Example: const session = await auth.api.getSession({ headers: req.headers });
      // if (session?.user) {
      //   const dbUser = await db.query.users.findFirst({
      //     where: eq(users.id, session.user.id),
      //   });
      //   if (dbUser) {
      //     user = { id: dbUser.id, email: dbUser.email, name: dbUser.name };
      //   }
      // }
      void eq; // suppress unused import in skeleton
      void users;
    } catch {
      // Invalid session, user remains null
    }
  }

  return {
    user,
    db,
  };
}
