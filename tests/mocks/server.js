import { setupServer } from "msw/node";
import { createHandlers } from "./handlers.js";

export const server = setupServer();

// Installs a fresh mock backend for one test and returns its call log.
export function mockApi(scenario = {}) {
  const api = createHandlers(scenario);
  server.resetHandlers(...api.handlers);
  return api;
}
