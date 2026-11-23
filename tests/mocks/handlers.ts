// MSW handlers that behave like the real backend as documented in
// Nexus/docs/API_CONTRACT.md: same paths, status codes, envelopes and messages.
// `*/api/...` matches any origin on purpose, so tests can point
// VITE_API_BASE_URL at any host. Every call now goes through the shared API
// layer (the hard-coded hosts in Profile.jsx and Contact.jsx are gone).
import { http, HttpResponse, delay, type HttpHandler } from "msw";
import type {
  ChatMuteRequest,
  CreateBookingRequest,
  CreateMessageRequest,
  CreateTournamentRequest,
  LoginRequest,
  PlayerInput,
  RegisterRequest,
  RegisterTeamRequest,
  TeamStatusRequest,
  UpdateBookingRequest,
} from "../../src/types/api";
import * as data from "./data";

type Session = "none" | "user" | "admin";
type Level = "public" | "user" | "admin";
type Method = "get" | "post" | "put" | "delete";
type Params = Record<string, string>;

/** One request the mock backend saw, in the order it arrived. */
export interface ApiCall {
  method: string;
  url: string;
  path: string;
  /** Parsed JSON body; the raw text when it is not JSON; undefined when empty. */
  body: unknown;
  credentials: RequestCredentials;
  authorization: string | null;
}

export interface Scenario {
  session: Session;
  login: "ok" | "invalid";
  register: "ok" | "exists";
  stations: "data" | "empty" | "error";
  bookings: "data" | "empty" | "error";
  bookingById: "ok" | "forbidden";
  bookingCreate: "ok" | "clash";
  tournaments: "data" | "empty" | "error";
  messages: "data" | "empty" | "error";
  dashboard: "ok" | "error";
  contact: "ok" | "error";
  delayMs: number;
}

