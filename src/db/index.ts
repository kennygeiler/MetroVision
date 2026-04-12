import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { loadLocalEnv } from "./load-env";
import { resolveDatabaseUrlForNeon } from "./neon-connection-url";
import * as schema from "./schema";

loadLocalEnv();

const databaseUrl = resolveDatabaseUrlForNeon();

type DatabaseInstance = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __metrovisionDb?: DatabaseInstance;
};

export const db =
  globalForDb.__metrovisionDb ??
  drizzle(neon(databaseUrl), {
    schema,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__metrovisionDb = db;
}

export { schema };
