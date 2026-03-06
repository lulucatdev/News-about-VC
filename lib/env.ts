import type { D1Database } from "@cloudflare/workers-types";

interface AppEnv {
  DB: D1Database;
}

let _env: AppEnv | null = null;

export async function getEnv(): Promise<AppEnv> {
  if (_env) return _env;

  try {
    // Production: use cloudflare:workers native module
    const mod = await import("cloudflare:workers");
    _env = mod.env as AppEnv;
    return _env;
  } catch {
    // Dev: use wrangler's getPlatformProxy
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<AppEnv>();
    _env = proxy.env;
    return _env;
  }
}
