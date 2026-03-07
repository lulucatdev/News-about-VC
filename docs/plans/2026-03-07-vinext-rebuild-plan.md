# VC Radar Vinext Rebuild - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild vc_radar as a vinext (Next.js 16 on Vite) app with D1, TS crawlers, and Workers Cron, maintaining 1:1 feature parity.

**Architecture:** Vinext SSR app on Cloudflare Workers. D1 (SQLite) for storage. 5 TypeScript crawlers replace Python ones. Workers Cron Trigger every 6h. Local dev via `npm run dev` with Miniflare.

**Tech Stack:** vinext, Next.js 16, Vite, Cloudflare Workers, D1, cheerio, rss-parser, TypeScript

---

## Task 1: Scaffold vinext project

**Files:**
- Create: `vc-radar-next/package.json`
- Create: `vc-radar-next/vite.config.ts`
- Create: `vc-radar-next/wrangler.jsonc`
- Create: `vc-radar-next/tsconfig.json`
- Create: `vc-radar-next/app/layout.tsx`
- Create: `vc-radar-next/app/page.tsx`

**Step 1: Create Next.js app and init vinext**

```bash
cd /Users/lucas/Developer/zihui
npx create-next-app@latest vc-radar-next --typescript --app --no-tailwind --no-eslint --no-src-dir --import-alias "@/*"
cd vc-radar-next
npx vinext init
```

Expected: vinext adds vite.config.ts, updates package.json with dev:vinext and build:vinext scripts.

**Step 2: Install dependencies**

```bash
npm install cheerio rss-parser
npm install -D wrangler @cloudflare/workers-types
```

**Step 3: Configure wrangler.jsonc**

Create `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "vc-radar",
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "vc-radar-db",
      "database_id": "local",
      "migrations_dir": "migrations"
    }
  ],
  "triggers": {
    "crons": ["0 */6 * * *"]
  }
}
```

**Step 4: Verify dev server starts**

```bash
npm run dev:vinext
```