export const defaultScenario: Scenario = {
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
const corsHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "Access-Control-Allow-Headers":
    request.headers.get("access-control-request-headers") || "content-type",
  Vary: "Origin",
});
const withCors = (request: Request, response: Response) => {
  for (const [name, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(name, value);
  }
  return response;
};

const ok = (body: object, status = 200) => HttpResponse.json({ success: true, ...body }, { status });
const fail = (status: number, message: string) => HttpResponse.json({ success: false, message }, { status });

export function createHandlers(overrides: Partial<Scenario> = {}) {
  const scenario: Scenario = { ...defaultScenario, ...overrides };
  const state: { session: Session } = { session: scenario.session };
  const calls: ApiCall[] = [];

  const profileOf = () =>
    state.session === "admin" ? data.profileAdmin : state.session === "user" ? data.profileUser : null;

  // For routes behind guard("user"/"admin") or right after a login: there is a session.
  const sessionProfile = () => {
    const profile = profileOf();
    if (!profile) throw new Error("mock backend: no session");
    return profile;
  };

  // Migration log ML-001 (SEC-02): rosters are served to admins only; everyone
  // else gets { _id, teamName, status } per team.
  const forCaller = (tournament: (typeof data.tournaments)[number]) =>
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
  const guard = (level: Level): Response | null => {
    if (level === "public") return null;
    if (state.session === "none") return fail(401, "No token provided.");
    if (level === "admin" && state.session !== "admin")
      return fail(403, "Unauthorized. Admin Access Required.");
    return null;
  };

  // `Body` is the request type the contract documents for this route; the
  // mock trusts it, as the frontend's API layer is what is under test.
  const route = <Body = undefined>(
    method: Method,
    path: string,
    level: Level,
    resolver: (ctx: { body: Body; params: Params }) => Response,
  ): HttpHandler =>
    http[method](`*/api${path}`, async ({ request, params }) => {
      let body: unknown;
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
      return withCors(request, guard(level) || resolver({ body: body as Body, params: params as Params }));
    });

  const handlers: HttpHandler[] = [
    // CORS preflight, answered the way the `cors` middleware does.
    http.options("*/api/*", ({ request }) =>
      withCors(request, new HttpResponse(null, { status: 204 })),
    ),

    // ── Users ────────────────────────────────────────────────────────────
    route("get", "/users/profile", "user", () => ok({ user: profileOf() })),
    route<LoginRequest | undefined>("post", "/users/login", "public", ({ body }) => {
      if (scenario.login === "invalid") return fail(401, "Invalid Email or Password");
      state.session = String(body?.email).startsWith("admin") ? "admin" : "user";
      return ok({ user: data.loginUserShape(sessionProfile()) });
    }),
    route<RegisterRequest>("post", "/users/register", "public", ({ body }) => {
      if (scenario.register === "exists") return fail(422, "User already exists with this email");
      state.session = "user";
      return ok(
        {
          user: {
            _id: data.ids.user,
            email: body.email,
            username: body.username,
            phone: body.phone,
            role: "User",
          },
        },
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
    route<CreateBookingRequest>("post", "/bookings", "user", ({ body }) => {
      if (scenario.bookingCreate === "clash")
        return fail(400, "Cafe is reserved for 'Winter Clash'.");
      return ok(
        {
          message: "Deployment Confirmed!",
          booking: {
            ...data.bookings[0],
            ...body,
            _id: "65f0000000000000000b0009",
            user: sessionProfile()._id,
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
      const isOwner = booking.user._id === sessionProfile()._id;
      if (scenario.bookingById === "forbidden" || (state.session !== "admin" && !isOwner))
        return fail(403, "Forbidden Access.");
      return ok({ booking });
    }),
    route<UpdateBookingRequest>("put", "/bookings/:bookingId", "user", ({ params, body }) => {
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
    route<CreateTournamentRequest>("post", "/tournaments", "admin", ({ body }) =>
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
    route<Record<string, unknown> | undefined>("put", "/tournaments/:tournamentId", "admin", ({ params, body }) => {
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
    route<RegisterTeamRequest>("post", "/tournaments/:tournamentId/register", "user", ({ params, body }) => {
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
            captain: sessionProfile()._id,
            // the backend drops players[].email (contract M-08)
            players: (body.players || []).map(({ name, inGameId, phone }: PlayerInput, i: number) => ({
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
    route<TeamStatusRequest>("put", "/tournaments/:tournamentId/team/:teamId/status", "admin", ({ params, body }) => {
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
    route<Partial<CreateMessageRequest> | undefined>("post", "/messages", "public", ({ body }) => {
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

    // ── Live chat REST (§1.8; the socket half is mocked per test) ─────────
    route("post", "/chat/ticket", "user", () => ok({ ticket: "test-chat-ticket", expiresIn: 60 })),
    route("get", "/chat/rooms", "public", () => ok({ rooms: data.chatRooms })),
    route("get", "/chat/rooms/:roomId/messages", "user", ({ params }) =>
      data.chatRooms.some((r) => r._id === params.roomId)
        ? ok({ messages: params.roomId === data.ids.chatGeneral ? data.chatMessages : [], hasMore: false })
        : fail(404, "Room not found."),
    ),
    route("delete", "/chat/messages/:messageId", "user", ({ params }) => {
      const message = data.chatMessages.find((m) => m._id === params.messageId);
      if (!message) return fail(404, "Message not found.");
      if (state.session !== "admin" && message.user !== sessionProfile()._id) {
        return fail(403, "You can only delete your own message within 5 minutes.");
      }
      return ok({ message: "Message deleted." });
    }),
    route<ChatMuteRequest>("put", "/chat/users/:userId/mute", "admin", ({ body }) =>
      ok({
        message: body.minutes > 0 ? "User muted." : "User unmuted.",
        mutedUntil: body.minutes > 0 ? "2030-01-05T18:10:00.000Z" : null,
      }),
    ),

    // ── Fallback (app.js:33) ─────────────────────────────────────────────
    http.all("*/api/*", ({ request }) => withCors(request, fail(404, "API Endpoint Not Found!"))),
  ];

  return { handlers, calls, state, scenario };
}
