import {
  getArticles,
  getSourceCounts,
  getTotalCount,
  getLatestCrawlTime,
} from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function GET(request: Request) {
  const { DB } = await getEnv();
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || undefined;
  const search = url.searchParams.get("q") || undefined;

  const [articles, counts, total, lastCrawl] = await Promise.all([
    getArticles(DB, { source, search }),
    getSourceCounts(DB),
    getTotalCount(DB),
    getLatestCrawlTime(DB),
  ]);

  return Response.json({ articles, counts, total, lastCrawl });
}
