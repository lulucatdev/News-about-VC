import type { D1Database } from "@cloudflare/workers-types";
import { env } from "cloudflare:workers";

interface AppEnv {
  DB: D1Database;
}

export async function getEnv(): Promise<AppEnv> {
  return env as unknown as AppEnv;
}
