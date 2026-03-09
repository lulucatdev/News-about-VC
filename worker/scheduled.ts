import { crawlAndStore } from "../lib/crawlers";
import { getEnv } from "../lib/env";

export async function scheduled(
  _controller: ScheduledController,
  _env: unknown,
  ctx: ExecutionContext
) {
  ctx.waitUntil(
    (async () => {
      const { DB } = await getEnv();
      const result = await crawlAndStore(DB, 50);
      console.log(
        `Cron: crawled ${result.total}, inserted ${result.inserted}`
      );
    })()
  );
}
