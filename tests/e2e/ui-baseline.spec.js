// UI BASELINE — one screenshot per page and key state.
//
// These images are the definition of "the UI did not change". They must stay
// byte-for-byte identical through every later phase. Never run
// `npm run test:e2e:update` to make a failing phase pass: a diff here means
// the frozen UI changed.
//
// `full: false` = viewport only (used when a toast or a fixed overlay is the
// point of the shot; toasts expire while a full-page capture scrolls).
import { test, expect } from "./fixtures.js";
import { ids } from "../mocks/data.js";

const T_OPEN = `/tournament/${ids.tournamentOpen}`;
const T_FULL = `/tournament/${ids.tournamentFull}`;
const UPDATE = `/booking/update/${ids.bookingMine}`;

// [name, path, text that proves the state rendered, options]
const PAGES = {
  "logged out": {
    scenario: {},
    states: [
      ["home", "/", "Battlefield"],
      ["gallery", "/gallery", "ARMORY"],
      ["tournaments", "/tournament", "Winter Clash"],
      ["tournament-details", T_OPEN, "Night Owls"],
      ["tournament-details-full", T_FULL, "Roster Full"],
      ["contact", "/contact", "Send Transmission"],
      ["login", "/login", "Access Terminal"],
      ["register", "/register", "Enlist Now"],
      ["not-found", "/this-page-does-not-exist", "404"],
      ["protected-route-redirects-to-login", "/bookings", "Access Terminal"],
      ["profile-logged-out", "/profile", "ENTER THE"],
    ],
  },
  "logged out, empty lists": {
    scenario: { tournaments: "empty" },
    states: [["tournaments-empty", "/tournament", "No active tournaments found in the database."]],
  },
  "logged out, API errors": {
    scenario: { tournaments: "error" },
    states: [
      ["tournaments-error", "/tournament", "Failed to fetch tournaments", { full: false }],
      ["tournament-details-error", T_OPEN, "Failed to fetch intel", { full: false }],
    ],
  },
  user: {
    scenario: { session: "user" },
    states: [
      ["user-home", "/", "Battlefield"],
      ["user-booking-step1-players", "/booking", "CONFIRM 1 PLAYER"],
      ["user-bookings", "/bookings", "riya@example.test"],
      ["user-profile", "/profile", "Secure Comms (Email)"],
      ["user-payment", "/payment", "Payment Portal"],
      ["user-tournaments", "/tournament", "Winter Clash"],
      ["user-tournament-details", T_OPEN, "Enlist Squad Now"],
      ["user-update-booking-forbidden", UPDATE, "Forbidden Access.", { full: false }],
      ["user-sees-admin-shell", "/admin/users", "Operative Registry"],
    ],
  },
  "user, empty lists": {
    scenario: { session: "user", bookings: "empty", stations: "empty" },
    states: [["user-bookings-empty", "/bookings", "Radar Clear. No active deployments detected."]],
  },
  "user, API errors": {
    scenario: { session: "user", bookings: "error" },
    states: [["user-bookings-error", "/bookings", "COULD NOT SYNC WITH MAINFRAME.", { full: false }]],
  },
  admin: {
    scenario: { session: "admin" },
    states: [
      ["admin-home", "/", "Battlefield"],
      ["admin-hud", "/admin", "Live Deployments Matrix"],
      ["admin-bookings", "/admin/bookings", "kabir@example.test"],
      ["admin-messages", "/admin/messages", "Birthday booking"],
      ["admin-users", "/admin/users", "Operative Registry"],
      ["admin-settings", "/admin/settings", "Core Nexus Parameters & Settings"],
      ["admin-site-bookings", "/bookings", "kabir@example.test"],
      ["admin-tournaments", "/tournament", "Deploy Tournament"],
      ["admin-tournament-details", T_OPEN, "Edit Intel"],
      ["admin-update-booking", UPDATE, "Operative: riya"],
    ],
  },
  "admin, empty lists": {
    scenario: { session: "admin", bookings: "empty", messages: "empty", tournaments: "empty" },
    states: [
      ["admin-bookings-empty", "/admin/bookings", "No Active Deployments."],
      ["admin-messages-empty", "/admin/messages", "Inbox Empty. No incoming transmissions."],
    ],
  },
  "admin, API errors": {
    scenario: { session: "admin", bookings: "error", messages: "error" },
    states: [
      ["admin-bookings-error", "/admin/bookings", "Failed to fetch mainframe data.", { full: false }],
      ["admin-messages-error", "/admin/messages", "Failed to fetch comms from mainframe.", { full: false }],
    ],
  },
};

