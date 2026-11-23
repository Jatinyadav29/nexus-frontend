// Request and response types for the Nexus API, written to match
// Nexus/docs/API_CONTRACT.md (the source of truth) section by section.
// Dates travel as ISO 8601 strings; ids are MongoDB ObjectId strings.
//
// These types describe the wire format. Where a screen expects a different
// shape, the mapping lives in src/api/mappers.ts, not here.

/** 24-character hex MongoDB ObjectId, serialised as a string. */
export type ObjectId = string;
/** ISO 8601 date-time string. */
export type IsoDate = string;

// ── §0 Conventions ──────────────────────────────────────────────────────────

/** Every response: `{ success, message?, ...payload }`. */
export interface ApiEnvelope {
  success: boolean;
  message?: string;
}

/** Error responses (400/401/403/404/409/413/415/422/429/500). */
export interface ApiErrorBody {
  success: false;
  message: string;
}

/** A success envelope carrying `payload` under its endpoint-specific key. */
export type ApiSuccess<Payload extends object = object> = ApiEnvelope & {
  success: true;
} & Payload;

export type UserRole = "User" | "Admin";
export type StationType = "PC" | "Console";
export type StationStatus = "Available" | "Occupied" | "Maintenance" | "Offline";
export type BookingType = StationType;
export type BookingStatus = "Active" | "Completed" | "Cancelled";
export type TeamStatus = "Pending" | "Approved" | "Rejected";
export type TournamentStatus =
  | "Upcoming"
  | "Registration Open"
  | "Live"
  | "Completed"
  | "Cancelled";
export type MessageStatus = "Unread" | "Read";

export interface TimeRange {
  start: IsoDate;
  end: IsoDate;
}

// ── §1.1 Users ──────────────────────────────────────────────────────────────

/** `user` as returned by login and register (ML-011). */
export interface AuthUser {
  _id: ObjectId;
  email: string;
  username: string;
  phone?: string;
  role: UserRole;
}

