import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server, mockApi } from "./mocks/server.js";

// Browser APIs the UI libraries expect and jsdom lacks.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = NoopObserver;
globalThis.ResizeObserver = NoopObserver;
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
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

// Any request that is not mocked fails the test: nothing may reach a real host.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  mockApi(); // logged-out defaults; tests call mockApi({...}) to override
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

afterAll(() => server.close());
