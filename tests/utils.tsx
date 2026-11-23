import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import type { ApiCall } from "./mocks/handlers";
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "../src/context/AuthContext";

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

interface RenderAtOptions {
  route?: InitialEntry;
  path?: string;
  routes?: { path: string; element: ReactElement }[];
}

// Renders `ui` at `path` inside the same providers main.tsx / App.tsx use.
// Other routes render a plain marker so navigation can be asserted via the
// location probe. React Query retries are off so error states show at once
// (the app itself uses the default of 3 retries).
export function renderAt(
  ui: ReactElement,
  { route = "/", path = typeof route === "string" ? route : (route.pathname ?? "/"), routes = [] }: RenderAtOptions = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Toaster />
          <LocationProbe />
          <Routes>
            <Route path={path} element={ui} />
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route path="*" element={<div data-testid="other-page" />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return view;
}

export const lastCall = (calls: ApiCall[], method: string, pathPart: string) =>
  [...calls].reverse().find((c) => c.method === method && c.path.includes(pathPart));

// Fails the test with a readable message instead of a null dereference.
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what} to exist`);
  return value;
}

// container.querySelector that fails the test when nothing matches.
export const $ = <E extends Element = HTMLElement>(root: ParentNode, selector: string): E =>
  must(root.querySelector<E>(selector), `an element matching ${selector}`);

// The last call matching method and path; fails the test when there was none.
// `Body` names the request type the test expects to have been sent.
export const callTo = <Body = unknown>(calls: ApiCall[], method: string, pathPart: string) =>
  must(lastCall(calls, method, pathPart), `a ${method} call to ${pathPart}`) as ApiCall & { body: Body };