for (const [group, { scenario, states }] of Object.entries(PAGES)) {
  test.describe(`page: ${group}`, () => {
    test.use({ scenario });
    for (const [name, path, ready, options = {}] of states) {
      test(`${name} @mobile`, async ({ api }) => {
        await api.open(path, ready);
        await api.shot(name, { fullPage: options.full !== false });
      });
    }
  });
}

test.describe("loading states", () => {
  // Responses are held back for longer than the test runs.
  test.use({ scenario: { session: "user", delayMs: 30_000 } });

  test("session check spinner on a protected route", async ({ page, api }) => {
    await page.goto("/bookings");
    await api.tick(3000);
    await expect(page.locator(".animate-spin").first()).toBeVisible();
    await api.shot("loading-protected-route", { fullPage: false });
  });

  test("tournament list while loading", async ({ page, api }) => {
    await page.goto("/tournament");
    await api.tick(3000);
    await expect(page.getByText("Fetching Circuit Data...")).toBeVisible();
    await api.shot("loading-tournaments", { fullPage: false });
  });
});

test.describe("auth forms", () => {
  test("login: wrong credentials", async ({ page, api }) => {
    api.scenario.login = "invalid";
    await api.open("/login", "Access Terminal");
    await page.locator('input[type="email"]').fill("riya@example.test");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Authenticate" }).click();
    await api.settle();
    await expect(page.getByText("Invalid Email or Password")).toBeVisible();
    await api.shot("login-invalid-credentials", { fullPage: false });
  });

  test("login: success lands on the home page with the user in the header", async ({ page, api }) => {
    await api.open("/login", "Access Terminal");
    await page.locator('input[type="email"]').fill("riya@example.test");
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole("button", { name: "Authenticate" }).click();
    await api.settle();
    await expect(page).toHaveURL("/");
    await api.shot("login-success-home", { fullPage: false });
  });

  test("register: email already in use", async ({ page, api }) => {
    api.scenario.register = "exists";
    await api.open("/register", "Enlist Now");
    const inputs = page.locator("form input");
    const count = await inputs.count();
    for (let i = 0; i < count; i += 1) {
      const type = await inputs.nth(i).getAttribute("type");
      await inputs
        .nth(i)
        .fill(type === "email" ? "riya@example.test" : type === "password" ? "Password123!" : type === "tel" ? "9000000001" : "riya");
    }
    await page.locator('form button[type="submit"]').click();
    await api.settle();
    await expect(page.getByText("User already exists with this email")).toBeVisible();
    await api.shot("register-email-exists", { fullPage: false });
  });

  test("logout from the header", async ({ page, api }) => {
    api.state.session = "user";
    await api.open("/", "Battlefield");
    await page.locator("header button, nav button").filter({ hasNotText: /\S/ }).first().click();
    await api.settle();
    await expect(page.getByText("IDENTIFY (LOGIN)")).toBeVisible();
    await api.shot("logout-done", { fullPage: false });
  });
});

test.describe("contact form", () => {
  test("validation messages on an empty form", async ({ page, api }) => {
    await api.open("/contact", "Send Transmission");
    await page.getByRole("button", { name: "Send Transmission" }).click();
    await api.settle();
    await expect(page.getByText("Identity must be at least 2 characters long")).toBeVisible();
    await api.shot("contact-validation");
  });

  const fill = async (page) => {
    await page.getByPlaceholder("John Doe").fill("Meera");
    await page.getByPlaceholder("operative@nexus.com").fill("meera@example.test");
    await page.getByPlaceholder("e.g. Pro-Circuit Inquiry").fill("Birthday booking");
    await page.getByPlaceholder("Type your message here...").fill("Can we book ten PCs for Saturday?");
    await page.getByRole("button", { name: "Send Transmission" }).click();
  };

  test("sent", async ({ page, api }) => {
    await api.open("/contact", "Send Transmission");
    await fill(page);
    await api.settle();
    await api.shot("contact-sent", { fullPage: false });
  });

  test("server error", async ({ page, api }) => {
    api.scenario.contact = "error";
    let alertText = "";
    page.on("dialog", (dialog) => {
      alertText = dialog.message();
      dialog.accept();
    });
    await api.open("/contact", "Send Transmission");
    await fill(page);
    await api.settle();
    expect(alertText).toBe("System Error: Could not establish comms with HQ. Try again.");
    await api.shot("contact-error", { fullPage: false });
  });
});

