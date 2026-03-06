/**
 * Seed local D1 database from existing data.json
 * Generates SQL INSERT statements and pipes them to wrangler d1 execute
 *
 * Usage: npx tsx scripts/seed.ts [path-to-data.json]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface OldArticle {
  title: string;
  url: string;
  source: string;
  publish_time: string | null;
  summary: string;
  sector: string;
  crawl_time: string;
  unique_id: string;
}

const dataPath =
  process.argv[2] ||
  resolve(__dirname, "../../vc_radar/static/data.json");

if (!existsSync(dataPath)) {
  console.error(`data.json not found at: ${dataPath}`);
  process.exit(1);
}

const raw = readFileSync(dataPath, "utf-8");
const articles: OldArticle[] = JSON.parse(raw);
console.log(`Loaded ${articles.length} articles from ${dataPath}`);

function escapeSql(s: string | null): string {
  if (s === null || s === undefined) return "NULL";
  return "'" + s.replace(/'/g, "''") + "'";
}

const statements = articles.map(
  (a) =>
    `INSERT OR IGNORE INTO articles (unique_id, title, url, source, publish_time, summary, sector, crawl_time) VALUES (${escapeSql(a.unique_id)}, ${escapeSql(a.title)}, ${escapeSql(a.url)}, ${escapeSql(a.source)}, ${escapeSql(a.publish_time)}, ${escapeSql(a.summary || "")}, ${escapeSql(a.sector || "")}, ${escapeSql(a.crawl_time)});`
);

const outPath = resolve(__dirname, "../migrations/seed.sql");
writeFileSync(outPath, statements.join("\n"), "utf-8");
console.log(`Written ${statements.length} INSERT statements to ${outPath}`);
console.log(`\nRun: npx wrangler d1 execute vc-radar-db --local --file=migrations/seed.sql`);
