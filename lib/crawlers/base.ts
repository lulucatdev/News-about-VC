import type { CrawledArticle } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function generateUniqueId(
  title: string,
  url: string,
  source: string
): string {
  const str = `${title}_${url}_${source}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function parseRelativeTime(
  timeStr: string | null | undefined
): Date | null {
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
