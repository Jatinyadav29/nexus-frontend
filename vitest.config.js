import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dates are rendered with toLocaleDateString(); pin the zone so assertions
// and payload timestamps are the same on every machine.
process.env.TZ = "UTC";

// Separate from vite.config.js on purpose: the app's build config is untouched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/unit/**/*.test.{js,jsx}"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
    },
  },
});
