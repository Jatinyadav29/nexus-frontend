// Wire format (src/types/api.ts) → the shapes the screens were written
// against. The screens' markup is frozen, so where the two differ the
// difference is absorbed here. Contract mismatch ids refer to
// Nexus/docs/API_CONTRACT.md §3.
import type {
  Booking,
  BookingStatus,
  Message,
  MessageStatus,
  ObjectId,
  Player,
  PublicTeam,
  Team,
  TeamStatus,
  Tournament,
} from "../types/api";

// ── Bookings ────────────────────────────────────────────────────────────────

/** `Booking.user`, always an object: an unpopulated id becomes `{ _id }`. */
export interface BookingUserView {
  _id: ObjectId;
  username?: string;
  email?: string;
}

/**
 * The admin list also styles a "Pending" status, which the backend never
 * sends (M-09). Kept in the type so the existing comparison stays valid.
 */
export type BookingStatusView = BookingStatus | "Pending";

export interface BookingView extends Omit<Booking, "user" | "status"> {
  user: BookingUserView;
  status: BookingStatusView;
}

export const toBookingView = (booking: Booking): BookingView => ({
  ...booking,
  user: typeof booking.user === "string" ? { _id: booking.user } : booking.user,
});

// ── Tournaments ─────────────────────────────────────────────────────────────

/** The admin roster shows a player email the backend does not store (M-08). */
export interface PlayerView extends Player {
  email?: string;
}

/** A roster entry as the admin screen reads it: always with `players`. */
export interface TeamView {
  _id: ObjectId;
  teamName: string;
  status: TeamStatus;
  players: PlayerView[];
}

export interface TournamentWithRosters extends Omit<Tournament, "registeredTeams"> {
  registeredTeams: TeamView[];
}

const hasRoster = (team: Team | PublicTeam): team is Team => "players" in team;

/**
 * Admin callers receive full rosters (ML-001). A public entry (no `players`)
 * becomes an empty roster instead of an undefined one.
 */
export const toTeamView = (team: Team | PublicTeam): TeamView => ({
  ...team,
  players: hasRoster(team) ? team.players : [],
});

export const toTournamentWithRosters = (tournament: Tournament): TournamentWithRosters => ({
  ...tournament,
  registeredTeams: tournament.registeredTeams.map(toTeamView),
});

// ── Messages ────────────────────────────────────────────────────────────────

/** The inbox also treats a legacy "New" status as unread (M-18). */
export type MessageStatusView = MessageStatus | "New";

export interface MessageView extends Omit<Message, "status"> {
  status: MessageStatusView;
}

export const toMessageView = (message: Message): MessageView => message;
