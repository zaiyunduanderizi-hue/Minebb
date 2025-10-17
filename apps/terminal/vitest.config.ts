import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@minebb/common": resolve(__dirname, "common"),
      "@minebb/main": resolve(__dirname, "main"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
});
