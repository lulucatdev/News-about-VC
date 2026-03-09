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
  const params: (string | number)[] = [];

  if (opts?.source) {
    conditions.push("source = ?");
    params.push(opts.source);
  }
  if (opts?.search) {
    conditions.push("title LIKE ?");
    params.push(`%${opts.search}%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 500;

  const { results } = await db
    .prepare(
      `SELECT * FROM articles ${where} ORDER BY publish_time DESC LIMIT ?`
    )
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

export async function getLatestCrawlTime(
  db: D1Database
): Promise<string | null> {
  const row = await db
    .prepare("SELECT crawl_time FROM articles ORDER BY crawl_time DESC LIMIT 1")
    .first<{ crawl_time: string }>();
  return row?.crawl_time ?? null;
}
