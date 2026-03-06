import { RSSCrawler } from "./rss-crawler";

export class BenedictEvansCrawler extends RSSCrawler {
  constructor() {
    super(
      "Benedict Evans",
      "https://www.ben-evans.com",
      "https://www.ben-evans.com/benedictevans?format=rss"
    );
  }
}