/** `user` as returned by `GET /users/profile` (password excluded). */
export interface ProfileUser extends AuthUser {
  wishlist: string[];
  /** Always empty today (QUAL-11). */
  bookings: unknown[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** `POST /users/register` */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
}
export type RegisterResponse = ApiSuccess<{ user: AuthUser }>;

/** `POST /users/login` */
export interface LoginRequest {
  email: string;
  password: string;
}
export type LoginResponse = ApiSuccess<{ user: AuthUser }>;

/** `POST /users/logout` — no body; always 200. */
export type LogoutResponse = ApiSuccess<{ message: string }>;

/** `GET /users/profile` */
export type ProfileResponse = ApiSuccess<{ user: ProfileUser }>;

/** `POST /users/wishlist` — toggles one station. */
export interface WishlistRequest {
  stationId: string;
}
export type WishlistResponse = ApiSuccess<{ message: string; wishlist: string[] }>;

// ── §1.2 Stations ───────────────────────────────────────────────────────────

/** Public station shape (ML-013). */
export interface Station {
  _id: ObjectId;
  /** e.g. "PC-01", "C-05" */
  stationId: string;
  type: StationType;
  status: StationStatus;
}

/** Full station document, returned only by the admin endpoints. */
export interface AdminStation extends Station {
  assignedUser: ObjectId | null;
  activeBooking: ObjectId | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** `GET /stations` */
export type StationsResponse = ApiSuccess<{ stations: Station[] }>;

// ── §1.3 Bookings ───────────────────────────────────────────────────────────

/** `Booking.user` when the server populates it. */
export interface BookingUserRef {
  _id: ObjectId;
  username: string;
  email?: string;
}

export interface Booking {
  _id: ObjectId;
  user: ObjectId | BookingUserRef;
  /** stationId values, e.g. "PC-01" */
  stations: string[];
  name: string;
  email: string;
  phone: string;
  bookingType: BookingType;
  membersCount: number;
  membersName: string[];
  bookingTime: TimeRange;
  totalAmount: number;
  status: BookingStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** `POST /bookings` — `totalAmount` is ignored by the server (ML-002). */
export interface CreateBookingRequest {
  name: string;
  email: string;
  phone: string;
  bookingType: BookingType;
  /** 1–60 */
  membersCount: number;
  membersName?: string[];
  bookingTime: TimeRange;
  stations: string[];
  totalAmount?: number;
}
export type CreateBookingResponse = ApiSuccess<{ message: string; booking: Booking }>;

/** `GET /bookings` */
export type BookingsResponse = ApiSuccess<{ bookings: Booking[] }>;

/** `GET /bookings/:bookingId` */
export type BookingResponse = ApiSuccess<{ booking: Booking }>;

/** `PUT /bookings/:bookingId` — `totalAmount` is ignored by the server. */
export interface UpdateBookingRequest {
  phone?: string;
  bookingTime?: TimeRange;
  totalAmount?: number;
}
export type UpdateBookingResponse = ApiSuccess<{ message: string; booking: Booking }>;

/** `DELETE /bookings/:bookingId` */
export type DeleteBookingResponse = ApiSuccess<{ message: string }>;

// ── §1.4 Tournaments ────────────────────────────────────────────────────────

export interface Player {
  _id: ObjectId;
  name: string;
  inGameId: string;
  phone: string;
}

/** Full roster entry — only sent to admins (ML-001). */
export interface Team {
  _id: ObjectId;
  teamName: string;
  captain: ObjectId;
  players: Player[];
  status: TeamStatus;
  assignedPCs: ObjectId[];
}

/** Roster entry for everyone else (ML-001). */
export interface PublicTeam {
  _id: ObjectId;
  teamName: string;
  status: TeamStatus;
}

export interface Tournament {
  _id: ObjectId;
  title: string;
  game: string;
  description?: string;
  prize: string;
  entryFee: string;
  format: string;
  thumbnail: string;
  rules: string[];
  eventTime: TimeRange;
  maxTeams: number;
  /** `Team[]` for an admin caller, `PublicTeam[]` otherwise. */
  registeredTeams: Array<Team | PublicTeam>;
  status: TournamentStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** `GET /tournaments` */
export type TournamentsResponse = ApiSuccess<{ tournaments: Tournament[] }>;

/** `GET /tournaments/:tournamentId` */
export type TournamentResponse = ApiSuccess<{ tournament: Tournament }>;

/** `POST /tournaments` (admin) */
export interface CreateTournamentRequest {
  title: string;
  game: string;
  description?: string;
  eventTime: TimeRange;
  maxTeams: number;
}
export type CreateTournamentResponse = ApiSuccess<{ tournament: Tournament }>;

/** `PUT /tournaments/:tournamentId` (admin) — any subset; other keys ignored. */
export interface UpdateTournamentRequest {
  title?: string;
  game?: string;
  description?: string;
  eventTime?: TimeRange;
  /** 1–256; numeric strings accepted */
  maxTeams?: number | string;
  status?: TournamentStatus;
  prize?: string;
  entryFee?: string;
  format?: string;
  /** http(s) URL */
  thumbnail?: string;
  rules?: string[];
}
export type UpdateTournamentResponse = ApiSuccess<{
  message: string;
  tournament: Tournament;
}>;

/** `DELETE /tournaments/:tournamentId` (admin) */
export type DeleteTournamentResponse = ApiSuccess<{ message: string }>;

/** `POST /tournaments/:tournamentId/register` — 5–6 players. */
export interface PlayerInput {
  name: string;
  inGameId: string;
  phone: string;
}
export interface RegisterTeamRequest {
  /** 2–40 chars */
  teamName: string;
  players: PlayerInput[];
}
export type RegisterTeamResponse = ApiSuccess<{ message: string; team: Team }>;

/** `PUT /tournaments/:tournamentId/team/:teamId/status` (admin) */
export interface TeamStatusRequest {
  status: TeamStatus;
}
export type TeamStatusResponse =
  | ApiSuccess<{ message: string; action: "deleted" }>
  | ApiSuccess<{ message: string; action: "updated"; team: Team }>;

// ── §1.5 Messages ───────────────────────────────────────────────────────────

export interface Message {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string;
  /** Defaults to "No Subject". */
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: IsoDate;
}

/** `POST /messages` (public); other keys are dropped. */
export interface CreateMessageRequest {
  /** ≤100 chars */
  name: string;
  email: string;
  /** ≤5000 chars */
  message: string;
  phone?: string;
  /** ≤200 chars */
  subject?: string;
}
export type CreateMessageResponse = ApiSuccess<{ message: string }>;

/** `GET /messages` (admin) */
export type MessagesResponse = ApiSuccess<{ messages: Message[] }>;

/** `PUT /messages/:id/read` (admin) */
export type MarkMessageReadResponse = ApiSuccess<{ message: string; data: Message }>;

/** `DELETE /messages/:id` (admin) */
export type DeleteMessageResponse = ApiSuccess<{ message: string }>;

// ── §1.6 Admin ──────────────────────────────────────────────────────────────

export interface DashboardBooking extends Omit<Booking, "user"> {
  user: BookingUserRef;
}

export interface DashboardData {
  totalStations: number;
  stationsData: AdminStation[];
  activeBookingsCount: number;
  activeBookingsData: DashboardBooking[];
  totalGamers: number;
}

/** `GET /admin/dashboard` */
export type DashboardResponse = ApiSuccess<{ data: DashboardData }>;

/** `PUT /admin/station/:stationId` — `:stationId` is the station's `_id`. */
export interface StationStatusRequest {
  status: StationStatus;
}
export type StationStatusResponse = ApiSuccess<{ message: string; station: AdminStation }>;

/** `PUT /admin/booking/:bookingId/cancel` */
export type AdminCancelBookingResponse = ApiSuccess<{ message: string }>;

// ── Health (§0) ─────────────────────────────────────────────────────────────

export type HealthResponse =
  | { success: true; status: "ok" }
  | { success: false; status: "unavailable" };

// ── §1.8 Live chat (ML-016) ────────────────────────────────────────────────
// REST below; the real-time half is Socket.IO namespace /chat (see the event
// maps). Text is plain text: render it as text, never as HTML.

export type ChatRoomType = "lobby" | "tournament" | "announcements";

export interface ChatRoom {
  _id: ObjectId;
  /** "general", "announcements" or "tournament-<tournamentId>". */
  slug: string;
  name: string;
  type: ChatRoomType;
  tournament: ObjectId | null;
  /** Only admins may post. */
  readOnly: boolean;
}

export interface ChatMessage {
  _id: ObjectId;
  room: ObjectId;
  user: ObjectId;
  username: string;
  text: string;
  createdAt: IsoDate;
}

export interface ChatPresenceUser {
  _id: ObjectId;
  username: string;
}

export interface ChatPresence {
  roomId: ObjectId;
  count: number;
  /** At most 100. */
  users: ChatPresenceUser[];
}

/** `POST /chat/ticket` (User). The ticket is valid for `expiresIn` seconds. */
export type ChatTicketResponse = ApiSuccess<{ ticket: string; expiresIn: number }>;
/** `GET /chat/rooms` (public). */
export type ChatRoomsResponse = ApiSuccess<{ rooms: ChatRoom[] }>;
/** `GET /chat/rooms/:roomId/messages?before&limit` (User). Oldest first. */
export type ChatMessagesResponse = ApiSuccess<{ messages: ChatMessage[]; hasMore: boolean }>;
export interface ChatHistoryQuery {
  /** A message `_id`: return messages older than it. */
  before?: ObjectId;
  /** 1–100, default 50. */
  limit?: number;
}
/** `DELETE /chat/messages/:messageId` (author within 5 minutes, or Admin). */
export type DeleteChatMessageResponse = ApiSuccess<{ message: string }>;
/** `PUT /chat/users/:userId/mute` (Admin). `minutes: 0` lifts the mute. */
export interface ChatMuteRequest {
  minutes: number;
}
export type ChatMuteResponse = ApiSuccess<{ message: string; mutedUntil: IsoDate | null }>;

// Socket.IO acks use the REST envelope.
export type ChatAckError = ApiErrorBody & { mutedUntil?: IsoDate };
export type ChatJoinAck =
  | ApiSuccess<{ room: ChatRoom; history: ChatMessage[]; presence: ChatPresence }>
  | ChatAckError;
export type ChatLeaveAck = ApiSuccess | ChatAckError;
export type ChatSendAck =
  | ApiSuccess<{ chatMessage: ChatMessage; duplicate: boolean }>
  | ChatAckError;

export interface ChatSendPayload {
  roomId: ObjectId;
  /** Trimmed by the server; 1–500 characters. */
  text: string;
  /** 1–64 of A–Z a–z 0–9 _ -. Reusing it makes a resend idempotent. */
  clientId: string;
}

export interface ChatServerToClientEvents {
  "message:new": (message: ChatMessage) => void;
  "message:deleted": (payload: { roomId: ObjectId; id: ObjectId }) => void;
  presence: (payload: ChatPresence) => void;
  typing: (payload: { roomId: ObjectId; userId: ObjectId; username: string }) => void;
}

export interface ChatClientToServerEvents {
  "room:join": (payload: { roomId: ObjectId }, ack: (res: ChatJoinAck) => void) => void;
  "room:leave": (payload: { roomId: ObjectId }, ack: (res: ChatLeaveAck) => void) => void;
  "message:send": (payload: ChatSendPayload, ack: (res: ChatSendAck) => void) => void;
  typing: (payload: { roomId: ObjectId }) => void;
}

// ── Called by the frontend, not implemented by the backend (contract M-02) ──
// Profile still calls these; until the routes exist they answer 404
// "API Endpoint Not Found!". The request shapes are what Profile sends.

/** `PUT /users/profile` — not implemented (M-02). */
export interface UpdateProfileRequest {
  username: string;
  phone: string;
}
/** `DELETE /users/profile` — not implemented (M-02). */
export type ProfileMutationResponse = ApiEnvelope;
