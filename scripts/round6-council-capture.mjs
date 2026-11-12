import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.PLAYWRIGHT_BASE_URL;
if (!base) throw new Error("PLAYWRIGHT_BASE_URL is required");
const outDir = process.env.CAPTURE_OUT || "/workspace/guild-round6-council/after";
const token = process.env.VERCEL_OIDC_TOKEN;
const WIDTHS = [375, 768, 1024, 1280, 1440, 1920];
const HEIGHT = { 375: 812, 768: 1024, 1024: 900, 1280: 900, 1440: 900, 1920: 1080 };

async function waitFonts(page) {
  return page.evaluate(async () => {
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
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const measure = (family) => {
      ctx.font = `800 72px ${family}`;
      return ctx.measureText("MILKY WAY").width;
    };
    const oswald = measure("Oswald");
    const arial = measure("Arial");
    return {
      ready: document.fonts.status,
      oswald,
      arial,
      delta: Math.abs(oswald - arial),
      loaded: oswald > 0 && Math.abs(oswald - arial) > 20,
    };
  });
}

async function overflowOf(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scroll: root.scrollWidth, client: root.clientWidth, overflow: Math.max(0, root.scrollWidth - root.clientWidth) };
  });
}

const routes = [
  ["home", "/"],
  ["signup", "/signup"],
  ["login", "/login"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
];
const overflowRoutes = [
  ["home", "/"],
  ["signup", "/signup"],
];

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
const notes = [];
const overflowNotes = [];

for (const [name, route] of routes) {
  for (const width of WIDTHS) {
    const height = HEIGHT[width] ?? 900;
    const isMobile = width <= 768;
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile,
      hasTouch: isMobile,
      extraHTTPHeaders: token ? { "x-vercel-trusted-oidc-idp-token": token } : {},
    });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
    const fonts = await waitFonts(page);
    notes.push({ name, width, fonts, error: fonts.loaded ? undefined : "fonts not distinct from Arial" });
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 200));
      window.scrollTo(0, 0);
    });
    if (overflowRoutes.some((item) => item[0] === name)) {
      overflowNotes.push({ name, width, ...(await overflowOf(page)) });
    }
    const file = path.join(outDir, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await ctx.close();
  }
}

for (const width of [320, 414]) {
  for (const [name, route] of overflowRoutes) {
    const ctx = await browser.newContext({
      viewport: { width, height: 720 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      extraHTTPHeaders: token ? { "x-vercel-trusted-oidc-idp-token": token } : {},
    });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
    await waitFonts(page);
    overflowNotes.push({ name, width, ...(await overflowOf(page)) });
    await ctx.close();
  }
}

await writeFile(path.join(outDir, "font-notes.json"), JSON.stringify(notes, null, 2));
await writeFile(path.join(outDir, "overflow.json"), JSON.stringify(overflowNotes, null, 2));
await browser.close();
console.log(JSON.stringify({ outDir, fontErrors: notes.filter((n) => n.error).length, overflow: overflowNotes }, null, 2));
