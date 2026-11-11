// Profile (edit / delete account) and the demo Payment page.
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Profile from "../../src/pages/Profile.jsx";
import Payment from "../../src/pages/Payment.jsx";
import { mockApi } from "../mocks/server.js";
import { renderAt, lastCall } from "../utils.jsx";

describe("Profile page", () => {
  it("renders nothing for a logged-out visitor", async () => {
    const { calls } = mockApi({ session: "none" });
    renderAt(<Profile />, { route: "/profile" });

    await waitFor(() => expect(lastCall(calls, "GET", "/users/profile")).toBeTruthy());
    expect(screen.queryByText("Secure Comms (Email)")).not.toBeInTheDocument();
  });

  it("shows the session user's details", async () => {
    mockApi({ session: "user" });
    renderAt(<Profile />, { route: "/profile" });

    expect(await screen.findByText("riya@example.test")).toBeInTheDocument();
    expect(screen.getByText("9000000001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "riya" })).toBeInTheDocument();
  });

  const openEdit = async (container) => {
    await screen.findByText("riya@example.test");
    // the edit toggle is an icon-only button next to the name
    const toggle = [...container.querySelectorAll("button")].find((b) => !b.textContent.trim());
    await userEvent.click(toggle);
    return screen.findByRole("button", { name: /Save Changes/ });
  };

  it("current behaviour (AUDIT DEP-02 / contract M-02): save calls PUT on hard-coded localhost with a Bearer header and shows the 404 message", async () => {
    const { calls } = mockApi({ session: "user" });
    const { container } = renderAt(<Profile />, { route: "/profile" });

    const save = await openEdit(container);
    const phone = container.querySelector('input[type="tel"]');
    await userEvent.clear(phone);
    await userEvent.type(phone, "9111111111");
    await userEvent.click(save);

    expect(await screen.findByText("API Endpoint Not Found!")).toBeInTheDocument();
    const call = lastCall(calls, "PUT", "/users/profile");
    expect(call.url).toBe("http://localhost:3005/api/users/profile");
    // The form state is initialised before the session has loaded, so on a
    // direct page load the untouched username field is sent empty.
    expect(call.body).toEqual({ username: "", phone: "9111111111" });
    expect(call.authorization).toBe("Bearer undefined");
    expect(call.credentials).not.toBe("include");
  });

  it("Cancel leaves edit mode without calling the API", async () => {
    const { calls } = mockApi({ session: "user" });
    const { container } = renderAt(<Profile />, { route: "/profile" });

    await openEdit(container);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Secure Comms (Email)")).toBeInTheDocument();
    expect(lastCall(calls, "PUT", "/users/profile")).toBeUndefined();
  });

  it("delete: asks first; 'Abort' cancels without calling the API", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<Profile />, { route: "/profile" });

    await userEvent.click(await screen.findByRole("button", { name: /Purge Operative Data/ }));
    expect(screen.getByRole("button", { name: "Confirm Purge" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abort" }));

    expect(screen.getByRole("button", { name: /Purge Operative Data/ })).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/users/profile")).toBeUndefined();
  });

  it("current behaviour (contract M-02): confirm calls DELETE, gets 404, and the user stays logged in", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<Profile />, { route: "/profile" });

    await userEvent.click(await screen.findByRole("button", { name: /Purge Operative Data/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm Purge" }));

    expect(await screen.findByText("API Endpoint Not Found!")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/users/profile").url).toBe(
      "http://localhost:3005/api/users/profile",
    );
    expect(lastCall(calls, "POST", "/users/logout")).toBeUndefined();
    expect(screen.getByTestId("location")).toHaveTextContent("/profile");
  });

  it.fails("DEP-02: profile requests go to the configured API, not hard-coded localhost", async () => {
    // .env.test-style override for this one test
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
    try {
      const { calls } = mockApi({ session: "user" });
      const { container } = renderAt(<Profile />, { route: "/profile" });
      await userEvent.click(await openEdit(container));

      await waitFor(() => expect(lastCall(calls, "PUT", "/users/profile")).toBeTruthy());
      expect(lastCall(calls, "PUT", "/users/profile").url).toBe(
        "https://api.example.test/api/users/profile",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("Payment page", () => {
  const card = {
    cardName: "Test Person",
    cardNumber: "4242 4242 4242 4242",
    expiry: "12/34",
    cvv: "123",
    amount: "500",
  };

  const submit = (container) => {
    for (const [name, value] of Object.entries(card)) {
      fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { name, value } });
    }
    fireEvent.submit(container.querySelector("form"));
  };

  it("submitting shows the demo alert and sends nothing to any server", () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { calls } = mockApi({ session: "user" });
    const { container } = renderAt(<Payment />, { route: "/payment" });

    submit(container);

    expect(alert).toHaveBeenCalledWith("Processing fake payment of $500 for Test Person...");
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it.fails("SEC-19: card number and CVV are not written to the console", () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const logged = [];
    for (const level of ["log", "info", "debug", "warn", "error"]) {
      vi.spyOn(console, level).mockImplementation((...args) => logged.push(JSON.stringify(args)));
    }
    mockApi({ session: "user" });
    const { container } = renderAt(<Payment />, { route: "/payment" });

    submit(container);

    expect(logged.join("\n")).not.toContain(card.cardNumber);
    expect(logged.join("\n")).not.toContain(`"cvv":"${card.cvv}"`);
  });
});
