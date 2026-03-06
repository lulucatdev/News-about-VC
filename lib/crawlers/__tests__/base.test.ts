import { describe, it, expect } from "vitest";
import { generateUniqueId, parseRelativeTime, stripHtml } from "../base";

describe("generateUniqueId", () => {
  it("returns deterministic hash", () => {
    const a = generateUniqueId("title", "url", "source");
    const b = generateUniqueId("title", "url", "source");
    expect(a).toBe(b);
  });

  it("differs for different input", () => {
    const a = generateUniqueId("A", "url", "source");
    const b = generateUniqueId("B", "url", "source");
    expect(a).not.toBe(b);
  });
});

describe("parseRelativeTime", () => {
  it("parses hours ago", () => {
    const result = parseRelativeTime("3 hours ago");
    expect(result).not.toBeNull();
    const diff = Date.now() - result!.getTime();
    expect(diff).toBeLessThan(4 * 3600 * 1000);
    expect(diff).toBeGreaterThan(2 * 3600 * 1000);
  });

  it("parses minutes ago", () => {
    const result = parseRelativeTime("30 minutes ago");
    expect(result).not.toBeNull();
  });

  it("parses days ago", () => {
    const result = parseRelativeTime("2 days ago");
    expect(result).not.toBeNull();
    const diffDays =
      (Date.now() - result!.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(1.5);
    expect(diffDays).toBeLessThan(2.5);
  });

  it("returns null for empty string", () => {
    expect(parseRelativeTime("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseRelativeTime(null)).toBeNull();
  });
});

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<p>hello <b>world</b></p>")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});
