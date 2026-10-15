import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 240000,
  expect: { timeout: 30000 },
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH },
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: process.env.PLAYWRIGHT_NO_VIDEO ? "off" : "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
});
