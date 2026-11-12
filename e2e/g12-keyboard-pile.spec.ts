import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = "/workspace/guild-round5-a/g12";
mkdirSync(SHOTS, { recursive: true });

async function overflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scroll: root.scrollWidth, client: root.clientWidth, ok: root.scrollWidth <= root.clientWidth };
  });
}

async function tabUntil(page: Page, selector: string, limit = 80) {
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press("Tab");
    const matches = await page.evaluate((sel) => {
      const el = document.activeElement;
      return Boolean(el && (el as HTMLElement).matches(sel));
    }, selector);
    if (matches) return;
  }
  throw new Error(`did not tab to ${selector}`);
}

async function runPileKeyboard(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const firstPrint = page.locator("button.mw-print").first();
  await expect(firstPrint).toBeVisible();

  // Keyboard only: move focus with Tab, then open with Enter.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await tabUntil(page, "button.mw-print");
  const openedFrom = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") || "");
  expect(openedFrom).toMatch(/Open a Guild print/);

  await page.locator("button.mw-print:focus").screenshot({ path: join(SHOTS, `pile-focus-ring-${width}.png`) });
  await page.keyboard.press("Enter");
  const close = page.getByRole("button", { name: "Put the print back" });
  await expect(close).toBeVisible();
  await expect(close).toBeFocused();
  await expect(page.getByRole("button", { name: "Previous print" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next print" })).toBeVisible();
  await page.locator(".mw-print-focus").screenshot({ path: join(SHOTS, `pile-focus-view-${width}.png`) });

  await page.keyboard.press("Escape");
  await expect(close).toHaveCount(0);
  const returned = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    className: (document.activeElement as HTMLElement | null)?.className || "",
    label: (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") || "",
  }));
  expect(returned.className).toContain("mw-print");
  expect(returned.label).toBe(openedFrom);

  // Space also opens, then Put it back by keyboard from the close button (already focused).
  await page.keyboard.press("Space");
  await expect(close).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("button.mw-print:focus")).toHaveCount(1);

  // Tab to shuffle and activate it.
  const before = await page.locator("button.mw-print").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).style.transform),
  );
  await tabUntil(page, "button.mw-print-shuffle");
  await expect(page.getByRole("button", { name: "Shuffle the pile" })).toBeFocused();
  await page.locator("button.mw-print-shuffle:focus-visible, button.mw-print-shuffle:focus").screenshot({
    path: join(SHOTS, `pile-shuffle-ring-${width}.png`),
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  const after = await page.locator("button.mw-print").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).style.transform),
  );
  expect(after.join("|")).not.toBe(before.join("|"));

  const flow = await overflow(page);
  expect(flow.ok, `overflow at ${width}: ${flow.scroll} > ${flow.client}`).toBeTruthy();
  await page.screenshot({ path: join(SHOTS, `home-${width}.png`), fullPage: false });
  return flow;
}

test("keyboard access to the public print pile at 1440", async ({ page }) => {
  const flow = await runPileKeyboard(page, 1440, 900);
  expect(flow.scroll).toBeLessThanOrEqual(flow.client);
});

test("keyboard access to the public print pile at 375", async ({ page }) => {
  const flow = await runPileKeyboard(page, 375, 812);
  expect(flow.scroll).toBeLessThanOrEqual(flow.client);
});

test("the location placeholder is not clipped at 375 or 1440", async ({ page }) => {
  const markup = `<!doctype html>
<html lang="en"><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600&display=swap">
<style>
  :root { --font-guild-body: "Mulish", ui-sans-serif, sans-serif; --color-border-muted: rgba(255,255,255,.16); --color-text: #fff; }
  body { margin:0; background:#091625; color:#fff; font-family: var(--font-guild-body); }
  .mw-input { width:100%; border-radius:.35rem; border:1px solid var(--color-border-muted); background:rgba(6,16,28,.72); padding:.82rem 1rem; color:var(--color-text); outline:none; font-family:var(--font-guild-body); font-size:16px; box-sizing:border-box; }
  .mw-location-fields { display:grid; gap:1rem; min-width:0; }
  .mw-location-fields .mw-location-specific { display:block; width:100%; min-width:0; overflow:visible; text-overflow:clip; }
  .submit { max-width:760px; margin:0 auto; padding:38px 20px; }
</style>
</head>
<body>
  <div class="submit">
    <div class="mw-location-fields">
      <label>Specific location <span>(optional)</span>
        <input class="mw-input mw-location-specific" name="specific_location_name" value="" placeholder="Example: Mesa Arch, Southern Utah" autocomplete="off" />
      </label>
    </div>
  </div>
</body></html>`;

  async function measure(width: number) {
    await page.setViewportSize({ width, height: 812 });
    await page.setContent(markup, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => {
      const input = document.querySelector("input.mw-location-specific") as HTMLInputElement;
      const style = getComputedStyle(input);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.font = style.font;
      const textWidth = ctx.measureText(input.placeholder).width;
      const padLeft = parseFloat(style.paddingLeft);
      const padRight = parseFloat(style.paddingRight);
      const inner = input.clientWidth - padLeft - padRight;
      return {
        placeholder: input.placeholder,
        value: input.value,
        textWidth,
        inner,
        clientWidth: input.clientWidth,
        scrollWidth: input.scrollWidth,
        clipped: textWidth > inner + 0.5,
      };
    });
    await page.locator("input.mw-location-specific").screenshot({ path: join(SHOTS, `location-placeholder-${width}.png`) });
    return metrics;
  }

  const phone = await measure(375);
  const desktop = await measure(1440);
  expect(phone.value).toBe("");
  expect(phone.placeholder).toBe("Example: Mesa Arch, Southern Utah");
  expect(phone.clipped, `placeholder clipped at 375: text ${phone.textWidth} inner ${phone.inner}`).toBeFalsy();
  expect(desktop.clipped, `placeholder clipped at 1440: text ${desktop.textWidth} inner ${desktop.inner}`).toBeFalsy();
});
