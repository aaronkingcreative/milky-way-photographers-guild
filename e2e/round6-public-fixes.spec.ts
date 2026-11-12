import { expect, test, type Page, type ViewportSize } from "@playwright/test";

const WIDTHS = [320, 375, 414, 768, 1024, 1440, 1920] as const;
const PHONE = new Set([320, 375, 414, 768]);

const FEATURE_SNIPPETS = [
  "what could have gone better.",
  "move you along the Ascent.",
  "does not change your rank.",
];

function viewportFor(width: number): ViewportSize {
  return { width, height: width >= 1024 ? 900 : width === 768 ? 1024 : 667 };
}

async function overflowOf(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      scroll: root.scrollWidth,
      client: root.clientWidth,
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
    };
  });
}

async function lastLineWordCount(page: Page, snippet: string) {
  return page.evaluate((needle) => {
    const block = [...document.querySelectorAll("p")].find((el) =>
      (el.textContent || "").replace(/\u00A0/g, " ").includes(needle),
    );
    if (!block) return { found: false, lastLine: "", wordCount: 0 };
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) nodes.push(node as Text);
    if (!nodes.length) return { found: true, lastLine: "", wordCount: 0 };
    const last = nodes[nodes.length - 1];
    const value = last.textContent || "";
    const range = document.createRange();
    let lastTop = -1;
    let lastLine = "";
    for (let i = 0; i < value.length; i++) {
      range.setStart(last, i);
      range.setEnd(last, Math.min(i + 1, value.length));
      const rects = range.getClientRects();
      const rect = rects[rects.length - 1];
      if (!rect) continue;
      if (lastTop < 0 || Math.abs(rect.top - lastTop) > 2) {
        lastTop = rect.top;
        lastLine = "";
      }
      lastLine += value[i];
    }
    // If the last text node is only the held tail, include it all on one line
    const words = lastLine.trim().split(/\s+/).filter(Boolean);
    return { found: true, lastLine: lastLine.trim(), wordCount: words.length };
  }, snippet);
}

