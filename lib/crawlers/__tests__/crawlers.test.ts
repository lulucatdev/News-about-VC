import { describe, it, expect, vi } from "vitest";
import { PaulGrahamCrawler } from "../paul-graham";
import { HackerNewsCrawler } from "../hacker-news";
import { SamAltmanCrawler } from "../sam-altman";
import { FredWilsonCrawler } from "../fred-wilson";
import { BenedictEvansCrawler } from "../benedict-evans";

// ===== Paul Graham =====
const PG_HTML = `
<html><body>
<table>
  <tr><td><a href="greatwork.html">How to Do Great Work</a></td></tr>
  <tr><td><a href="read.html">How to Read</a></td></tr>
  <tr><td><a href="articles.html">Articles</a></td></tr>
  <tr><td><a href="index.html">Home</a></td></tr>
</table>
</body></html>
`;

describe("PaulGrahamCrawler", () => {
  it("parses articles and skips navigation pages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(PG_HTML),
      })
    );

    const crawler = new PaulGrahamCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("How to Do Great Work");
    expect(articles[0].url).toBe("https://paulgraham.com/greatwork.html");
    expect(articles[0].source).toBe("Paul Graham");
    expect(articles[1].title).toBe("How to Read");

    vi.restoreAllMocks();
  });
});

// ===== Hacker News =====
const HN_HTML = `
<html><body>
<table>
  <tr class="athing"><td class="title">
    <span class="titleline"><a href="https://example.com/ai">AI Breakthrough</a></span>
  </td></tr>
  <tr><td class="subtext">
    <span class="age" title="2026-03-06T12:00:00">2 hours ago</span>
  </td></tr>
  <tr class="athing"><td class="title">
    <span class="titleline"><a href="https://example.com/startup">Startup Raises $10M</a></span>
  </td></tr>
  <tr><td class="subtext">
    <span class="age" title="2026-03-06T10:00:00">4 hours ago</span>
  </td></tr>
</table>
</body></html>
`;

describe("HackerNewsCrawler", () => {
  it("parses articles with sector detection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(HN_HTML),
      })
    );

    const crawler = new HackerNewsCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("AI Breakthrough");
    expect(articles[0].source).toBe("Hacker News");
    expect(articles[0].sector).toBe("AI");
    expect(articles[1].sector).toBe("Startup");

    vi.restoreAllMocks();
  });
});

// ===== Sam Altman =====
const SA_HTML = `
<html><body>
<article class="post">
  <h2><a href="/moores-law">Moore's Law for Everything</a></h2>
</article>
<article class="post">
  <h2><a href="/how-to-be-successful">How To Be Successful</a></h2>
</article>
<article class="post">
  <h2><a href="/moores-law">Moore's Law for Everything</a></h2>
</article>
</body></html>
`;

describe("SamAltmanCrawler", () => {
  it("parses articles and deduplicates by title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SA_HTML),
      })
    );

    const crawler = new SamAltmanCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("Moore's Law for Everything");
    expect(articles[0].url).toBe(
      "https://blog.samaltman.com/moores-law"
    );
    expect(articles[1].title).toBe("How To Be Successful");

    vi.restoreAllMocks();
  });
});

// ===== RSS Crawlers =====
const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <item>
    <title>The Great Reset</title>
    <link>https://avc.xyz/the-great-reset</link>
    <pubDate>Mon, 04 Mar 2026 10:00:00 GMT</pubDate>
    <description>&lt;p&gt;Some &lt;b&gt;content&lt;/b&gt; here.&lt;/p&gt;</description>
  </item>
  <item>
    <title>AI and VC</title>
    <link>https://avc.xyz/ai-and-vc</link>
    <pubDate>Sun, 03 Mar 2026 08:00:00 GMT</pubDate>
    <description>Another post</description>
  </item>
</channel>
</rss>`;

describe("FredWilsonCrawler", () => {
  it("parses RSS feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RSS),
        headers: new Headers({ "content-type": "application/rss+xml" }),
      })
    );

    const crawler = new FredWilsonCrawler();
    const articles = await crawler.crawl(50);

    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("The Great Reset");
    expect(articles[0].source).toBe("Fred Wilson");
    expect(articles[0].summary).toContain("Some");

    vi.restoreAllMocks();
  });
});

describe("BenedictEvansCrawler", () => {
  it("has correct source name", () => {
    const crawler = new BenedictEvansCrawler();
    expect(crawler.sourceName).toBe("Benedict Evans");
  });
});
