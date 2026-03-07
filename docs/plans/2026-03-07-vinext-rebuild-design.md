# VC Radar Vinext Rebuild Design

**Date**: 2026-03-07
**Status**: Approved

## Goal

Rebuild vc_radar as a vinext (Next.js on Vite) app deployed to Cloudflare Workers, with D1 database, TypeScript crawlers, and Cron-based auto-updating. 1:1 feature parity with current Python/static version. Update README after completion.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare Workers              │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌─────────────┐  │
│  │  Vinext   │   │ API Routes│   │ Cron Trigger│  │
│  │  (SSR)    │   │ /api/*   │   │ every 6h    │  │
│  │  renders  │   │ queries  │   │ crawl→D1    │  │
│  └────┬─────┘   └────┬─────┘   └──────┬──────┘  │
│       └──────────────┴─────────────────┘          │
│                      │                            │
│               ┌──────┴──────┐                     │
│               │     D1      │                     │
│               │   (SQLite)  │                     │
│               └─────────────┘                     │
└─────────────────────────────────────────────────┘
```

- **Framework**: vinext (Next.js 16 on Vite)
- **Runtime**: Cloudflare Workers
- **Database**: D1 (production) / local SQLite via Miniflare (dev)
- **Cron**: Workers Cron Trigger every 6 hours
- **Local dev**: `npm run dev` → Vite HMR + local D1

## Project Structure

```
vc-radar/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage (SSR, table + stats)
│   └── api/
│       ├── articles/route.ts   # GET articles with filter/search
│       └── refresh/route.ts    # POST trigger manual crawl
├── lib/
│   ├── crawlers/
│   │   ├── base.ts             # BaseCrawler (retry, delay, fetch)
│   │   ├── paul-graham.ts      # HTML scraping
│   │   ├── hacker-news.ts      # HTML scraping
│   │   ├── sam-altman.ts       # HTML scraping with pagination
│   │   ├── fred-wilson.ts      # RSS (avc.xyz/feed)
│   │   └── benedict-evans.ts   # RSS
│   ├── crawler-manager.ts      # Orchestrate crawlers, dedup, write D1
│   └── db.ts                   # D1 query helpers
├── worker/
│   └── scheduled.ts            # Cron handler
├── migrations/
│   └── 0001_init.sql           # Create articles table
├── scripts/
│   └── seed.ts                 # Import existing data.json into local D1
├── vite.config.ts
├── wrangler.jsonc
├── package.json
└── tsconfig.json
```

## D1 Schema

```sql
CREATE TABLE articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unique_id    TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  source       TEXT NOT NULL,
  publish_time TEXT,
  summary      TEXT DEFAULT '',
  sector       TEXT DEFAULT '',
  crawl_time   TEXT NOT NULL,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_source ON articles(source);
CREATE INDEX idx_publish_time ON articles(publish_time);
```

## Crawlers (Python → TypeScript)

5 crawlers ported from `vc_tracker/multi_crawler.py`:

| Crawler | Source | Method | TS Library |
|---------|--------|--------|------------|
| PaulGrahamCrawler | paulgraham.com/articles.html | HTML scraping | cheerio |
| HackerNewsCrawler | news.ycombinator.com | HTML scraping | cheerio |
| SamAltmanCrawler | blog.samaltman.com | HTML + pagination | cheerio |
| FredWilsonCrawler | avc.xyz/feed | RSS | rss-parser |
| BenedictEvansCrawler | ben-evans.com/.../rss | RSS | rss-parser |

Key porting notes:
- `requests` + `BeautifulSoup` → `fetch` + `cheerio`
- `feedparser` → `rss-parser`
- `ThreadPoolExecutor` → `Promise.allSettled()`
- `hashlib.md5` → `crypto.subtle.digest` or simple hash
- Rate limiting: sequential per-source, parallel across sources
- Retry: 3 attempts with exponential backoff
- Dedup: by unique_id (UNIQUE constraint) + title_cache in memory

## Data Flow

1. **Cron (every 6h)**: `scheduled.ts` → `crawler-manager.ts` → fetch 5 sources in parallel → dedup → `INSERT OR IGNORE INTO articles`
2. **SSR page load**: `page.tsx` → `SELECT * FROM articles ORDER BY publish_time DESC` → render table + stats
3. **Client filter/search**: fetch `/api/articles?source=X&q=Y` → `SELECT ... WHERE source=? AND title LIKE ?` → update UI
4. **Manual refresh**: POST `/api/refresh` → run crawlers → insert → return count

## Frontend (1:1 feature parity)

- Source stats cards (5 sources with counts)
- Data table (source dot, title link, date)
- Source dropdown filter
- Title search input
- Refresh button (calls /api/refresh, shows result)
- Notification bell (new articles since last visit, localStorage)
- Welcome modal (first visit, localStorage)
- Light theme with Bricolage Grotesque font
- Responsive design

## Local Dev Experience

```bash
npm run dev       # Vite dev server + local D1
npm run seed      # Import data.json → local D1
npm run crawl     # Manual crawl → local D1
npm run deploy    # vinext deploy to Cloudflare
```

## Deployment

- `vinext deploy` handles build + upload
- wrangler.jsonc configures D1 binding + Cron trigger
- D1 migrations applied via `wrangler d1 migrations apply`

## Post-build

- Update README.md to reflect new tech stack, setup instructions, and dev workflow
