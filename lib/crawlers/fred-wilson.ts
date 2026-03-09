import { RSSCrawler } from "./rss-crawler";

export class FredWilsonCrawler extends RSSCrawler {
  constructor() {
    super("Fred Wilson", "https://avc.xyz", "https://avc.xyz/feed");
  }
}
