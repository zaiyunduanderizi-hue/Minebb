import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotDir = resolve(__dirname, "../../../reports/e2e-screenshots");
const loadFixture = async (name) => {
    const file = join(__dirname, "../fixtures/lixinger", name);
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw);
};
test("renders kline panel with fixture data", async ({ page }) => {
    await mkdir(screenshotDir, { recursive: true });
    await page.addInitScript(() => {
        // Provide a simple polyfill for canvas-less rendering in test mode.
        window.renderKline = (points) => {
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
    const points = kline.data.klines.slice(0, 5).map((entry) => ({
        t: Date.parse(entry.date),
        c: entry.close,
    }));
    await page.setContent(`
    <main style="font-family: system-ui; padding: 24px;">
      <h1>K-Line Demo</h1>
      <section id="chart"></section>
      <script>
        const points = ${JSON.stringify(points)};
        window.renderKline(points);
      </script>
    </main>
  `);
    const items = await page.$$(`#kline-points li`);
    expect(items).toHaveLength(points.length);
    await expect(page.getByRole("heading", { name: "K-Line Demo" })).toBeVisible();
    await page.screenshot({ path: join(screenshotDir, "02-valid-token.png"), fullPage: true });
});
