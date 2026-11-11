// Playwright fixtures for the UI baseline.
//
// The browser talks to the SAME MSW handlers the Vitest suite uses
// (tests/mocks/handlers.js): every request to */api/* is taken off the network
// with page.route() and resolved in Node by msw's getResponse(). This needs no
// service-worker file in public/, so the frozen app is not touched.
//
// Everything that could change a pixel between runs is pinned:
//   - time: the page clock is frozen and only advanced explicitly;
//   - Math.random: seeded;
//   - third-party hosts: images are replaced by one blank pixel, the rest
//     (Google Fonts, …) is blocked, so text renders in the fallback fonts;
//   - the boot animation is skipped (sessionStorage.nexus_booted).
import { test as base, expect } from "@playwright/test";
import { getResponse } from "msw";
import { createHandlers } from "../mocks/handlers.js";

export { expect };

// Before every fixture date, so "today" based pickers are stable.
export const NOW = new Date("2030-01-08T09:00:00.000Z");

const BLANK_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
  "base64",
);

const isApi = (url) => url.pathname.startsWith("/api/");
const isApp = (url, baseURL) => url.origin === new URL(baseURL).origin;

export const test = base.extend({
  // Per-test override: test.use({ scenario: { session: "admin" } })
  scenario: [{}, { option: true }],

  api: async ({ page, scenario, baseURL }, use) => {
    const mock = createHandlers(scenario);
    let pending = 0;

    await page.route(
      (url) => isApi(url) && !isApp(url, baseURL),
      async (route) => {
        pending += 1;
        try {
          const req = route.request();
          const method = req.method();
          const headers = Object.fromEntries(
            Object.entries(await req.allHeaders()).filter(([name]) => !name.startsWith(":")),
          );
          const response = await getResponse(
            mock.handlers,
            new Request(req.url(), {
              method,
              headers,
              credentials: "include",
              body: method === "GET" || method === "HEAD" ? undefined : req.postDataBuffer(),
            }),
          );
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: Buffer.from(await response.arrayBuffer()),
          });
        } catch (error) {
          // The page was closed while a deliberately slow response was pending.
          if (!page.isClosed()) throw error;
        } finally {
          pending -= 1;
        }
      },
    );

    // Any other host: never hit the network.
    await page.route(
      (url) => !isApp(url, baseURL) && !isApi(url) && /^https?:$/.test(url.protocol),
      (route) =>
        route.request().resourceType() === "image"
          ? route.fulfill({ status: 200, contentType: "image/png", body: BLANK_PIXEL })
          : route.abort(),
    );

    await page.addInitScript(() => {
      sessionStorage.setItem("nexus_booted", "true");
      let seed = 42;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    });

    await page.clock.install({ time: NOW });
    await page.clock.pauseAt(NOW);

    // Resolves once no mocked request has been in flight for a short while.
    const idle = async () => {
      let quiet = 0;
      while (quiet < 4) {
        await page.waitForTimeout(50);
        quiet = pending === 0 ? quiet + 1 : 0;
      }
    };

    // Lets requests finish and advances the frozen clock by a fixed 3 s, which
    // completes every entry animation and keeps 4 s toasts on screen.
    const settle = async () => {
      for (let i = 0; i < 3; i += 1) {
        await idle();
        await page.clock.runFor(1000);
      }
      await idle();
    };

    // Scrolls through the page once so scroll-triggered sections are revealed.
    const reveal = async () => {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const step = page.viewportSize().height;
      for (let y = step; y < height; y += step) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(100);
        await page.clock.runFor(1000);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.clock.runFor(1500);
    };

    const open = async (path, ready) => {
      await page.goto(path);
      await settle();
      if (ready) await expect(page.getByText(ready).first()).toBeVisible();
    };

    const shot = async (name, { fullPage = true } = {}) => {
      if (fullPage) await reveal();
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage });
    };

    // Advances the frozen clock without waiting for the API (loading states).
    const tick = (ms) => page.clock.runFor(ms);

    await use({ ...mock, idle, settle, reveal, open, shot, tick });
  },
});
