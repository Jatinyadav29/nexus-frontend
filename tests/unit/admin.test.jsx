// Admin area: dashboard, bookings / squads, inbox, and the client-side gate.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../../src/App.jsx";
import { AuthProvider } from "../../src/context/AuthContext";
import AdminHUD from "../../src/pages/admin/AdminHUD.jsx";
import AdminBookings from "../../src/pages/admin/AdminBookings.jsx";
import AdminMessages from "../../src/pages/admin/AdminMessages.jsx";
import { mockApi } from "../mocks/server.js";
import { ids } from "../mocks/data.js";
import { renderAt, lastCall } from "../utils.jsx";

describe("AdminHUD", () => {
  it("shows the loading state, then the stats and the live bookings table", async () => {
    mockApi({ session: "admin", delayMs: 50 });
    renderAt(<AdminHUD />, { route: "/admin" });

    expect(screen.getByText("Decrypting Server Data...")).toBeInTheDocument();
    expect(await screen.findByText("Live Deployments Matrix")).toBeInTheDocument();
    expect(within(screen.getByText("Total Operatives").parentElement).getByText("42")).toBeInTheDocument();
    expect(within(screen.getByText("Total Stations").parentElement).getByText("8")).toBeInTheDocument();
    expect(within(screen.getByText("Active Deployments").parentElement).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("0B0001")).toBeInTheDocument();
    expect(screen.getByText("PC-01, PC-02")).toBeInTheDocument();
    expect(screen.getByText("kabir")).toBeInTheDocument();
  });

  it("shows the error state when the dashboard request fails", async () => {
    mockApi({ session: "admin", dashboard: "error" });
    renderAt(<AdminHUD />, { route: "/admin" });

    expect(
      await screen.findByText("Connection to Mainframe Lost. Check Backend Server."),
    ).toBeInTheDocument();
  });

  it("shows the error state for a non-admin (server answers 403)", async () => {
    mockApi({ session: "user" });
    renderAt(<AdminHUD />, { route: "/admin" });

    expect(
      await screen.findByText("Connection to Mainframe Lost. Check Backend Server."),
    ).toBeInTheDocument();
  });
});

describe("AdminBookings", () => {
  it("shows the loading state, then every booking", async () => {
    mockApi({ session: "admin", delayMs: 50 });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });

    expect(screen.getByText("Syncing Nexus Mainframe...")).toBeInTheDocument();
    expect(await screen.findByText("riya@example.test")).toBeInTheDocument();
    expect(screen.getByText("kabir@example.test")).toBeInTheDocument();
    expect(screen.getAllByTitle("Force Abort Deployment")).toHaveLength(2);
  });

  it("shows the empty state", async () => {
    mockApi({ session: "admin", bookings: "empty" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });

    expect(await screen.findByText("No Active Deployments.")).toBeInTheDocument();
  });

  it("shows an error toast when loading fails", async () => {
    mockApi({ session: "admin", bookings: "error" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });

    expect(await screen.findByText("Failed to fetch mainframe data.")).toBeInTheDocument();
  });

  it("force abort: asks first, calls DELETE /bookings/:id and removes the row", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getAllByTitle("Force Abort Deployment")[0]);
    expect(await screen.findByText("Force Abort?")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/bookings/")).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Confirm Erase" }));

    expect(await screen.findByText("DEPLOYMENT ABORTED & ERASED.")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/bookings/").path).toBe(`/api/bookings/${ids.bookingMine}`);
    await waitFor(() => expect(screen.queryByText("riya@example.test")).not.toBeInTheDocument());
    expect(screen.getByText("kabir@example.test")).toBeInTheDocument();
  });

  it("force abort: Cancel closes the dialog without calling the API", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getAllByTitle("Force Abort Deployment")[0]);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Force Abort?")).not.toBeInTheDocument());
    expect(lastCall(calls, "DELETE", "/bookings/")).toBeUndefined();
  });

  it("squads tab: lists every team and approves one with PUT …/team/:teamId/status", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getByRole("button", { name: "Circuit Squads" }));
    expect(await screen.findByText("Night Owls")).toBeInTheDocument();
    expect(screen.getByText("Pixel Pirates")).toBeInTheDocument();
    expect(screen.getByText("Solo Kings")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Night Owls"));
    expect(await screen.findByText("Full Roster Intel")).toBeInTheDocument();
    expect(screen.getByText("Operative 1 (Captain)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Approve Roster/ }));

    expect(await screen.findByText("Squad APPROVED!")).toBeInTheDocument();
    const { path, body } = lastCall(calls, "PUT", "/status");
    expect(path).toBe(`/api/tournaments/${ids.tournamentOpen}/team/${ids.team1}/status`);
    expect(body).toEqual({ status: "Approved" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Approve Roster/ })).toBeDisabled());
  });

  it("squads tab: rejecting sends { status: 'Rejected' }", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getByRole("button", { name: "Circuit Squads" }));
    await userEvent.click(await screen.findByText("Night Owls"));
    await userEvent.click(await screen.findByRole("button", { name: /Reject/ }));

    expect(await screen.findByText("Squad REJECTED!")).toBeInTheDocument();
    expect(lastCall(calls, "PUT", "/status").body).toEqual({ status: "Rejected" });
  });

  it("squads tab: shows the empty state when no team is registered", async () => {
    mockApi({ session: "admin", tournaments: "empty" });
    renderAt(<AdminBookings />, { route: "/admin/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getByRole("button", { name: "Circuit Squads" }));

    expect(await screen.findByText("No Squads Enlisted Yet.")).toBeInTheDocument();
  });
});

