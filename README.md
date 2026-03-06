# VC Radar

VC & Tech news aggregator — tracks 5 sources: Paul Graham, Hacker News, Sam Altman, Fred Wilson, Benedict Evans.

Built with [vinext](https://github.com/cloudflare/vinext) (Next.js on Vite) + Cloudflare Workers + D1.

## Quick Start

```bash
npm install
npm run db:migrate        # Create local D1 tables
npm run db:seed:gen       # Generate seed SQL from existing data.json
npm run db:seed           # Import articles into local D1
npx vinext dev --port 3001  # Start dev server
```

Open http://localhost:3001

## Scripts

| Script | Description |
|--------|-------------|
| `npx vinext dev` | Dev server with HMR |
| `npx vinext build` | Production build |
| `npx vinext deploy` | Deploy to Cloudflare Workers |
| `npm run db:migrate` | Run D1 migration locally |
| `npm run db:seed:gen` | Generate seed.sql from data.json |
| `npm run db:seed` | Import seed.sql into local D1 |
| `npm test` | Run tests |

## Architecture

- **Frontend**: vinext (Next.js API on Vite), React 19, SSR + client hydration
- **Backend**: Cloudflare Workers, D1 (SQLite)
- **Crawlers**: 5 TypeScript crawlers (cheerio + rss-parser)
- **Scheduling**: Workers Cron Trigger every 6 hours
- **Dev**: Miniflare-backed local D1 via `wrangler getPlatformProxy()`

## Project Structure

```
app/
  layout.tsx          # Root layout (zh-CN, Google Fonts)
  page.tsx            # SSR server component (reads D1)
  client-app.tsx      # Client interactive UI (filter, search, refresh, notifications)
  globals.css         # All styles
  api/
    articles/route.ts # GET /api/articles
    refresh/route.ts  # POST /api/refresh (triggers crawl)
lib/
  db.ts               # D1 query helpers
  env.ts              # D1 binding accessor (dev/prod)
  crawlers/           # 5 crawlers + manager
worker/
  scheduled.ts        # Cron handler
migrations/
  0001_init.sql       # D1 schema
scripts/
  seed.ts             # Import data.json into local D1
```

## Product By Chen Zihui
