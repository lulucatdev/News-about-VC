import {
  getArticles,
  getSourceCounts,
  getTotalCount,
  getLatestCrawlTime,
} from "@/lib/db";
import { getEnv } from "@/lib/env";
import ClientApp from "./client-app";

export default async function Home() {
  const { DB } = await getEnv();
  const [articles, counts, total, lastCrawl] = await Promise.all([
    getArticles(DB),
    getSourceCounts(DB),
    getTotalCount(DB),
    getLatestCrawlTime(DB),
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
