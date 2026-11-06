import { describe, expect, it } from "vitest";
import {
  countWords,
  processContent,
  readingMinutes,
  validateContentSafety,
} from "./blog-content";

describe("processContent", () => {
  it("gives headings stable slug ids in document order", () => {
    const { html } = processContent("<h2>Build Log</h2><p>x</p><h3>Sensor Array</h3>");
    expect(html).toContain('<h2 id="build-log">');
    expect(html).toContain('<h3 id="sensor-array">');
  });

  it("de-duplicates identical heading texts instead of reusing ids", () => {
    const { html, toc } = processContent("<h2>Results</h2><h2>Results</h2><h2>Results</h2>");
    expect(html).toContain('id="results"');
    expect(html).toContain('id="results-2"');
    expect(html).toContain('id="results-3"');
    expect(toc.map((t) => t.id)).toEqual(["results", "results-2", "results-3"]);
  });

  it("symbol-only headings fall back to the section slug", () => {
    const { html, toc } = processContent("<h2>??? !!!</h2>");
    expect(html).toContain('id="section"');
    expect(toc).toEqual([{ id: "section", text: "??? !!!", level: 2 }]);
  });

  it("extracts the TOC with levels clamped 2..4", () => {
    const { toc } = processContent(
      "<h1>Top</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5>",
    );
    expect(toc.map((t) => [t.text, t.level])).toEqual([
      ["Top", 2],
      ["Two", 2],
      ["Three", 3],
      ["Four", 4],
      ["Five", 4],
    ]);
  });

  it("wraps every table exactly once, even nested ones", () => {
    const { html } = processContent(
      "<table><tr><td>a<table><tr><td>b</td></tr></table></td></tr></table>",
    );
    expect(html.match(/rs-table-wrap/g) ?? []).toHaveLength(2); // one wrapper per table
    expect(html.startsWith('<div class="rs-table-wrap">')).toBe(true);
  });

  it("strips scripts, event handlers and javascript: urls", () => {
    const { html } = processContent(
      '<p onclick="steal()">hi</p><a href="javascript:alert(1)">bad</a><script>evil()</script>',
    );
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("script");
  });

  it("hardens external links and lazy-loads images", () => {
    const { html } = processContent(
      `<a href="https://example.com/x">ext</a><a href="/blog/y">int</a><img src="https://example.com/a.png" alt="">`,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });
});

describe("countWords / readingMinutes", () => {
  it("counts plain-text words, not markup tokens", () => {
    expect(countWords("<p>one <strong>two</strong> three</p>")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("never reports less than one minute", () => {
    expect(readingMinutes("<p>tiny</p>")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("matches the 200-wpm intent on realistic content", () => {
    const words = Array.from({ length: 400 }, (_, i) => `w${i}`).join(" ");
    expect(readingMinutes(`<p>${words}</p>`)).toBe(2);
  });
});

describe("validateContentSafety", () => {
  it("flags the payloads sanitisation would strip on render", () => {
    expect(validateContentSafety("<script>x</script>")).toMatch(/<script>/i);
    expect(validateContentSafety('<a href="javascript:void(0)">')).toMatch(/javascript:/);
    expect(validateContentSafety("<p>clean</p>")).toBeNull();
  });
});