describe("AdminMessages", () => {
  it("shows the loading state, then the inbox", async () => {
    mockApi({ session: "admin", delayMs: 50 });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    expect(screen.getByText("Decrypting Comms...")).toBeInTheDocument();
    expect(await screen.findByText("Birthday booking")).toBeInTheDocument();
    expect(screen.getByText("Lost headset")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockApi({ session: "admin", messages: "empty" });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    expect(
      await screen.findByText("Inbox Empty. No incoming transmissions."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when loading fails", async () => {
    mockApi({ session: "admin", messages: "error" });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    expect(await screen.findByText("Failed to fetch comms from mainframe.")).toBeInTheDocument();
  });

  it("expands a message and marks it read with PUT /messages/:id/read", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    await userEvent.click(await screen.findByText("Birthday booking"));
    expect(
      await screen.findByText("Can we book ten PCs for a birthday on Saturday evening?"),
    ).toBeInTheDocument();
    expect(screen.getByText("meera@example.test")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Mark Read/ }));

    expect(await screen.findByText("Transmission marked as Read.")).toBeInTheDocument();
    expect(lastCall(calls, "PUT", "/messages/").path).toBe(`/api/messages/${ids.messageUnread}/read`);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Mark Read/ })).not.toBeInTheDocument(),
    );
  });

  it("a message that is already read has no Mark Read button", async () => {
    mockApi({ session: "admin" });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    await userEvent.click(await screen.findByText("Lost headset"));
    await screen.findByText("I think I left my headset at station PC-07 yesterday.");

    expect(screen.queryByRole("button", { name: /Mark Read/ })).not.toBeInTheDocument();
    expect(screen.getByText("9000000042")).toBeInTheDocument();
  });

  it("delete: asks first, calls DELETE /messages/:id and removes the row", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<AdminMessages />, { route: "/admin/messages" });

    await userEvent.click(await screen.findByText("Birthday booking"));
    await userEvent.click(await screen.findByRole("button", { name: /Delete/ }));
    expect(await screen.findByText("Delete Comms?")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/messages/")).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("Transmission deleted from logs.")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/messages/").path).toBe(`/api/messages/${ids.messageUnread}`);
    await waitFor(() => expect(screen.queryByText("Birthday booking")).not.toBeInTheDocument());
  });
});

// The real router, so the test sees exactly the guard App.jsx applies.
describe("Admin route guard (AUDIT SEC-20)", () => {
  const openApp = (url) => {
    window.history.pushState({}, "", url);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>,
    );
  };
  afterEach(() => window.history.pushState({}, "", "/"));

  it("a logged-out visitor is redirected from /admin to /login", async () => {
    mockApi({ session: "none" });
    openApp("/admin");

    await waitFor(() => expect(window.location.pathname).toBe("/login"));
    expect(screen.queryByText("Restricted Access")).not.toBeInTheDocument();
  });

  it("an admin sees the admin shell", async () => {
    mockApi({ session: "admin" });
    openApp("/admin/users");

    expect(await screen.findByText("Restricted Access")).toBeInTheDocument();
  });

  it("SEC-20: a normal user is not shown the admin shell", async () => {
    const { calls } = mockApi({ session: "user" });
    openApp("/admin/users");

    // wait until the session check has finished, then give the router a moment
    await waitFor(() => expect(lastCall(calls, "GET", "/users/profile")).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(screen.queryByText("Restricted Access")).not.toBeInTheDocument();
  });

  it.each(["/admin", "/admin/users", "/admin/bookings", "/admin/messages", "/admin/settings"])(
    "SEC-20: a normal user opening %s is sent to the home page",
    async (url) => {
      mockApi({ session: "user" });
      openApp(url);

      await waitFor(() => expect(window.location.pathname).toBe("/"));
      expect(screen.queryByText("Restricted Access")).not.toBeInTheDocument();
    },
  );

  it("SEC-20: a normal user never triggers an admin API call", async () => {
    const { calls } = mockApi({ session: "user" });
    openApp("/admin/messages");

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(calls.filter((c) => /\/api\/(admin|messages)/.test(c.path))).toEqual([]);
  });
});
