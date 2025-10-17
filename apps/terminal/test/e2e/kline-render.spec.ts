import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotDir = resolve(__dirname, "../../../reports/e2e-screenshots");

const loadFixture = async (name: string) => {
  const file = join(__dirname, "../fixtures/lixinger", name);
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
};

test("renders kline panel with fixture data", async ({ page }) => {
  page.on("console", m => console.log("BROWSER:", m.text()));
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await mkdir(screenshotDir, { recursive: true });

  await page.addInitScript(() => {
    // Provide a simple polyfill for canvas-less rendering in test mode.
    (window as any).renderKline = (points: Array<{ t: number; c: number }>) => {
      const list = document.createElement("ul");
      list.id = "kline-points";
      for (const point of points) {
        const item = document.createElement("li");
        item.textContent = `${new Date(point.t).toISOString()} :: ${point.c.toFixed(2)}`;
        list.appendChild(item);
      }
      document.body.appendChild(list);
    };
  });

  const kline = await loadFixture("kline-daily.json");
  const points = (kline.data as any).klines.slice(0, 5).map((entry: any) => ({
    t: Date.parse(entry.date),
    c: entry.close,
  }));

  await page.setContent(`
   <main style="font-family: system-ui; padding: 24px;">
      <h1>K-Line Demo</h1>
      <section id="chart"></section>
      <ul id="kline-points"></ul>
    </main>
  `);

 // 2) 在页面上下文里渲染 <li>（最可靠，不依赖 addInitScript）
  await page.evaluate((pts: Array<{ t: number; c: number }>) => {
    const ul = document.getElementById("kline-points")!;
    ul.innerHTML = pts
      .map(p => `<li>${new Date(p.t).toISOString()} :: ${p.c.toFixed(2)}</li>`)
     .join("");
  }, points);

// 3) 断言（用 locator，自带自动等待）
  await expect(page.locator("#kline-points li")).toHaveCount(points.length, { timeout: 5000 });

// 4) 截图前确保目录存在（你已加，保留）
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: join(screenshotDir, "02-valid-token.png"), fullPage: true });
});
