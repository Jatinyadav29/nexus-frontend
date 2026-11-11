import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "../src/context/AuthContext.jsx";

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

// Renders `ui` at `path` inside the same providers main.jsx / App.jsx use.
// Other routes render a plain marker so navigation can be asserted via the
// location probe. React Query retries are off so error states show at once
// (the app itself uses the default of 3 retries).
export function renderAt(ui, { route = "/", path = route, routes = [] } = {}) {
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

export const lastCall = (calls, method, pathPart) =>
  [...calls].reverse().find((c) => c.method === method && c.path.includes(pathPart));
