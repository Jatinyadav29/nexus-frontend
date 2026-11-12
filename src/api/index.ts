// One typed function per endpoint of Nexus/docs/API_CONTRACT.md §1.
// Paths are relative to the base URL, which already ends in /api.
// Each function resolves with the success envelope (mapped where a screen
// needs a different shape, see ./mappers) and rejects with an ApiError.
import { request } from "./client";
import {
  toBookingView,
  toMessageView,
  toTournamentWithRosters,
  type BookingView,
  type MessageView,
  type TournamentWithRosters,
} from "./mappers";
import type {
  AdminCancelBookingResponse,
  ApiSuccess,
  BookingResponse,
  BookingsResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  CreateTournamentRequest,
  CreateTournamentResponse,
  DashboardResponse,
  DeleteBookingResponse,
  DeleteMessageResponse,
  DeleteTournamentResponse,
  HealthResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MarkMessageReadResponse,
  MessagesResponse,
  ObjectId,
  ProfileMutationResponse,
  ProfileResponse,
  RegisterRequest,
  RegisterResponse,
  RegisterTeamRequest,
  RegisterTeamResponse,
  StationStatusRequest,
  StationStatusResponse,
  StationsResponse,
  TeamStatusRequest,
  TeamStatusResponse,
  TournamentResponse,
  TournamentsResponse,
  UpdateBookingRequest,
  UpdateBookingResponse,
  UpdateProfileRequest,
  UpdateTournamentRequest,
  UpdateTournamentResponse,
  WishlistRequest,
  WishlistResponse,
} from "../types/api";

export { ApiError, apiErrorMessage, getApiBaseUrl, onUnauthorized } from "./client";
export type * from "./mappers";
export { toTournamentStatus } from "./mappers";

const id = (value: ObjectId): string => encodeURIComponent(value);

// §1.1
const users = {
  register: (body: RegisterRequest) =>
    request<RegisterResponse>("POST", "/users/register", body),
  login: (body: LoginRequest) => request<LoginResponse>("POST", "/users/login", body),
  logout: () => request<LogoutResponse>("POST", "/users/logout"),
  profile: () => request<ProfileResponse>("GET", "/users/profile"),
  toggleWishlist: (body: WishlistRequest) =>
    request<WishlistResponse>("POST", "/users/wishlist", body),
  /** Not implemented by the backend yet (contract M-02): answers 404. */
  updateProfile: (body: UpdateProfileRequest) =>
    request<ProfileMutationResponse>("PUT", "/users/profile", body),
  /** Not implemented by the backend yet (contract M-02): answers 404. */
  deleteProfile: () => request<ProfileMutationResponse>("DELETE", "/users/profile"),
};

// §1.2
const stations = {
  list: () => request<StationsResponse>("GET", "/stations"),
};

// §1.3
const bookings = {
  create: (body: CreateBookingRequest) =>
    request<CreateBookingResponse>("POST", "/bookings", body),
  list: async (): Promise<ApiSuccess<{ bookings: BookingView[] }>> => {
    const res = await request<BookingsResponse>("GET", "/bookings");
    return { ...res, bookings: res.bookings.map(toBookingView) };
  },
  get: async (bookingId: ObjectId): Promise<ApiSuccess<{ booking: BookingView }>> => {
    const res = await request<BookingResponse>("GET", `/bookings/${id(bookingId)}`);
    return { ...res, booking: toBookingView(res.booking) };
  },
  update: (bookingId: ObjectId, body: UpdateBookingRequest) =>
    request<UpdateBookingResponse>("PUT", `/bookings/${id(bookingId)}`, body),
  remove: (bookingId: ObjectId) =>
    request<DeleteBookingResponse>("DELETE", `/bookings/${id(bookingId)}`),
};

// §1.4
const tournaments = {
  list: () => request<TournamentsResponse>("GET", "/tournaments"),
  /** Same endpoint; for admin screens, every team carries a `players` array. */
  listWithRosters: async (): Promise<
    ApiSuccess<{ tournaments: TournamentWithRosters[] }>
  > => {
    const res = await request<TournamentsResponse>("GET", "/tournaments");
    return { ...res, tournaments: res.tournaments.map(toTournamentWithRosters) };
  },
  get: (tournamentId: ObjectId) =>
    request<TournamentResponse>("GET", `/tournaments/${id(tournamentId)}`),
  create: (body: CreateTournamentRequest) =>
    request<CreateTournamentResponse>("POST", "/tournaments", body),
  update: (tournamentId: ObjectId, body: UpdateTournamentRequest) =>
    request<UpdateTournamentResponse>("PUT", `/tournaments/${id(tournamentId)}`, body),
  remove: (tournamentId: ObjectId) =>
    request<DeleteTournamentResponse>("DELETE", `/tournaments/${id(tournamentId)}`),
  registerTeam: (tournamentId: ObjectId, body: RegisterTeamRequest) =>
    request<RegisterTeamResponse>("POST", `/tournaments/${id(tournamentId)}/register`, body),
  setTeamStatus: (tournamentId: ObjectId, teamId: ObjectId, body: TeamStatusRequest) =>
    request<TeamStatusResponse>(
      "PUT",
      `/tournaments/${id(tournamentId)}/team/${id(teamId)}/status`,
      body,
    ),
};

// §1.5
const messages = {
  create: (body: CreateMessageRequest) =>
    request<CreateMessageResponse>("POST", "/messages", body),
  list: async (): Promise<ApiSuccess<{ messages: MessageView[] }>> => {
    const res = await request<MessagesResponse>("GET", "/messages");
    return { ...res, messages: res.messages.map(toMessageView) };
  },
  markRead: (messageId: ObjectId) =>
    request<MarkMessageReadResponse>("PUT", `/messages/${id(messageId)}/read`),
  remove: (messageId: ObjectId) =>
    request<DeleteMessageResponse>("DELETE", `/messages/${id(messageId)}`),
};

// §1.6
const admin = {
  dashboard: () => request<DashboardResponse>("GET", "/admin/dashboard"),
  /** `stationObjectId` is the station's `_id`, not "PC-01". */
  setStationStatus: (stationObjectId: ObjectId, body: StationStatusRequest) =>
    request<StationStatusResponse>("PUT", `/admin/station/${id(stationObjectId)}`, body),
  cancelBooking: (bookingId: ObjectId) =>
    request<AdminCancelBookingResponse>("PUT", `/admin/booking/${id(bookingId)}/cancel`),
};

// §0 — 503 rejects with an ApiError like any other non-2xx answer.
const health = () => request<HealthResponse>("GET", "/health");

export const api = { users, stations, bookings, tournaments, messages, admin, health };
export type Api = typeof api;