test.describe("booking flow (user)", () => {
  test.use({ scenario: { session: "user" } });

  test("wizard: stations → details → confirmation", async ({ page, api }) => {
    await api.open("/booking", "CONFIRM 1 PLAYER");
    await page.locator('input[type="range"]').fill("2");
    await page.getByText("CONFIRM 2 PLAYERS").click();
    await api.settle();
    await expect(page.getByText("PC-01")).toBeVisible();
    await api.shot("booking-step2-stations");

    await page.getByText("PC-01", { exact: true }).click();
    await page.getByText("PC-02", { exact: true }).click();
    await api.settle();
    await api.shot("booking-step2-stations-selected");

    await page.getByRole("button", { name: "Confirm Deployment" }).click();
    await api.settle();
    await expect(page.getByPlaceholder("CONTACT NUMBER")).toBeVisible();
    await api.shot("booking-step3-details");

    await page.getByPlaceholder("CONTACT NUMBER").fill("9123456780");
    await page.getByRole("button", { name: "FINALIZE DEPLOYMENT" }).click();
    await api.settle();
    await expect(page.getByText("MISSION ACCOMPLISHED")).toBeVisible();
    await api.shot("booking-step4-confirmed");
  });

  test("wizard: tournament clash error", async ({ page, api }) => {
    api.scenario.bookingCreate = "clash";
    await api.open("/booking", "CONFIRM 1 PLAYER");
    await page.getByText("CONFIRM 1 PLAYER").click();
    await api.settle();
    await page.getByText("PC-01", { exact: true }).click();
    await api.settle();
    await page.getByRole("button", { name: "Confirm Deployment" }).click();
    await api.settle();
    await page.getByPlaceholder("CONTACT NUMBER").fill("9123456780");
    await page.getByRole("button", { name: "FINALIZE DEPLOYMENT" }).click();
    await api.settle();
    await expect(page.getByText("Cafe is reserved for 'Winter Clash'.")).toBeVisible();
    await api.shot("booking-clash-error", { fullPage: false });
  });

  test("wizard: no stations in the database", async ({ page, api }) => {
    api.scenario.stations = "empty";
    await api.open("/booking", "CONFIRM 1 PLAYER");
    await page.getByText("CONFIRM 1 PLAYER").click();
    await api.settle();
    await expect(page.getByText("No Stations Found in Database. Run Seed Script.")).toBeVisible();
    await api.shot("booking-stations-empty");
  });

  test("list: cancel confirmation and result", async ({ page, api }) => {
    await api.open("/bookings", "riya@example.test");
    await page.getByRole("button", { name: /Abort/ }).click();
    await api.settle();
    await expect(page.getByText("Abort Mission?")).toBeVisible();
    await api.shot("bookings-cancel-dialog", { fullPage: false });

    await page.getByRole("button", { name: "Confirm Abort" }).click();
    await api.settle();
    await expect(page.getByText("DEPLOYMENT ABORTED SUCCESSFULLY.")).toBeVisible();
    await api.shot("bookings-cancelled", { fullPage: false });
  });

  test("profile: edit form and delete confirmation", async ({ page, api }) => {
    await api.open("/profile", "Secure Comms (Email)");
    await page.getByRole("button", { name: /Purge Operative Data/ }).click();
    await api.settle();
    await expect(page.getByRole("button", { name: "Confirm Purge" })).toBeVisible();
    await api.shot("profile-delete-confirm");

    await page.getByRole("button", { name: "Abort" }).click();
    await api.settle();
    await page.locator("h1 + *, h1").first().waitFor();
    await page.locator("main button, section button, div button").filter({ hasNotText: /\S/ }).last().click();
    await api.settle();
    await expect(page.getByRole("button", { name: /Save Changes/ })).toBeVisible();
    await api.shot("profile-edit");

    await page.getByRole("button", { name: /Save Changes/ }).click();
    await api.settle();
    await expect(page.getByText("API Endpoint Not Found!")).toBeVisible();
    await api.shot("profile-save-error", { fullPage: false });
  });

  test("tournament: registration form, duplicate name, success", async ({ page, api }) => {
    await api.open("/tournament", "Winter Clash");
    await page.getByRole("button", { name: /Enlist/ }).first().click();
    await api.settle();
    await expect(page.getByText("Enlist: Winter Clash")).toBeVisible();
    await api.shot("tournament-register-form", { fullPage: false });

    const fillRoster = async (teamName) => {
      await page.getByPlaceholder("SQUAD NAME (e.g. Nexus Elite)").fill(teamName);
      for (let i = 0; i < 5; i += 1) {
        await page.getByPlaceholder("REAL NAME").nth(i).fill(i ? `Mate ${i}` : "riya");
        await page.getByPlaceholder("IN-GAME ID").nth(i).fill(`tag#${i}`);
        await page.getByPlaceholder("EMAIL").nth(i).fill(i ? `mate${i}@example.test` : "riya@example.test");
        await page.getByPlaceholder("PHONE").nth(i).fill(`900000001${i}`);
      }
      await page.getByRole("button", { name: "CONFIRM FULL ROSTER" }).click();
      await api.settle();
    };

    await fillRoster("Night Owls");
    await expect(page.getByText("You or this team name are already registered")).toBeVisible();
    await api.shot("tournament-register-duplicate", { fullPage: false });

    await fillRoster("Nexus Elite");
    await expect(page.getByRole("button", { name: "Acknowledge & Refresh" })).toBeVisible();
    await api.shot("tournament-register-success", { fullPage: false });
  });
});

