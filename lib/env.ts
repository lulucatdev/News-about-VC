import { env } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";

interface AppEnv {
  DB: D1Database;
}

export async function getEnv(): Promise<AppEnv> {
  return env as unknown as AppEnv;
}
