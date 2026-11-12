// Auth flow: session restore, login, logout, protected-route redirect.
import { useContext } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "../../src/context/AuthContext";
import Login from "../../src/pages/Login.jsx";
import Layout from "../../src/components/Layout";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { api } from "../../src/api";
import { mockApi } from "../mocks/server.js";
import { profileUser, profileAdmin } from "../mocks/data.js";
import { renderAt, lastCall } from "../utils.jsx";

const Session = () => {
  const { user, loading, logout } = useContext(AuthContext);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : "null"}</span>
      <button onClick={logout}>context-logout</button>
    </div>
  );
};

const sessionUser = async () => {
  await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
  const text = screen.getByTestId("user").textContent;
  return text === "null" ? null : JSON.parse(text);
};

describe("AuthContext session restore", () => {
  it("starts in a loading state", () => {
    mockApi({ session: "user", delayMs: 50 });
    renderAt(<Session />);
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });

  it("asks GET /users/profile with credentials and stores the user", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<Session />);

    expect(await sessionUser()).toEqual(profileUser);
    const call = lastCall(calls, "GET", "/users/profile");
    expect(call.url).toBe("http://localhost:3005/api/users/profile"); // fallback base URL
    expect(call.credentials).toBe("include");
    expect(call.authorization).toBeNull(); // cookie auth only
  });

  it("is logged out when the API answers 401", async () => {
    mockApi({ session: "none" });
    renderAt(<Session />);
    expect(await sessionUser()).toBeNull();
  });

  it("logout() calls POST /users/logout and clears the user", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<Session />);
    await sessionUser();

    await userEvent.click(screen.getByText("context-logout"));

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));
    expect(lastCall(calls, "POST", "/users/logout")).toBeTruthy();
  });

  it("M-23: a 401 from any later call clears the user", async () => {
    mockApi({ session: "user" });
    renderAt(<Session />);
    expect(await sessionUser()).toEqual(profileUser);

    // The cookie expires or is revoked: the next authenticated call is a 401.
    const { calls } = mockApi({ session: "none" });
    await expect(api.bookings.list()).rejects.toMatchObject({ status: 401 });

    expect(lastCall(calls, "GET", "/bookings")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));
  });

  it("a non-401 failure leaves the user logged in", async () => {
    mockApi({ session: "user" });
    renderAt(<Session />);
    expect(await sessionUser()).toEqual(profileUser);

    mockApi({ session: "user", bookings: "error" });
    await expect(api.bookings.list()).rejects.toMatchObject({ status: 500 });

    expect(screen.getByTestId("user")).not.toHaveTextContent("null");
  });
});

describe("Login page", () => {
  const fill = async (container, email, password) => {
    await userEvent.type(container.querySelector('input[type="email"]'), email);
    await userEvent.type(container.querySelector('input[type="password"]'), password);
    await userEvent.click(screen.getByRole("button", { name: "Authenticate" }));
  };

  it("logs in, shows the success toast and goes to the home page", async () => {
    const { calls } = mockApi();
    const { container } = renderAt(<Login />, { route: "/login" });

    await fill(container, "riya@example.test", "Password123!");

    expect(await screen.findByText("LOGIN SUCCESSFUL. WELCOME OPERATIVE.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/));
    const call = lastCall(calls, "POST", "/users/login");
    expect(call.body).toEqual({ email: "riya@example.test", password: "Password123!" });
    expect(call.credentials).toBe("include");
  });

  it("returns to the page the user was sent from", async () => {
    mockApi();
    const { container } = renderAt(<Login />, {
      route: { pathname: "/login", state: { from: { pathname: "/bookings" } } },
      path: "/login",
    });

    await fill(container, "riya@example.test", "Password123!");

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/bookings"));
  });

  it("shows the server's message on bad credentials and stays on the page", async () => {
    mockApi({ login: "invalid" });
    const { container } = renderAt(<Login />, { route: "/login" });

    await fill(container, "riya@example.test", "wrong");

    expect(await screen.findByText("Invalid Email or Password")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(screen.getByRole("button", { name: "Authenticate" })).toBeEnabled();
  });

  it("disables the submit button while the request is in flight", async () => {
    mockApi({ delayMs: 150 });
    const { container } = renderAt(<Login />, { route: "/login" });

    await fill(container, "riya@example.test", "Password123!");

    const submit = container.querySelector('button[type="submit"]');
    expect(submit).toBeDisabled();
    expect(submit.querySelector(".animate-spin")).not.toBeNull();
  });

  it("does not submit while required fields are empty", async () => {
    const { calls } = mockApi();
    renderAt(<Login />, { route: "/login" });

    await userEvent.click(screen.getByRole("button", { name: "Authenticate" }));

    expect(lastCall(calls, "POST", "/users/login")).toBeUndefined();
  });

  it("ML-011 (contract M-05 fixed): the user stored after login has role and phone", async () => {
    mockApi();
    const { container } = renderAt(
      <>
        <Login />
        <Session />
      </>,
      { route: "/login", routes: [{ path: "/", element: <Session /> }] },
    );
    await sessionUser();

    await fill(container, "admin@example.test", "Password123!");

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent(profileAdmin.username),
    );
    expect(JSON.parse(screen.getByTestId("user").textContent)).toEqual({
      _id: profileAdmin._id,
      email: profileAdmin.email,
      username: profileAdmin.username,
      phone: profileAdmin.phone,
      role: "Admin",
    });
  });
});

describe("Layout header", () => {
  it("logged out: shows the login link and no admin link", async () => {
    mockApi({ session: "none" });
    renderAt(<Layout />);

    expect(await screen.findByText("Identify (Login)")).toBeInTheDocument();
    expect(screen.queryByText("Command Center")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Logout")).not.toBeInTheDocument();
  });

  it("logged in as a user: shows the username and logout, no admin link", async () => {
    mockApi({ session: "user" });
    renderAt(<Layout />);

    expect(await screen.findByTitle("Logout")).toBeInTheDocument();
    expect(screen.getByText(profileUser.username)).toBeInTheDocument();
    expect(screen.queryByText("Command Center")).not.toBeInTheDocument();
  });

  it("logged in as an admin: shows the Command Center link", async () => {
    mockApi({ session: "admin" });
    renderAt(<Layout />);
    expect(await screen.findByText("Command Center")).toBeInTheDocument();
  });

  it("the logout button calls POST /users/logout", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<Layout />);

    await userEvent.click(await screen.findByTitle("Logout"));

    await waitFor(() => expect(lastCall(calls, "POST", "/users/logout")).toBeTruthy());
  });
});

describe("ProtectedRoute", () => {
  const guarded = (
    <ProtectedRoute>
      <div>SECRET AREA</div>
    </ProtectedRoute>
  );

  it("shows a spinner while the session is being checked", () => {
    mockApi({ session: "user", delayMs: 100 });
    const { container } = renderAt(guarded, { route: "/booking" });

    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByText("SECRET AREA")).not.toBeInTheDocument();
  });

  it("redirects a logged-out visitor to /login", async () => {
    mockApi({ session: "none" });
    renderAt(guarded, { route: "/booking" });

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(screen.queryByText("SECRET AREA")).not.toBeInTheDocument();
  });

  it("renders the page for a logged-in user", async () => {
    mockApi({ session: "user" });
    renderAt(guarded, { route: "/booking" });
    expect(await screen.findByText("SECRET AREA")).toBeInTheDocument();
  });
});
