import RSSParser from "rss-parser";
import { BaseCrawler, fetchWithRetry, stripHtml } from "./base";
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
    const res = await fetchWithRetry(this.feedUrl);
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    const articles: CrawledArticle[] = [];

    for (const entry of feed.items.slice(0, maxItems)) {
      const title = entry.title?.trim();
      const url = entry.link;
      if (!title || !url) continue;

      const pubDate = entry.pubDate
        ? new Date(entry.pubDate).toISOString()
        : new Date().toISOString();

      const summary = stripHtml(
        entry.contentSnippet || entry.content || ""
      ).slice(0, 200);

      articles.push(
        this.makeArticle(title, url, pubDate, summary, "VC & Tech")
      );
    }

    return articles;
  }
}
