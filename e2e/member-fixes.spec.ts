import { expect, test, type Page } from "@playwright/test";

async function overflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const root = document.documentElement;
    const vw = root.clientWidth;
    const offenders: { cls: string; left: number; right: number }[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) continue;
      if (rect.right > vw + 1 || rect.left < -1) {
        const cls = typeof el.className === "string" ? el.className : el.tagName;
        offenders.push({ cls: String(cls).slice(0, 120), left: Math.round(rect.left), right: Math.round(rect.right) });
      }
    }
    return { scroll: root.scrollWidth, client: root.clientWidth, offenders: offenders.slice(0, 12) };
  });
}

test("phone menu opens with a mouse click and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/header-menu-fixture");
  const button = page.locator("button.mw-nav-toggle");
  await expect(button).toBeVisible();
  const hit = await button.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(top && (el === top || el.contains(top)));
  });
  expect(hit).toBe(true);
  const box = await button.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mw-primary-nav")).toBeVisible();
  await page.mouse.click(20, 700);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("phone menu opens with a touch tap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/header-menu-fixture");
  const button = page.locator("button.mw-nav-toggle");
  const box = await button.boundingBox();
  expect(box).toBeTruthy();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mw-primary-nav")).toBeVisible();
});

test("phone menu opens with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/header-menu-fixture");
  const button = page.locator("button.mw-nav-toggle");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.locator("#mw-primary-nav").getByRole("link", { name: "Field Desk" }).click();
  await expect(page).not.toHaveURL(/header-menu-fixture/);
});

test("vote later closes without locking a ballot", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/header-menu-fixture");
  await page.getByRole("button", { name: "✪ Vote" }).click();
  await expect(page.getByRole("button", { name: "Vote later" })).toBeVisible();
  await page.getByRole("button", { name: "Vote later" }).click();
  await expect(page.getByRole("button", { name: "Vote later" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Lock In My Top 3" })).toBeHidden();
  const notice = page.locator("[data-vote-confirm]");
  await expect(notice).toContainText("Your Top 3 is locked in. You can change it until");
  await expect(notice).toContainText("MST");
});

test("member fixture does not scroll sideways", async ({ page }) => {
  for (const width of [1920, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/header-menu-fixture");
    const box = await overflow(page);
    expect(box.scroll, JSON.stringify(box)).toBe(box.client);
  }
});

test("home hero keeps photographers whole", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const word = page.locator(".mw-unbreakable");
    await expect(word).toHaveText("photographers.");
    const lines = await word.evaluate((el) => {
      const tops = [...el.getClientRects()].map((rect) => Math.round(rect.top));
      return new Set(tops).size;
    });
    expect(lines).toBe(1);
    const box = await overflow(page);
    expect(box.scroll, `${width} ${JSON.stringify(box)}`).toBe(box.client);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const word = page.locator(".mw-unbreakable");
  await expect(word).toHaveText("photographers.");
  const lines = await word.evaluate((el) => new Set([...el.getClientRects()].map((rect) => Math.round(rect.top))).size);
  expect(lines).toBe(1);
});
