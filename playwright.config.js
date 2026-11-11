import { defineConfig, devices } from "@playwright/test";

// UI baseline: screenshots of the real app (Vite dev server) with every API
// call answered by the MSW handlers in tests/mocks. Nothing reaches a backend.
const PORT = 5183;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.js",
  outputDir: "./test-results",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", scale: "css", maxDiffPixels: 0 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "no-preference",
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
    {
      // Page-level states only (tests tagged @mobile).
      name: "mobile",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"], deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    // VITE_API_BASE_URL is forced empty so the app uses its built-in default
    // (http://localhost:3005/api); the fixtures intercept every /api/ request.
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_API_BASE_URL: "" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