test.describe("admin", () => {
  test.use({ scenario: { session: "admin" } });

  test("dashboard: error state", async ({ page, api }) => {
    api.scenario.dashboard = "error";
    await page.goto("/admin");
    // React Query retries three times with back-off before showing the error.
    for (let i = 0; i < 12; i += 1) await api.settle();
    await expect(page.getByText("Connection to Mainframe Lost. Check Backend Server.")).toBeVisible();
    await api.shot("admin-hud-error");
  });

  test("bookings: force-abort dialog and result", async ({ page, api }) => {
    await api.open("/admin/bookings", "kabir@example.test");
    await page.getByTitle("Force Abort Deployment").first().click();
    await api.settle();
    await expect(page.getByText("Force Abort?")).toBeVisible();
    await api.shot("admin-bookings-abort-dialog", { fullPage: false });

    await page.getByRole("button", { name: "Confirm Erase" }).click();
    await api.settle();
    await expect(page.getByText("DEPLOYMENT ABORTED & ERASED.")).toBeVisible();
    await api.shot("admin-bookings-aborted", { fullPage: false });
  });

  test("bookings: squads tab, roster, approve", async ({ page, api }) => {
    await api.open("/admin/bookings", "kabir@example.test");
    await page.getByRole("button", { name: "Circuit Squads" }).click();
    await api.settle();
    await expect(page.getByText("Night Owls")).toBeVisible();
    await api.shot("admin-squads");

    await page.getByText("Night Owls").click();
    await api.settle();
    await expect(page.getByText("Full Roster Intel")).toBeVisible();
    await api.shot("admin-squads-roster");

    await page.getByRole("button", { name: /Approve Roster/ }).click();
    await api.settle();
    await expect(page.getByText("Squad APPROVED!")).toBeVisible();
    await api.shot("admin-squads-approved", { fullPage: false });
  });

  test("messages: open, mark read, delete dialog", async ({ page, api }) => {
    await api.open("/admin/messages", "Birthday booking");
    await page.getByText("Birthday booking").click();
    await api.settle();
    await expect(page.getByText("meera@example.test")).toBeVisible();
    await api.shot("admin-message-open");

    await page.getByRole("button", { name: /Mark Read/ }).click();
    await api.settle();
    await expect(page.getByText("Transmission marked as Read.")).toBeVisible();
    await api.shot("admin-message-marked-read", { fullPage: false });

    await page.getByRole("button", { name: /Delete/ }).click();
    await api.settle();
    await expect(page.getByText("Delete Comms?")).toBeVisible();
    await api.shot("admin-message-delete-dialog", { fullPage: false });
  });

  test("tournaments: create form", async ({ page, api }) => {
    await api.open("/tournament", "Deploy Tournament");
    await page.getByRole("button", { name: /Deploy Tournament/ }).click();
    await api.settle();
    await expect(page.getByRole("button", { name: "INITIALIZE CIRCUIT" })).toBeVisible();
    await api.shot("admin-tournament-create-form", { fullPage: false });
  });

  test("tournament details: edit form and delete dialog", async ({ page, api }) => {
    await api.open(`/tournament/${ids.tournamentOpen}`, "Edit Intel");
    await page.getByRole("button", { name: /Edit Intel/ }).click();
    await api.settle();
    await expect(page.getByRole("button", { name: "CONFIRM UPDATE" })).toBeVisible();
    await api.shot("admin-tournament-edit-form", { fullPage: false });

    await page.keyboard.press("Escape");
    await page.reload();
    await api.settle();
    await page.getByRole("button", { name: /^\s*Abort\s*$/ }).click();
    await api.settle();
    await expect(page.getByText("Abort Tournament?")).toBeVisible();
    await api.shot("admin-tournament-delete-dialog", { fullPage: false });
  });
});