Expected: Vite dev server starts, page renders at localhost.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold vinext project with D1 and wrangler config"
```

---

## Task 2: D1 schema and migration

**Files:**
- Create: `vc-radar-next/migrations/0001_init.sql`
- Create: `vc-radar-next/lib/db.ts`
- Test: `vc-radar-next/lib/__tests__/db.test.ts`

**Step 1: Write migration SQL**

Create `migrations/0001_init.sql`:
```sql
CREATE TABLE IF NOT EXISTS articles (
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

CREATE INDEX IF NOT EXISTS idx_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_publish_time ON articles(publish_time);
CREATE INDEX IF NOT EXISTS idx_unique_id ON articles(unique_id);
```

**Step 2: Apply migration locally**

```bash
npx wrangler d1 migrations apply vc-radar-db --local
```

Expected: Migration applied, local SQLite created in `.wrangler/state/`.

**Step 3: Write db.ts helper**

Create `lib/db.ts`:
```typescript
import type { D1Database } from "@cloudflare/workers-types";

export interface Article {
  id: number;
  unique_id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string | null;
  summary: string;
  sector: string;
  crawl_time: string;
  created_at: string;
}

export interface ArticleInsert {
  unique_id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string | null;
  summary: string;
  sector: string;
  crawl_time: string;
}

export async function getArticles(
  db: D1Database,
  opts?: { source?: string; search?: string; limit?: number }
): Promise<Article[]> {
  const conditions: string[] = [];
  const params: string[] = [];

  if (opts?.source) {
    conditions.push("source = ?");
    params.push(opts.source);
  }
  if (opts?.search) {
    conditions.push("title LIKE ?");
    params.push(`%${opts.search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 500;

  const { results } = await db
    .prepare(`SELECT * FROM articles ${where} ORDER BY publish_time DESC LIMIT ?`)
    .bind(...params, limit)
    .all<Article>();

  return results ?? [];
}

export async function getSourceCounts(
  db: D1Database
): Promise<Record<string, number>> {
  const { results } = await db
    .prepare("SELECT source, COUNT(*) as count FROM articles GROUP BY source")
    .all<{ source: string; count: number }>();

  const counts: Record<string, number> = {};
  for (const row of results ?? []) {
    counts[row.source] = row.count;
  }
  return counts;
}

export async function insertArticles(
  db: D1Database,
  articles: ArticleInsert[]
): Promise<number> {
  let inserted = 0;
  // D1 batch limit is 100 statements
  for (const article of articles) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO articles (unique_id, title, url, source, publish_time, summary, sector, crawl_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          article.unique_id,
          article.title,
          article.url,
          article.source,
          article.publish_time,
          article.summary,
          article.sector,
          article.crawl_time
        )
        .run();
      inserted++;
    } catch {
      // INSERT OR IGNORE handles duplicates
    }
  }
  return inserted;
}

export async function getTotalCount(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM articles")
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getLatestCrawlTime(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT crawl_time FROM articles ORDER BY crawl_time DESC LIMIT 1")
    .first<{ crawl_time: string }>();
  return row?.crawl_time ?? null;
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add D1 schema migration and db helper module"
```

---

## Task 3: Base crawler and utility functions

**Files:**
- Create: `vc-radar-next/lib/crawlers/types.ts`
- Create: `vc-radar-next/lib/crawlers/base.ts`
- Test: `vc-radar-next/lib/crawlers/__tests__/base.test.ts`

**Step 1: Write the test**

Create `lib/crawlers/__tests__/base.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateUniqueId, parseRelativeTime, stripHtml } from "../base";

describe("generateUniqueId", () => {
  it("returns deterministic hash", () => {
    const a = generateUniqueId("title", "url", "source");
    const b = generateUniqueId("title", "url", "source");
    expect(a).toBe(b);
  });

  it("differs for different input", () => {
    const a = generateUniqueId("A", "url", "source");
    const b = generateUniqueId("B", "url", "source");
    expect(a).not.toBe(b);
  });
});

describe("parseRelativeTime", () => {
  it("parses hours ago", () => {
    const result = parseRelativeTime("3 hours ago");
    expect(result).not.toBeNull();
    const diff = Date.now() - result!.getTime();
    expect(diff).toBeLessThan(4 * 3600 * 1000);
    expect(diff).toBeGreaterThan(2 * 3600 * 1000);
  });

  it("parses minutes ago", () => {
    const result = parseRelativeTime("30 minutes ago");
    expect(result).not.toBeNull();
  });

  it("parses days ago", () => {
    const result = parseRelativeTime("2 days ago");
    expect(result).not.toBeNull();
    const diffDays = (Date.now() - result!.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(1.5);
    expect(diffDays).toBeLessThan(2.5);
  });

  it("returns null for empty string", () => {
    expect(parseRelativeTime("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseRelativeTime(null as any)).toBeNull();
  });
});

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});
```

**Step 2: Install vitest and run test to verify it fails**

```bash
npm install -D vitest
npx vitest run lib/crawlers/__tests__/base.test.ts
```

Expected: FAIL — modules not found.

**Step 3: Write types.ts**

Create `lib/crawlers/types.ts`:
```typescript
export interface CrawledArticle {
  unique_id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string | null;
  summary: string;
  sector: string;
  crawl_time: string;
}
```

**Step 4: Write base.ts**

Create `lib/crawlers/base.ts`:
```typescript
import type { CrawledArticle } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function generateUniqueId(title: string, url: string, source: string): string {
  // Simple hash — crypto.subtle not available in all test envs, use djb2
  const str = `${title}_${url}_${source}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function parseRelativeTime(timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;

  const s = timeStr.toLowerCase().trim();
  const now = Date.now();

  const patterns: [RegExp, number][] = [
    [/(\d+)\s*minute/, 60 * 1000],
    [/(\d+)\s*hour/, 60 * 60 * 1000],
    [/(\d+)\s*day/, 24 * 60 * 60 * 1000],
    [/(\d+)\s*week/, 7 * 24 * 60 * 60 * 1000],
    [/(\d+)\s*month/, 30 * 24 * 60 * 60 * 1000],
  ];

  for (const [re, ms] of patterns) {
    const m = s.match(re);
    if (m) {
      return new Date(now - parseInt(m[1]) * ms);
    }
  }

  return null;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 500
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (res.ok) return res;
    } catch {
      // retry
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, delay * 2 ** i));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

export abstract class BaseCrawler {
  constructor(
    public readonly sourceName: string,
    public readonly baseUrl: string
  ) {}

  abstract crawl(maxItems?: number): Promise<CrawledArticle[]>;

  protected makeArticle(
    title: string,
    url: string,
    publishTime: string | null,
    summary = "",
    sector = ""
  ): CrawledArticle {
    return {
      unique_id: generateUniqueId(title, url, this.sourceName),
      title,
      url,
      source: this.sourceName,
      publish_time: publishTime,
      summary,
      sector,
      crawl_time: nowISO(),
    };
  }
}
```

**Step 5: Run tests**

```bash
npx vitest run lib/crawlers/__tests__/base.test.ts
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add base crawler with utility functions and tests"
```

---

## Task 4: Paul Graham crawler

**Files:**
- Create: `vc-radar-next/lib/crawlers/paul-graham.ts`
- Test: `vc-radar-next/lib/crawlers/__tests__/paul-graham.test.ts`

**Step 1: Write the test**

Create `lib/crawlers/__tests__/paul-graham.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { PaulGrahamCrawler } from "../paul-graham";

// Mock fetch with a minimal PG articles page
const MOCK_HTML = `
<html><body>
<table>
  <tr><td><a href="greatwork.html">How to Do Great Work</a></td></tr>
  <tr><td><a href="read.html">How to Read</a></td></tr>
  <tr><td><a href="articles.html">Articles</a></td></tr>
  <tr><td><a href="index.html">Home</a></td></tr>
</table>
</body></html>
`;

describe("PaulGrahamCrawler", () => {
  it("parses articles and skips navigation pages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_HTML),
    }));

    const crawler = new PaulGrahamCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("How to Do Great Work");
    expect(articles[0].url).toBe("https://paulgraham.com/greatwork.html");
    expect(articles[0].source).toBe("Paul Graham");
    expect(articles[1].title).toBe("How to Read");

    vi.restoreAllMocks();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/crawlers/__tests__/paul-graham.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement paul-graham.ts**

Create `lib/crawlers/paul-graham.ts`:
```typescript
import * as cheerio from "cheerio";
import { BaseCrawler } from "./base";
import { fetchWithRetry } from "./base";
import type { CrawledArticle } from "./types";

const SKIP_PAGES = new Set([
  "index.html", "articles.html", "books.html",
  "nac.html", "faq.html", "filter.html",
]);

export class PaulGrahamCrawler extends BaseCrawler {
  constructor() {
    super("Paul Graham", "https://paulgraham.com");
  }

  async crawl(maxItems = 50): Promise<CrawledArticle[]> {
    const res = await fetchWithRetry("https://paulgraham.com/articles.html");
    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: CrawledArticle[] = [];

    $("a[href$='.html']").each((_, el) => {
      if (articles.length >= maxItems) return false;

      const href = $(el).attr("href") ?? "";
      const title = $(el).text().trim();

      if (!title || !href || SKIP_PAGES.has(href)) return;

      const fullUrl = new URL(href, this.baseUrl).href;
      articles.push(
        this.makeArticle(title, fullUrl, new Date().toISOString(), "", "Startups & Investment")
      );
    });

    return articles;
  }
}
```

**Step 4: Run test**

```bash
npx vitest run lib/crawlers/__tests__/paul-graham.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Paul Graham crawler with tests"
```

---

## Task 5: Hacker News crawler

**Files:**
- Create: `vc-radar-next/lib/crawlers/hacker-news.ts`
- Test: `vc-radar-next/lib/crawlers/__tests__/hacker-news.test.ts`

**Step 1: Write the test**

Create `lib/crawlers/__tests__/hacker-news.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { HackerNewsCrawler } from "../hacker-news";

const MOCK_HTML = `
<html><body>
<table>
  <tr class="athing"><td class="title">
    <span class="titleline"><a href="https://example.com/ai">AI Breakthrough</a></span>
  </td></tr>
  <tr><td class="subtext">
    <span class="age" title="2026-03-06T12:00:00">2 hours ago</span>
  </td></tr>
  <tr class="athing"><td class="title">
    <span class="titleline"><a href="https://example.com/startup">Startup Raises $10M</a></span>
  </td></tr>
  <tr><td class="subtext">
    <span class="age" title="2026-03-06T10:00:00">4 hours ago</span>
  </td></tr>
</table>
</body></html>
`;

describe("HackerNewsCrawler", () => {
  it("parses articles with titles and sources", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_HTML),
    }));

    const crawler = new HackerNewsCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("AI Breakthrough");
    expect(articles[0].url).toBe("https://example.com/ai");
    expect(articles[0].source).toBe("Hacker News");
    expect(articles[1].title).toBe("Startup Raises $10M");

    vi.restoreAllMocks();
  });

  it("identifies sector from title keywords", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_HTML),
    }));

    const crawler = new HackerNewsCrawler();
    const articles = await crawler.crawl(50);

    expect(articles[0].sector).toBe("AI");
    expect(articles[1].sector).toBe("Startup");

    vi.restoreAllMocks();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/crawlers/__tests__/hacker-news.test.ts
```

**Step 3: Implement hacker-news.ts**

Create `lib/crawlers/hacker-news.ts`:
```typescript
import * as cheerio from "cheerio";
import { BaseCrawler, fetchWithRetry, parseRelativeTime } from "./base";
import type { CrawledArticle } from "./types";

const SECTOR_KEYWORDS: Record<string, string[]> = {
  AI: ["ai", "artificial intelligence", "machine learning", "ml", "chatgpt", "llm"],
  Programming: ["programming", "coding", "developer", "software", "github"],
  Startup: ["startup", "founder", "venture", "funding", "series", "investor"],
  Tech: ["tech", "technology", "app", "web", "cloud"],
};

function identifySector(title: string): string {
  const lower = title.toLowerCase();
  for (const [sector, words] of Object.entries(SECTOR_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return sector;
  }
  return "General";
}

export class HackerNewsCrawler extends BaseCrawler {
  constructor() {
    super("Hacker News", "https://news.ycombinator.com");
  }

  async crawl(maxItems = 50): Promise<CrawledArticle[]> {
    const res = await fetchWithRetry("https://news.ycombinator.com/");
    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: CrawledArticle[] = [];

    $("span.titleline").each((_, el) => {
      if (articles.length >= maxItems) return false;

      const link = $(el).find("a").first();
      const title = link.text().trim();
      let href = link.attr("href") ?? "";

      if (!title || !href) return;
      if (!href.startsWith("http")) {
        href = new URL(href, this.baseUrl).href;
      }

      // Find publish time from sibling row
      const row = $(el).closest("tr");
      const nextRow = row.next("tr");
      let publishTime = new Date().toISOString();

      const ageEl = nextRow.find("span.age");
      if (ageEl.length) {
        const titleAttr = ageEl.attr("title");
        if (titleAttr) {
          try {
            publishTime = new Date(titleAttr.replace(" ", "T")).toISOString();
          } catch {
            const parsed = parseRelativeTime(ageEl.text());
            if (parsed) publishTime = parsed.toISOString();
          }
        }
      }

      articles.push(
        this.makeArticle(title, href, publishTime, "", identifySector(title))
      );
    });

    return articles;
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run lib/crawlers/__tests__/hacker-news.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Hacker News crawler with sector detection and tests"
```

---

## Task 6: Sam Altman crawler

**Files:**
- Create: `vc-radar-next/lib/crawlers/sam-altman.ts`
- Test: `vc-radar-next/lib/crawlers/__tests__/sam-altman.test.ts`

**Step 1: Write the test**

Create `lib/crawlers/__tests__/sam-altman.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { SamAltmanCrawler } from "../sam-altman";

const MOCK_HTML = `
<html><body>
<article class="post">
  <h2><a href="/moores-law">Moore's Law for Everything</a></h2>
</article>
<article class="post">
  <h2><a href="/how-to-be-successful">How To Be Successful</a></h2>
</article>
<article class="post">
  <h2><a href="/moores-law">Moore's Law for Everything</a></h2>
</article>
</body></html>
`;

describe("SamAltmanCrawler", () => {
  it("parses articles and deduplicates by title", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_HTML),
    }));

    const crawler = new SamAltmanCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2); // deduped
    expect(articles[0].title).toBe("Moore's Law for Everything");
    expect(articles[0].url).toBe("https://blog.samaltman.com/moores-law");
    expect(articles[1].title).toBe("How To Be Successful");

    vi.restoreAllMocks();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/crawlers/__tests__/sam-altman.test.ts
```

**Step 3: Implement sam-altman.ts**

Create `lib/crawlers/sam-altman.ts`:
```typescript
import * as cheerio from "cheerio";
import { BaseCrawler, fetchWithRetry } from "./base";
import type { CrawledArticle } from "./types";

export class SamAltmanCrawler extends BaseCrawler {
  constructor() {
    super("Sam Altman", "https://blog.samaltman.com");
  }

  async crawl(maxItems = 50): Promise<CrawledArticle[]> {
    const articles: CrawledArticle[] = [];
    const seenTitles = new Set<string>();

    for (let page = 1; page <= 5 && articles.length < maxItems; page++) {
      const url = page === 1
        ? "https://blog.samaltman.com/"
        : `https://blog.samaltman.com/?page=${page}`;

      let res: Response;
      try {
        res = await fetchWithRetry(url);
      } catch {
        break;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const posts = $("article.post");

      if (posts.length === 0) break;

      posts.each((_, el) => {
        if (articles.length >= maxItems) return false;

        const link = $(el).find("h2 a[href]").first();
        const title = link.text().trim();
        const href = link.attr("href") ?? "";

        if (!title || !href || seenTitles.has(title)) return;
        seenTitles.add(title);

        const fullUrl = new URL(href, this.baseUrl).href;
        articles.push(
          this.makeArticle(title, fullUrl, new Date().toISOString(), "", "AI & Startups")
        );
      });

      // Check for next page
      const hasNext = $("a").filter((_, el) => /next|[>›]/i.test($(el).text())).length > 0;
      if (!hasNext) break;
    }

    return articles;
  }
}
```

**Step 4: Run test**

```bash
npx vitest run lib/crawlers/__tests__/sam-altman.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Sam Altman crawler with pagination and dedup"
```

---

## Task 7: RSS crawlers (Fred Wilson + Benedict Evans)

**Files:**
- Create: `vc-radar-next/lib/crawlers/rss-crawler.ts`
- Create: `vc-radar-next/lib/crawlers/fred-wilson.ts`
- Create: `vc-radar-next/lib/crawlers/benedict-evans.ts`
- Test: `vc-radar-next/lib/crawlers/__tests__/rss-crawler.test.ts`

**Step 1: Write the test**

Create `lib/crawlers/__tests__/rss-crawler.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { FredWilsonCrawler } from "../fred-wilson";
import { BenedictEvansCrawler } from "../benedict-evans";

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <item>
    <title>The Great Reset</title>
    <link>https://avc.xyz/the-great-reset</link>
    <pubDate>Mon, 04 Mar 2026 10:00:00 GMT</pubDate>
    <description>&lt;p&gt;Some &lt;b&gt;content&lt;/b&gt; here.&lt;/p&gt;</description>
  </item>
  <item>
    <title>AI and VC</title>
    <link>https://avc.xyz/ai-and-vc</link>
    <pubDate>Sun, 03 Mar 2026 08:00:00 GMT</pubDate>
    <description>Another post</description>
  </item>
</channel>
</rss>`;

describe("FredWilsonCrawler", () => {
  it("parses RSS feed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_RSS),
    }));

    const crawler = new FredWilsonCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("The Great Reset");
    expect(articles[0].source).toBe("Fred Wilson");
    expect(articles[0].summary).toBe("Some content here.");

    vi.restoreAllMocks();
  });
});

describe("BenedictEvansCrawler", () => {
  it("has correct source name", () => {
    const crawler = new BenedictEvansCrawler();
    expect(crawler.sourceName).toBe("Benedict Evans");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run lib/crawlers/__tests__/rss-crawler.test.ts
```

**Step 3: Implement rss-crawler.ts**

Create `lib/crawlers/rss-crawler.ts`:
```typescript
import RSSParser from "rss-parser";
import { BaseCrawler, stripHtml } from "./base";
import type { CrawledArticle } from "./types";

const parser = new RSSParser();

export class RSSCrawler extends BaseCrawler {
  constructor(
    sourceName: string,
    baseUrl: string,
    protected feedUrl: string
  ) {
    super(sourceName, baseUrl);
  }

  async crawl(maxItems = 50): Promise<CrawledArticle[]> {
    const feed = await parser.parseURL(this.feedUrl);
    const articles: CrawledArticle[] = [];

    for (const entry of feed.items.slice(0, maxItems)) {
      const title = entry.title?.trim();
      const url = entry.link;
      if (!title || !url) continue;

      const pubDate = entry.pubDate
        ? new Date(entry.pubDate).toISOString()
        : new Date().toISOString();

      const summary = stripHtml(entry.contentSnippet || entry.content || "").slice(0, 200);

      articles.push(
        this.makeArticle(title, url, pubDate, summary, "VC & Tech")
      );
    }

    return articles;
  }
}
```

**Step 4: Implement fred-wilson.ts and benedict-evans.ts**

Create `lib/crawlers/fred-wilson.ts`:
```typescript
import { RSSCrawler } from "./rss-crawler";

export class FredWilsonCrawler extends RSSCrawler {
  constructor() {
    super("Fred Wilson", "https://avc.xyz", "https://avc.xyz/feed");
  }
}
```

Create `lib/crawlers/benedict-evans.ts`:
```typescript
import { RSSCrawler } from "./rss-crawler";

export class BenedictEvansCrawler extends RSSCrawler {
  constructor() {
    super(
      "Benedict Evans",
      "https://www.ben-evans.com",
      "https://www.ben-evans.com/benedictevans?format=rss"
    );
  }
}
```

**Step 5: Run tests**

```bash
npx vitest run lib/crawlers/__tests__/rss-crawler.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add RSS crawlers for Fred Wilson and Benedict Evans"
```

---

## Task 8: Crawler manager

**Files:**
- Create: `vc-radar-next/lib/crawlers/crawler-manager.ts`
- Create: `vc-radar-next/lib/crawlers/index.ts`

**Step 1: Implement crawler-manager.ts**

Create `lib/crawlers/crawler-manager.ts`:
```typescript
import type { D1Database } from "@cloudflare/workers-types";
import type { CrawledArticle } from "./types";
import { PaulGrahamCrawler } from "./paul-graham";
import { HackerNewsCrawler } from "./hacker-news";
import { SamAltmanCrawler } from "./sam-altman";
import { FredWilsonCrawler } from "./fred-wilson";
import { BenedictEvansCrawler } from "./benedict-evans";
import { insertArticles } from "../db";

const crawlers = [
  new PaulGrahamCrawler(),
  new HackerNewsCrawler(),
  new SamAltmanCrawler(),
  new FredWilsonCrawler(),
  new BenedictEvansCrawler(),
];

export async function crawlAll(
  maxItemsPerSite = 50
): Promise<CrawledArticle[]> {
  const results = await Promise.allSettled(
    crawlers.map((c) => c.crawl(maxItemsPerSite))
  );

  const allArticles: CrawledArticle[] = [];
  const titleCache = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        const key = article.title.toLowerCase().trim();
        if (key.length > 5 && !titleCache.has(key)) {
          titleCache.add(key);
          allArticles.push(article);
        }
      }
    }
  }

  return allArticles;
}

export async function crawlAndStore(
  db: D1Database,
  maxItemsPerSite = 50
): Promise<{ total: number; inserted: number }> {
  const articles = await crawlAll(maxItemsPerSite);
  const inserted = await insertArticles(db, articles);
  return { total: articles.length, inserted };
}
```

**Step 2: Create index.ts barrel export**

Create `lib/crawlers/index.ts`:
```typescript
export { crawlAll, crawlAndStore } from "./crawler-manager";
export type { CrawledArticle } from "./types";
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add crawler manager with parallel execution and dedup"
```

---

## Task 9: API routes

**Files:**
- Create: `vc-radar-next/app/api/articles/route.ts`
- Create: `vc-radar-next/app/api/refresh/route.ts`

**Step 1: Implement GET /api/articles**

Create `app/api/articles/route.ts`:
```typescript
import { env } from "cloudflare:workers";
import { getArticles, getSourceCounts, getTotalCount, getLatestCrawlTime } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || undefined;
  const search = url.searchParams.get("q") || undefined;

  const [articles, counts, total, lastCrawl] = await Promise.all([
    getArticles(env.DB, { source, search }),
    getSourceCounts(env.DB),
    getTotalCount(env.DB),
    getLatestCrawlTime(env.DB),
  ]);

  return Response.json({ articles, counts, total, lastCrawl });
}
```

**Step 2: Implement POST /api/refresh**

Create `app/api/refresh/route.ts`:
```typescript
import { env } from "cloudflare:workers";
import { crawlAndStore } from "@/lib/crawlers";

export async function POST() {
  try {
    const result = await crawlAndStore(env.DB, 50);
    return Response.json({
      success: true,
      message: `爬取完成，新增 ${result.inserted} 条`,
      total: result.total,
      inserted: result.inserted,
    });
  } catch (e) {
    return Response.json(
      { success: false, message: String(e) },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add API routes for articles query and manual refresh"
```

---

## Task 10: Cron scheduled handler

**Files:**
- Create: `vc-radar-next/worker/scheduled.ts`
- Modify: `vc-radar-next/worker/index.ts` (if vinext generated one)

**Step 1: Implement scheduled.ts**

Create `worker/scheduled.ts`:
```typescript
import type { D1Database } from "@cloudflare/workers-types";
import { crawlAndStore } from "../lib/crawlers";

interface Env {
  DB: D1Database;
}

export async function scheduled(
  _controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
) {
  ctx.waitUntil(
    crawlAndStore(env.DB, 50).then((result) => {
      console.log(`Cron: crawled ${result.total}, inserted ${result.inserted}`);
    })
  );
}
```

**Step 2: Wire into worker entry**

Check if `worker/index.ts` exists from vinext init. If it does, add the `scheduled` export. If not, create it:

```typescript
// worker/index.ts
export { default } from "vinext/worker";
export { scheduled } from "./scheduled";
```

Note: The exact wiring depends on vinext's generated entry point. If vinext uses a different pattern, adapt accordingly — the key is exporting both the default fetch handler and the scheduled handler.

**Step 3: Test cron locally**

```bash
npm run dev:vinext
# In another terminal:
curl "http://localhost:3001/cdn-cgi/handler/scheduled"
```

Expected: Console output showing crawl results.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Workers Cron handler for scheduled crawling"
```

---

## Task 11: SSR homepage — page.tsx

**Files:**
- Modify: `vc-radar-next/app/layout.tsx`
- Modify: `vc-radar-next/app/page.tsx`
- Create: `vc-radar-next/app/globals.css`

**Step 1: Write layout.tsx**

Replace `app/layout.tsx`:
```tsx
import "./globals.css";

export const metadata = {
  title: "VC Radar",
  description: "VC & Tech news aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Write globals.css**

Create `app/globals.css` — copy the entire `<style>` content from the current `static/index.html` (lines 10-657) verbatim. This is the complete CSS for 1:1 parity.

**Step 3: Write page.tsx (server component)**

Replace `app/page.tsx`:
```tsx
import { env } from "cloudflare:workers";
import { getArticles, getSourceCounts, getTotalCount, getLatestCrawlTime } from "@/lib/db";
import { ClientApp } from "./client-app";

export default async function Home() {
  const [articles, counts, total, lastCrawl] = await Promise.all([
    getArticles(env.DB),
    getSourceCounts(env.DB),
    getTotalCount(env.DB),
    getLatestCrawlTime(env.DB),
  ]);

  return (
    <ClientApp
      initialArticles={articles}
      initialCounts={counts}
      initialTotal={total}
      initialLastCrawl={lastCrawl}
    />
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add SSR homepage layout with globals.css"
```

---

## Task 12: Client-side interactive app

**Files:**
- Create: `vc-radar-next/app/client-app.tsx`

**Step 1: Implement client-app.tsx**

Create `app/client-app.tsx` — this is the "use client" component that handles all interactive features. Port the entire `<script>` block from `static/index.html` into React state + JSX. Key mapping:

- `allData` → `useState<Article[]>(initialArticles)`
- `filterData()` → `useMemo` with source/search filters
- `refreshData()` → `fetch("/api/refresh")` then `fetch("/api/articles")`
- `updateStats()` → derived from counts prop + filtered data
- Notification bell → `useState` for `newArticles`, `localStorage` for last visit
- Welcome modal → `useState` + `localStorage` for `WELCOME_KEY`

```tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Article } from "@/lib/db";

// ... (full implementation follows the exact same logic as the current index.html JS,
//      translated to React hooks and JSX. All HTML structure stays identical.)
```

This file will be ~300-400 lines. The JSX structure must match the current HTML exactly — same class names, same element hierarchy, same data attributes. Port each section:

1. Nav bar with brand, bell, controls
2. Stats grid (6 cards)
3. Info bar
4. Table card with thead/tbody
5. Notification modal
6. Welcome modal
7. Footer

**Step 2: Verify the page renders**

```bash
npm run dev:vinext
```

Open browser. Expected: Page renders with the same visual design. Stats show 0 (empty DB).

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add client-side interactive app with all UI features"
```

---

## Task 13: Seed script

**Files:**
- Create: `vc-radar-next/scripts/seed.ts`
- Modify: `vc-radar-next/package.json` (add seed script)

**Step 1: Write seed.ts**

Create `scripts/seed.ts`:
```typescript
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Read existing data.json from the old project
const dataPath = process.argv[2] || "../vc_radar/static/data.json";
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log(`Seeding ${data.length} articles...`);

// Generate SQL INSERT statements
const statements: string[] = [];
for (const item of data) {
  const uniqueId = item.unique_id || "";
  const title = (item.title || "").replace(/'/g, "''");
  const url = (item.url || "").replace(/'/g, "''");
  const source = (item.source || "").replace(/'/g, "''");
  const publishTime = item.publish_time || "";
  const summary = (item.summary || "").replace(/'/g, "''");
  const sector = (item.sector || "").replace(/'/g, "''");
  const crawlTime = item.crawl_time || new Date().toISOString();

  statements.push(
    `INSERT OR IGNORE INTO articles (unique_id, title, url, source, publish_time, summary, sector, crawl_time) VALUES ('${uniqueId}', '${title}', '${url}', '${source}', '${publishTime}', '${summary}', '${sector}', '${crawlTime}');`
  );
}

// Write to temp file and execute
const { writeFileSync, unlinkSync } = require("node:fs");
const tmpFile = "/tmp/vc-radar-seed.sql";
writeFileSync(tmpFile, statements.join("\n"));

execSync(`npx wrangler d1 execute vc-radar-db --local --file=${tmpFile}`, {
  stdio: "inherit",
});

unlinkSync(tmpFile);
console.log(`Done! Seeded ${data.length} articles.`);
```

**Step 2: Add npm script**

Add to `package.json` scripts:
```json
"seed": "npx tsx scripts/seed.ts"
```

**Step 3: Test it**

```bash
npm run seed -- /Users/lucas/Developer/zihui/vc_radar/static/data.json
```

Expected: Articles imported into local D1.

**Step 4: Verify in dev**

```bash
npm run dev:vinext
```

Expected: Page shows seeded data.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add seed script to import existing data.json into local D1"
```

---

## Task 14: End-to-end verification

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Test local dev flow**

```bash
npm run dev:vinext
```

Verify:
- Page loads with seeded data
- Source filter works
- Search works
- Refresh button triggers /api/refresh and updates data
- Welcome modal shows on first visit (clear localStorage)
- Notification bell works

**Step 3: Test cron trigger locally**

```bash
curl -X POST "http://localhost:3001/cdn-cgi/handler/scheduled"
```

Expected: New articles crawled and inserted.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: e2e verification fixes"
```

---

## Task 15: Deploy to Cloudflare

**Step 1: Create production D1 database**

```bash
npx wrangler d1 create vc-radar-db
```

Copy the `database_id` from output into `wrangler.jsonc`.

**Step 2: Apply migrations to production**

```bash
npx wrangler d1 migrations apply vc-radar-db --remote
```

**Step 3: Deploy**

```bash
npx vinext deploy
```

Expected: Deployed to Cloudflare Workers.

**Step 4: Seed production (optional)**

```bash
npx wrangler d1 execute vc-radar-db --remote --file=/tmp/vc-radar-seed.sql
```

**Step 5: Verify production**

Visit the deployed URL. Confirm all features work.

**Step 6: Configure custom domain**

Point `vc.zihuichen.com` to the Workers deployment via Cloudflare dashboard.

**Step 7: Commit final config**

```bash
git add -A
git commit -m "chore: update wrangler.jsonc with production D1 database_id"
```

---

## Task 16: Update README

**Files:**
- Modify: `vc-radar-next/README.md`

**Step 1: Write README**

Replace README.md with:

```markdown
# VC Radar

VC & Tech news aggregator tracking 5 sources: Paul Graham, Hacker News, Sam Altman, Fred Wilson, Benedict Evans.

Built with [vinext](https://github.com/cloudflare/vinext) (Next.js on Vite) + Cloudflare Workers + D1.

## Development

```bash
npm install
npm run seed -- ../vc_radar/static/data.json   # import existing data
npm run dev                                      # start dev server
```

Open http://localhost:3001

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with local D1 |
| `npm run seed` | Import data.json into local D1 |
| `npm run build` | Production build |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm test` | Run tests |

## Architecture

- **Frontend**: Next.js SSR + client-side filtering
- **Backend**: Cloudflare Workers API routes
- **Database**: D1 (SQLite)
- **Crawlers**: 5 TypeScript crawlers (cheerio + rss-parser)
- **Scheduling**: Workers Cron Trigger (every 6 hours)

## Data Sources

| Source | URL | Method |
|--------|-----|--------|
| Paul Graham | paulgraham.com | HTML scraping |
| Hacker News | news.ycombinator.com | HTML scraping |
| Sam Altman | blog.samaltman.com | HTML scraping |
| Fred Wilson | avc.xyz/feed | RSS |
| Benedict Evans | ben-evans.com | RSS |

## Deployment

```bash
npx wrangler d1 create vc-radar-db       # one-time: create D1
npx wrangler d1 migrations apply vc-radar-db --remote  # apply schema
npx vinext deploy                          # deploy
```

## Product By Chen Zihui
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for vinext architecture"
```

---

**Plan complete and saved.**
