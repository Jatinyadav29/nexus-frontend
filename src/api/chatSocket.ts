// The live chat connection (Nexus/docs/API_CONTRACT.md §1.8): Socket.IO
// namespace /chat on the backend's own origin. No cookies on the socket: each
// (re)connect first trades the session cookie for a 60 s ticket over REST
// (POST /chat/ticket), so `auth` is a function, called on every attempt.
import { io, type Socket } from "socket.io-client";
import { request, getApiBaseUrl } from "./client";
import type {
  ChatClientToServerEvents,
  ChatServerToClientEvents,
  ChatTicketResponse,
} from "../types/api";

export type ChatSocket = Socket<ChatServerToClientEvents, ChatClientToServerEvents>;

export const DEFAULT_SOCKET_URL = "http://localhost:3005";

/**
 * VITE_SOCKET_URL, else the origin of an absolute VITE_API_BASE_URL, else
 * localhost. A relative API base (/api through the Vercel rewrite) cannot be
 * used: Vercel rewrites do not proxy WebSockets, so production sets
 * VITE_SOCKET_URL to the backend origin.
 */
export function getSocketUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return DEFAULT_SOCKET_URL;
  }
}

/** A new, not yet connected chat socket. Call `.connect()`; `.disconnect()` when done. */
export function createChatSocket(): ChatSocket {
  return io(`${getSocketUrl()}/chat`, {
    autoConnect: false,
    withCredentials: false,
    // WebSocket first (Render supports it); long-polling only if that fails.
    transports: ["websocket", "polling"],
    tryAllTransports: true,
    auth: (cb) => {
      request<ChatTicketResponse>("POST", "/chat/ticket").then(
        ({ ticket }) => cb({ ticket }),
        // No session: connect without a ticket; the server answers
        // connect_error "Invalid or expired ticket."
        () => cb({}),
      );
    },
  });
}
