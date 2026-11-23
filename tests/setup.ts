import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { server, mockApi } from "./mocks/server";

// Browser APIs the UI libraries expect and jsdom lacks.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
window.matchMedia =
  window.matchMedia ||
  ((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
Element.prototype.scrollTo = () => {};

// Any request that is not mocked fails the test: nothing may reach a real host.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

beforeEach(() => {
  mockApi(); // logged-out defaults; tests call mockApi({...}) to override
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

afterAll(() => server.close());
