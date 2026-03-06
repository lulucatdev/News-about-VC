import { crawlAndStore } from "@/lib/crawlers";
import { getEnv } from "@/lib/env";

export async function POST() {
  try {
    const { DB } = await getEnv();
    const result = await crawlAndStore(DB, 50);
    return Response.json({
      success: true,
      message: `爬取完成，新增 ${result.inserted} 条`,
      total: result.total,
      inserted: result.inserted,
    });
  } catch (e) {
    return Response.json(
      { success: false, message: String(e) },
      { status: 500 }
    );
  }
}
