import * as cheerio from "cheerio";
import { BaseCrawler, fetchWithRetry } from "./base";
import type { CrawledArticle } from "./types";

const SKIP_PAGES = new Set([
  "index.html",
  "articles.html",
  "books.html",
  "nac.html",
  "faq.html",
  "filter.html",
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
        this.makeArticle(
          title,
          fullUrl,
          new Date().toISOString(),
          "",
          "Startups & Investment"
        )
      );
    });

    return articles;
  }
}
