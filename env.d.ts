interface CloudflareEnv {
  DB: D1Database;
}

declare namespace Cloudflare {
  interface Env extends CloudflareEnv {}
}
