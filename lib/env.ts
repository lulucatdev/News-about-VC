import type { D1Database } from "@cloudflare/workers-types";

interface AppEnv {
  DB: D1Database;
}

export async function getEnv(): Promise<AppEnv> {
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<AppEnv>();
  return proxy.env;
}
