import * as cheerio from "cheerio";
import { BaseCrawler, fetchWithRetry, parseRelativeTime } from "./base";
import type { CrawledArticle } from "./types";

const SECTOR_KEYWORDS: Record<string, RegExp> = {
  AI: /\bai\b|artificial intelligence|machine learning|\bml\b|chatgpt|\bllm\b/i,
  Programming: /programming|coding|developer|software|github/i,
  Startup: /startup|founder|venture|funding|series [a-c]|investor/i,
  Tech: /\btech\b|technology|\bapp\b|\bweb\b|cloud/i,
};

function identifySector(title: string): string {
  for (const [sector, re] of Object.entries(SECTOR_KEYWORDS)) {
    if (re.test(title)) return sector;
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
            publishTime = new Date(
              titleAttr.replace(" ", "T")
            ).toISOString();
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