async function prepare(page: Page, path: string, width: number) {
  await page.setViewportSize({ ...viewportFor(width), width });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const families = ["Oswald", "Mulish"];
    const weights = ["400", "600", "700", "800"];
    const sizes = ["16px", "24px", "48px", "72px"];
    await Promise.all(
      families.flatMap((family) =>
        weights.flatMap((weight) =>
          sizes.map((size) => document.fonts.load(`${weight} ${size} ${family}`).catch(() => [])),
        ),
      ),
    );
    await document.fonts.ready;
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe("round 6 public overflow, orphans, and header taps", () => {
  for (const width of WIDTHS) {
    for (const path of ["/", "/signup"] as const) {
      test(`${path} has no sideways scroll at ${width}`, async ({ page }) => {
        await page.setViewportSize(viewportFor(width));
        if (PHONE.has(width)) {
          // hasTouch is already on in playwright.config
        }
        await prepare(page, path, width);
        const box = await overflowOf(page);
        expect(box.overflow, `${path} at ${width}: scroll ${box.scroll} client ${box.client}`).toBe(0);
      });
    }
  }

  for (const width of WIDTHS) {
    test(`Inside the Guild feature bodies do not end on one or two words at ${width}`, async ({ page }) => {
      await prepare(page, "/", width);
      for (const snippet of FEATURE_SNIPPETS) {
        const result = await lastLineWordCount(page, snippet);
        expect(result.found, `missing paragraph for ${snippet} at ${width}`).toBeTruthy();
        expect(
          result.wordCount,
          `orphan at ${width}: "${result.lastLine}" (${result.wordCount} words)`,
        ).toBeGreaterThan(2);
      }
    });
  }

  test("at 375, prints under the header are blocked only inside the header box", async ({ page }) => {
    await prepare(page, "/", 375);
    const pile = page.locator(".mw-print-table").first();
    await pile.scrollIntoViewIfNeeded();
    const header = page.locator("header.mw-app-header");
    const nav = page.locator("header.mw-app-header > .mw-header-nav");
    const headerBox = await header.boundingBox();
    const navBox = await nav.boundingBox();
    expect(headerBox).toBeTruthy();
    expect(navBox).toBeTruthy();

    const checks = await page.evaluate(() => {
      const headerEl = document.querySelector("header.mw-app-header") as HTMLElement | null;
      const navEl = document.querySelector("header.mw-app-header > .mw-header-nav") as HTMLElement | null;
      if (!headerEl || !navEl) {
        return {
          error: "missing header" as const,
          nav: { top: 0, bottom: 0, height: 0, width: 0 },
          headerHeight: 0,
          inside: { x: 0, y: 0, tag: null as string | null, className: null as string | null, inHeader: false, inNav: false },
          justBelow: { x: 0, y: 0, tag: null as string | null, className: null as string | null, inHeader: false, inNav: false },
          farBelow: { x: 0, y: 0, tag: null as string | null, className: null as string | null, inHeader: false, inNav: false },
        };
      }
      const box = navEl.getBoundingClientRect();
      const inside = { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
      const justBelow = { x: inside.x, y: Math.round(box.bottom + 4) };
      const farBelow = { x: inside.x, y: Math.round(box.bottom + 80) };
      const hit = (pt: { x: number; y: number }) => {
        const el = document.elementFromPoint(pt.x, pt.y) as HTMLElement | null;
        return {
          x: pt.x,
          y: pt.y,
          tag: el?.tagName || null,
          className: el?.className?.toString().slice(0, 80) || null,
          inHeader: !!(el && headerEl.contains(el)),
          inNav: !!(el && navEl.contains(el)),
        };
      };
      return {
        nav: { top: box.top, bottom: box.bottom, height: box.height, width: box.width },
        headerHeight: headerEl.getBoundingClientRect().height,
        inside: hit(inside),
        justBelow: hit(justBelow),
        farBelow: hit(farBelow),
      };
    });

    expect(checks.error, JSON.stringify(checks)).toBeUndefined();
    expect(checks.inside.inHeader, `header center should hit the header: ${JSON.stringify(checks.inside)}`).toBeTruthy();
    expect(checks.justBelow.inHeader, `4px below the bar should not hit the header: ${JSON.stringify(checks.justBelow)}`).toBeFalsy();
    expect(checks.farBelow.inHeader, `80px below the bar should not hit the header: ${JSON.stringify(checks.farBelow)}`).toBeFalsy();

    const print = page.locator(".mw-print-table button.mw-print").first();
    await print.evaluate((el) => {
      el.scrollIntoView({ block: "start", inline: "nearest" });
    });
    const afterScroll = await page.evaluate(() => {
      const headerEl = document.querySelector("header.mw-app-header") as HTMLElement | null;
      const navEl = document.querySelector("header.mw-app-header > .mw-header-nav") as HTMLElement | null;
      const printEl = document.querySelector(".mw-print-table button.mw-print") as HTMLElement | null;
      if (!headerEl || !navEl || !printEl) return { error: "missing nodes" };
      const navBox = navEl.getBoundingClientRect();
      const printBox = printEl.getBoundingClientRect();
      const overlapY = Math.min(navBox.bottom, printBox.bottom) - Math.max(navBox.top, printBox.top);
      const midX = Math.round(Math.max(navBox.left, printBox.left) + 8);
      const coveredY = Math.round(navBox.top + Math.min(navBox.height, Math.max(overlapY, 0)) / 2);
      const uncoveredY = Math.round(navBox.bottom + 6);
      const hit = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return {
          x,
          y,
          className: el?.className?.toString().slice(0, 80) || el?.tagName || null,
          inHeader: !!(el && headerEl.contains(el)),
          inPrint: !!(el && (el === printEl || printEl.contains(el) || el.closest(".mw-print"))),
        };
      };
      return {
        overlapY,
        printTop: printBox.top,
        navBottom: navBox.bottom,
        covered: overlapY > 2 ? hit(midX, coveredY) : null,
        uncovered: printBox.bottom > navBox.bottom + 6 ? hit(Math.round(printBox.left + printBox.width / 2), uncoveredY) : null,
      };
    });

    if (afterScroll.covered) {
      expect(afterScroll.covered.inHeader, `covered print pixel should hit the header: ${JSON.stringify(afterScroll.covered)}`).toBeTruthy();
      expect(afterScroll.covered.inPrint).toBeFalsy();
    }
    if (afterScroll.uncovered) {
      expect(afterScroll.uncovered.inHeader, `uncovered print pixel should not hit the header: ${JSON.stringify(afterScroll.uncovered)}`).toBeFalsy();
    }
  });
});
