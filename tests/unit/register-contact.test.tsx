// Register and Contact: validation, success, error, loading.
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Register from "../../src/pages/Register";
import Contact from "../../src/pages/Contact";
import { mockApi } from "../mocks/server";
import { renderAt, lastCall, callTo, $ } from "../utils";

describe("Register page", () => {
  const fill = async (container: HTMLElement) => {
    await userEvent.type($(container, 'input[type="text"]'), "newbie");
    await userEvent.type($(container, 'input[type="email"]'), "newbie@example.test");
    await userEvent.type($(container, 'input[type="tel"]'), "9000000009");
    await userEvent.type($(container, 'input[type="password"]'), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
  };

  it("posts the form, shows the success toast and goes to /login", async () => {
    const { calls } = mockApi();
    const { container } = renderAt(<Register />, { route: "/register" });

    await fill(container);

    expect(await screen.findByText("REGISTRATION COMPLETE. LOGIN TO DEPLOY.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(callTo(calls, "POST", "/users/register").body).toEqual({
      username: "newbie",
      email: "newbie@example.test",
      phone: "9000000009",
      password: "Password123!",
    });
  });

  it("shows the server's message when the email is taken and stays on the page", async () => {
    mockApi({ register: "exists" });
    const { container } = renderAt(<Register />, { route: "/register" });

    await fill(container);

    expect(await screen.findByText("User already exists with this email")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/register");
  });

  it("does not submit while required fields are empty", async () => {
    const { calls } = mockApi();
    renderAt(<Register />, { route: "/register" });

    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(lastCall(calls, "POST", "/users/register")).toBeUndefined();
  });

  it("disables the submit button while the request is in flight", async () => {
    mockApi({ delayMs: 150 });
    const { container } = renderAt(<Register />, { route: "/register" });

    await fill(container);

    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
  });
});

describe("Contact page", () => {
  const valid = {
    name: "Meera",
    email: "meera@example.test",
    subject: "Birthday booking",
    message: "Can we book ten PCs for Saturday?",
  };

  const fill = async (values: Partial<typeof valid>) => {
    if (values.name) await userEvent.type(screen.getByPlaceholderText("John Doe"), values.name);
    if (values.email)
      await userEvent.type(screen.getByPlaceholderText("operative@nexus.com"), values.email);
    if (values.subject)
      await userEvent.type(screen.getByPlaceholderText("e.g. Pro-Circuit Inquiry"), values.subject);
    if (values.message)
      await userEvent.type(screen.getByPlaceholderText("Type your message here..."), values.message);
    await userEvent.click(screen.getByRole("button", { name: "Send Transmission" }));
  };

  it("shows every validation message and sends nothing when the form is empty", async () => {
    const { calls } = mockApi();
    renderAt(<Contact />, { route: "/contact" });

    await fill({});

    expect(await screen.findByText("Identity must be at least 2 characters long")).toBeInTheDocument();
    expect(screen.getByText("Invalid email format detected")).toBeInTheDocument();
    expect(screen.getByText("Subject needs more detail (min 5 chars)")).toBeInTheDocument();
    expect(screen.getByText("Transmission too short. Provide more intel.")).toBeInTheDocument();
    expect(lastCall(calls, "POST", "/messages")).toBeUndefined();
  });

  it("flags only the fields that are too short", async () => {
    mockApi();
    renderAt(<Contact />, { route: "/contact" });

    await fill({ ...valid, subject: "Hey", message: "Too short" });

    expect(await screen.findByText("Subject needs more detail (min 5 chars)")).toBeInTheDocument();
    expect(screen.getByText("Transmission too short. Provide more intel.")).toBeInTheDocument();
    expect(screen.queryByText("Invalid email format detected")).not.toBeInTheDocument();
  });

  it("sends { name, email, subject, message } and shows the success message", async () => {
    const { calls } = mockApi();
    renderAt(<Contact />, { route: "/contact" });

    await fill(valid);

    expect(
      await screen.findByText("Transmission successful. HQ will contact you shortly."),
    ).toBeInTheDocument();
    expect(callTo(calls, "POST", "/messages").body).toEqual(valid);
    expect(screen.getByPlaceholderText("John Doe")).toHaveValue(""); // form reset
  });

  it("DEP-01: posts to the configured API base URL, not the old Render host", async () => {
    const { calls } = mockApi();
    renderAt(<Contact />, { route: "/contact" });

    await fill(valid);

    await waitFor(() => expect(lastCall(calls, "POST", "/messages")).toBeTruthy());
    expect(callTo(calls, "POST", "/messages").url).not.toContain("onrender.com");
    expect(callTo(calls, "POST", "/messages").url).toBe("http://localhost:3005/api/messages");
  });

  it("DEP-01: follows VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
    try {
      const { calls } = mockApi();
      renderAt(<Contact />, { route: "/contact" });

      await fill(valid);

      await waitFor(() => expect(lastCall(calls, "POST", "/messages")).toBeTruthy());
      expect(callTo(calls, "POST", "/messages").url).toBe("https://api.example.test/api/messages");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("alerts when the request fails", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ contact: "error" });
    renderAt(<Contact />, { route: "/contact" });

    await fill(valid);

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "System Error: Could not establish comms with HQ. Try again.",
      ),
    );
    expect(
      screen.queryByText("Transmission successful. HQ will contact you shortly."),
    ).not.toBeInTheDocument();
  });

  it("shows the sending state while the request is in flight", async () => {
    mockApi({ delayMs: 150 });
    renderAt(<Contact />, { route: "/contact" });

    await fill(valid);

    expect(await screen.findByText("Transmitting...")).toBeInTheDocument();
  });
});
