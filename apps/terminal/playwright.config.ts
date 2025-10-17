import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  testDir: resolve(__dirname, "test/e2e"),
  outputDir: resolve(__dirname, "reports/e2e-artifacts"),
  reporter: [["list"], ["html", { open: "never", outputFolder: resolve(__dirname, "reports/playwright-report") }]],
  use: {
    viewport: { width: 1280, height: 720 },
  },
  expect: {
    timeout: 5_000,
  },
});
