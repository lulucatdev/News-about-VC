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
