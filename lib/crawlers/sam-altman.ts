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
      const url =
        page === 1
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
          this.makeArticle(
            title,
            fullUrl,
            new Date().toISOString(),
            "",
            "AI & Startups"
          )
        );
      });

      // Check for next page
      const hasNext =
        $("a")
          .filter((_, el) => /next|[>›]/i.test($(el).text()))
          .length > 0;
      if (!hasNext) break;
    }

    return articles;
  }
}
