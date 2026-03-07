export interface CrawledArticle {
  unique_id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string | null;
  summary: string;
  sector: string;
  crawl_time: string;
}
