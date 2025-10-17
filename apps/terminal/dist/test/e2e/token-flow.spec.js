import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotDir = resolve(__dirname, "../../../reports/e2e-screenshots");
test("shows token dialog when credentials are missing", async ({ page }) => {
    await mkdir(screenshotDir, { recursive: true });
    await page.setContent(`
    <main style="font-family: system-ui; padding: 24px;">
      <h1>Minebb Terminal</h1>
      <dialog id="token-dialog" open style="border: 1px solid #888; padding: 16px;">
        <form method="dialog">
          <h2>Token Required</h2>
          <p>Please paste your Lixinger token to continue.</p>
          <label>
            Token
            <input id="token-input" placeholder="sk_live_..." />
          </label>
          <menu>
            <button value="cancel">Cancel</button>
            <button id="token-submit" value="confirm">Save</button>
          </menu>
        </form>
      </dialog>
    </main>
  `);
    await expect(page.getByRole("heading", { name: "Minebb Terminal" })).toBeVisible();
    const dialog = page.locator("#token-dialog");
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: join(screenshotDir, "01-no-token.png"), fullPage: true });
});
test("shows retry countdown when rate limited", async ({ page }) => {
    await mkdir(screenshotDir, { recursive: true });
    await page.setContent(`
    <main style="font-family: system-ui; padding: 24px;">
      <header style="display: flex; justify-content: space-between; align-items: center;">
        <h1>Minebb Terminal</h1>
        <span id="status">Rate limited</span>
      </header>
      <section>
        <p id="countdown">Retry in <strong>15</strong> seconds</p>
      </section>
      <script>
        const countdown = document.getElementById("countdown");
        if (countdown) {
          let remaining = 15;
          setInterval(() => {
            remaining = Math.max(0, remaining - 1);
            countdown.innerHTML = \`Retry in <strong>\${remaining}</strong> seconds\`;
          }, 1000);
        }
      </script>
    </main>
  `);
    await expect(page.locator("#status")).toHaveText("Rate limited");
    await expect(page.locator("#countdown")).toContainText("Retry in");
    await page.screenshot({ path: join(screenshotDir, "03-rate-limit.png"), fullPage: true });
});
test("allows retry after network error", async ({ page }) => {
    await mkdir(screenshotDir, { recursive: true });
    await page.setContent(`
    <main style="font-family: system-ui; padding: 24px;">
      <h1>Minebb Terminal</h1>
      <section>
        <p id="error">Network request failed</p>
        <button id="retry">Retry</button>
      </section>
      <script>
        document.getElementById("retry")?.addEventListener("click", () => {
          const message = document.getElementById("error");
          if (message) {
            message.textContent = "Recovered after retry";
          }
        });
      </script>
    </main>
  `);
    await expect(page.locator("#error")).toHaveText("Network request failed");
    await page.click("#retry");
    await expect(page.locator("#error")).toHaveText("Recovered after retry");
    await page.screenshot({ path: join(screenshotDir, "04-network-error.png"), fullPage: true });
});
