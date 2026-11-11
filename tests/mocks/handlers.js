// MSW handlers that behave like the real backend as documented in
// Nexus/docs/API_CONTRACT.md: same paths, status codes, envelopes and messages.
// `*/api/...` matches any origin on purpose: the app currently calls three
// different hosts (configured base URL, hard-coded localhost in Profile.jsx,
// and the dead Render host in Contact.jsx).
import { http, HttpResponse, delay } from "msw";
import * as data from "./data.js";

export const defaultScenario = {
  session: "none", // "none" | "user" | "admin"
  login: "ok", // "ok" | "invalid"
  register: "ok", // "ok" | "exists"
  stations: "data", // "data" | "empty" | "error"
  bookings: "data", // "data" | "empty" | "error"
  bookingById: "ok", // "ok" | "forbidden"
  bookingCreate: "ok", // "ok" | "clash"
  tournaments: "data", // "data" | "empty" | "error"
  messages: "data", // "data" | "empty" | "error"
  dashboard: "ok", // "ok" | "error"
  contact: "ok", // "ok" | "error"
  delayMs: 0,
};

// The real backend answers with credentialed CORS headers (app.js:15-20); the
// browser (and jsdom) refuse cross-origin responses without them.
const corsHeaders = (request) => ({
  "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "Access-Control-Allow-Headers":
    request.headers.get("access-control-request-headers") || "content-type",
  Vary: "Origin",
});
const withCors = (request, response) => {
  for (const [name, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(name, value);
  }
  return response;
};

const ok = (body, status = 200) => HttpResponse.json({ success: true, ...body }, { status });
const fail = (status, message) => HttpResponse.json({ success: false, message }, { status });

export function createHandlers(overrides = {}) {
  const scenario = { ...defaultScenario, ...overrides };
  const state = { session: scenario.session };
  const calls = [];

  const profileOf = () =>
    state.session === "admin" ? data.profileAdmin : state.session === "user" ? data.profileUser : null;

  // Migration log ML-001 (SEC-02): rosters are served to admins only; everyone
  // else gets { _id, teamName, status } per team.
  const forCaller = (tournament) =>
    state.session === "admin"
      ? tournament
      : {
          ...tournament,
          registeredTeams: tournament.registeredTeams.map(({ _id, teamName, status }) => ({
            _id,
            teamName,
            status,
          })),
        };

  // Mirrors isLoggedIn / isAdmin.
  const guard = (level) => {
    if (level === "public") return null;
    if (state.session === "none") return fail(401, "No token provided.");
    if (level === "admin" && state.session !== "admin")
      return fail(403, "Unauthorized. Admin Access Required.");
    return null;
  };

  const route = (method, path, level, resolver) =>
    http[method](`*/api${path}`, async ({ request, params }) => {
      let body;
      const text = await request.clone().text();
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = text;
      }
      calls.push({
        method: request.method,
        url: request.url,
        path: new URL(request.url).pathname,
        body,
        credentials: request.credentials,
        authorization: request.headers.get("authorization"),
      });
      if (scenario.delayMs) await delay(scenario.delayMs);
      return withCors(request, guard(level) || resolver({ body, params }));
    });

  const handlers = [
    // CORS preflight, answered the way the `cors` middleware does.
    http.options("*/api/*", ({ request }) =>
      withCors(request, new HttpResponse(null, { status: 204 })),
    ),

    // ── Users ────────────────────────────────────────────────────────────
    route("get", "/users/profile", "user", () => ok({ user: profileOf() })),
    route("post", "/users/login", "public", ({ body }) => {
      if (scenario.login === "invalid") return fail(401, "Invalid Email or Password");
      state.session = String(body?.email).startsWith("admin") ? "admin" : "user";
      return ok({ user: data.loginUserShape(profileOf()) });
    }),
    route("post", "/users/register", "public", ({ body }) => {
      if (scenario.register === "exists") return fail(422, "User already exists with this email");
      state.session = "user";
      return ok(
        { user: { _id: data.ids.user, email: body.email, username: body.username } },
        201,
      );
    }),
    route("post", "/users/logout", "public", () => {
      state.session = "none";
      return ok({ message: "Logged out successfully." });
    }),
    // PUT/DELETE /users/profile do not exist on the backend (contract M-02).
    route("put", "/users/profile", "public", () => fail(404, "API Endpoint Not Found!")),
    route("delete", "/users/profile", "public", () => fail(404, "API Endpoint Not Found!")),

    // ── Stations ─────────────────────────────────────────────────────────
    route("get", "/stations", "public", () => {
      if (scenario.stations === "error") return fail(500, "Error loading seat map data");
      return ok({ stations: scenario.stations === "empty" ? [] : data.stations });
    }),

    // ── Bookings ─────────────────────────────────────────────────────────
    route("get", "/bookings", "user", () => {
      if (scenario.bookings === "error") return fail(500, "Sync Error.");
      return ok({ bookings: scenario.bookings === "empty" ? [] : data.bookings });
    }),
    route("post", "/bookings", "user", ({ body }) => {
      if (scenario.bookingCreate === "clash")
        return fail(400, "Cafe is reserved for 'Winter Clash'.");
      return ok(
        {
          message: "Deployment Confirmed!",
          booking: {
            ...data.bookings[0],
            ...body,
            _id: "65f0000000000000000b0009",
            user: profileOf()._id,
            status: "Active",
          },
        },
        201,
      );
    }),
    route("get", "/bookings/:bookingId", "user", ({ params }) => {
      const booking = data.bookingById(params.bookingId);
      if (!booking) return fail(404, "Not found");
      // Owner or admin only (SEC-17 fixed, migration log ML-009).
      const isOwner = booking.user?._id === profileOf()._id;
      if (scenario.bookingById === "forbidden" || (state.session !== "admin" && !isOwner))
        return fail(403, "Forbidden Access.");
      return ok({ booking });
    }),
    route("put", "/bookings/:bookingId", "user", ({ params, body }) => {
      const booking = data.bookings.find((b) => b._id === params.bookingId);
      if (!booking) return fail(404, "Not found");
      return ok({ message: "Re-calibrated!", booking: { ...booking, ...body, user: booking.user._id } });
    }),
    route("delete", "/bookings/:bookingId", "user", ({ params }) => {
      if (!data.bookings.some((b) => b._id === params.bookingId)) return fail(404, "Not found.");
      return ok({ message: "Deployment Aborted." });
    }),

    // ── Tournaments ──────────────────────────────────────────────────────
    route("get", "/tournaments", "public", () => {
      if (scenario.tournaments === "error") return fail(500, "Error fetching tournaments");
      return ok({
        tournaments: scenario.tournaments === "empty" ? [] : data.tournaments.map(forCaller),
      });
    }),
    route("get", "/tournaments/:tournamentId", "public", ({ params }) => {
      if (scenario.tournaments === "error") return fail(500, "Error fetching tournament details");
      const tournament = data.tournaments.find((t) => t._id === params.tournamentId);
      return tournament
        ? ok({ tournament: forCaller(tournament) })
        : fail(404, "Tournament not found");
    }),
    route("post", "/tournaments", "admin", ({ body }) =>
      ok(
        {
          tournament: {
            ...data.tournaments[0],
            ...body,
            _id: "65f0000000000000000c0009",
            maxTeams: Number(body.maxTeams),
            registeredTeams: [],
            status: "Upcoming",
          },
        },
        201,
      ),
    ),
    route("put", "/tournaments/:tournamentId", "admin", ({ params, body }) => {
      const tournament = data.tournaments.find((t) => t._id === params.tournamentId);
      if (!tournament) return fail(404, "Tournament not found");
      const { selectedDate, startTime, endTime, ...known } = body || {};
      return ok({
        message: "Tournament updated successfully!",
        tournament: { ...tournament, ...known },
      });
    }),
    route("delete", "/tournaments/:tournamentId", "admin", ({ params }) =>
      data.tournaments.some((t) => t._id === params.tournamentId)
        ? ok({ message: "Tournament deleted successfully. All time slots are now free!" })
        : fail(404, "Tournament not found"),
    ),
    route("post", "/tournaments/:tournamentId/register", "user", ({ params, body }) => {
      const tournament = data.tournaments.find((t) => t._id === params.tournamentId);
      if (!tournament) return fail(404, "Tournament not found");
      if (tournament.registeredTeams.length >= tournament.maxTeams)
        return fail(400, "Tournament is full");
      if (tournament.registeredTeams.some((t) => t.teamName === body.teamName))
        return fail(400, "You or this team name are already registered");
      return ok(
        {
          message: "Team registered successfully",
          team: {
            _id: "65f0000000000000000d0009",
            teamName: body.teamName,
            captain: profileOf()._id,
            // the backend drops players[].email (contract M-08)
            players: (body.players || []).map(({ name, inGameId, phone }, i) => ({
              _id: `65f0000000000000000f01${String(i).padStart(2, "0")}`,
              name,
              inGameId,
              phone,
            })),
            status: "Pending",
            assignedPCs: [],
          },
        },
        201,
      );
    }),
    route("put", "/tournaments/:tournamentId/team/:teamId/status", "admin", ({ params, body }) => {
      const tournament = data.tournaments.find((t) => t._id === params.tournamentId);
      if (!tournament) return fail(404, "Tournament not found");
      const team = tournament.registeredTeams.find((t) => t._id === params.teamId);
      if (!team) return fail(404, "Squad not found in this tournament.");
      if (body.status === "Rejected")
        return ok({ message: "Squad rejected and removed from roster.", action: "deleted" });
      return ok({
        message: `Squad ${body.status} successfully!`,
        team: { ...team, status: body.status },
        action: "updated",
      });
    }),

    // ── Messages ─────────────────────────────────────────────────────────
    route("post", "/messages", "public", ({ body }) => {
      if (scenario.contact === "error")
        return fail(500, "Something went wrong, please try again later!");
      if (!body?.name || !body?.email || !body?.message)
        return fail(400, "Please fill all the required fields.");
      return ok({ message: "Transmission sent successfully!" }, 201);
    }),
    route("get", "/messages", "admin", () => {
      if (scenario.messages === "error") return fail(500, "Error fetching messages");
      return ok({ messages: scenario.messages === "empty" ? [] : data.messages });
    }),
    route("put", "/messages/:id/read", "admin", ({ params }) => {
      const message = data.messages.find((m) => m._id === params.id);
      return message
        ? ok({ message: "Marked as Read", data: { ...message, status: "Read" } })
        : fail(404, "Transmission not found");
    }),
    route("delete", "/messages/:id", "admin", ({ params }) =>
      data.messages.some((m) => m._id === params.id)
        ? ok({ message: "Transmission deleted" })
        : fail(404, "Transmission not found"),
    ),

    // ── Admin ────────────────────────────────────────────────────────────
    route("get", "/admin/dashboard", "admin", () =>
      scenario.dashboard === "error"
        ? fail(500, "Error fetching God Eye data")
        : ok({ data: data.dashboard }),
    ),

    // ── Fallback (app.js:33) ─────────────────────────────────────────────
    http.all("*/api/*", ({ request }) => withCors(request, fail(404, "API Endpoint Not Found!"))),
  ];

  return { handlers, calls, state, scenario };
}
