// Live chat for one room (Nexus/docs/API_CONTRACT.md §1.8).
//
//   const chat = useChat(roomId, { enabled: Boolean(user) });
//   chat.messages, chat.presence, chat.typingUsers, chat.status, chat.error
//   await chat.send(text); chat.loadOlder(); chat.remove(id); chat.notifyTyping();
//
// One socket per mounted hook; switching rooms reuses it (leave + join).
// After a reconnect the room is joined again and its recent history merged,
// so nothing sent while offline is lost. Room lists come from api.chat.rooms().
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { api, createChatSocket, type ChatSocket } from "../api";
import { apiErrorMessage } from "../api/client";
import type {
  ChatMessage,
  ChatPresence,
  ChatRoom,
  ChatSendAck,
  ObjectId,
} from "../types/api";

export type ChatStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export const CHAT_ACK_TIMEOUT_MS = 10_000;
export const TYPING_VISIBLE_MS = 3_000;
const TYPING_EMIT_INTERVAL_MS = 2_000;
const RECENT_LIMIT = 50; // what room:join returns at most

interface RoomState {
  roomId: ObjectId | null;
  room: ChatRoom | null;
  messages: ChatMessage[];
  presence: ChatPresence | null;
  hasMore: boolean;
  typing: Record<ObjectId, { username: string; seq: number }>;
}

type Action =
  | { type: "joined"; roomId: ObjectId; room: ChatRoom; history: ChatMessage[]; presence: ChatPresence }
  | { type: "older"; roomId: ObjectId; messages: ChatMessage[]; hasMore: boolean }
  | { type: "message"; message: ChatMessage }
  | { type: "deleted"; roomId: ObjectId; id: ObjectId }
  | { type: "presence"; presence: ChatPresence }
  | { type: "typing"; roomId: ObjectId; userId: ObjectId; username: string; seq: number }
  | { type: "typingExpired"; userId: ObjectId; seq: number };

const emptyRoom = (roomId: ObjectId | null): RoomState => ({
  roomId,
  room: null,
  messages: [],
  presence: null,
  hasMore: false,
  typing: {},
});

const byTime = (a: ChatMessage, b: ChatMessage) =>
  a.createdAt === b.createdAt ? a._id.localeCompare(b._id) : a.createdAt.localeCompare(b.createdAt);

/** Union by `_id`, oldest first. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Map(current.map((m) => [m._id, m]));
  for (const m of incoming) seen.set(m._id, m);
  return [...seen.values()].sort(byTime);
}

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case "joined": {
      // A rejoin after a reconnect keeps what was already loaded.
      const base = state.roomId === action.roomId ? state : emptyRoom(action.roomId);
      return {
        ...base,
        room: action.room,
        messages: mergeMessages(base.messages, action.history),
        presence: action.presence,
        hasMore: base.room ? base.hasMore : action.history.length >= RECENT_LIMIT,
      };
    }
    case "older":
      if (state.roomId !== action.roomId) return state;
      return { ...state, messages: mergeMessages(state.messages, action.messages), hasMore: action.hasMore };
    case "message": {
      if (state.roomId !== action.message.room) return state;
      const { [action.message.user]: _done, ...typing } = state.typing;
      return { ...state, messages: mergeMessages(state.messages, [action.message]), typing };
    }
    case "deleted":
      if (state.roomId !== action.roomId) return state;
      return { ...state, messages: state.messages.filter((m) => m._id !== action.id) };
    case "presence":
      if (state.roomId !== action.presence.roomId) return state;
      return { ...state, presence: action.presence };
    case "typing":
      if (state.roomId !== action.roomId) return state;
      return {
        ...state,
        typing: { ...state.typing, [action.userId]: { username: action.username, seq: action.seq } },
      };
    case "typingExpired": {
      if (state.typing[action.userId]?.seq !== action.seq) return state;
      const { [action.userId]: _gone, ...typing } = state.typing;
      return { ...state, typing };
    }
  }
}

/** A fresh idempotency key for `send`. Reuse it to retry the same message. */
export const newClientId = (): string => crypto.randomUUID();

export interface UseChatOptions {
  /** Connect only while true (e.g. while a user is signed in). Default true. */
  enabled?: boolean;
}

export interface UseChat {
  status: ChatStatus;
  /** Last connection or join error from the server, if any. */
  error: string | null;
  room: ChatRoom | null;
  messages: ChatMessage[];
  presence: ChatPresence | null;
  hasMore: boolean;
  typingUsers: string[];
  /** Resolves with the server's ack; rejects if no ack arrives in time. */
  send: (text: string, clientId?: string) => Promise<ChatSendAck>;
  loadOlder: () => Promise<void>;
  /** Rejects with an ApiError when the server refuses. */
  remove: (messageId: ObjectId) => Promise<void>;
  notifyTyping: () => void;
  /** Try again after status "error" or "disconnected". */
  reconnect: () => void;
}

export default function useChat(roomId: ObjectId | null, { enabled = true }: UseChatOptions = {}): UseChat {
  const socketRef = useRef<ChatSocket | null>(null);
  const lastTypingRef = useRef(0);
  const typingSeqRef = useRef(0);
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reducer, roomId, emptyRoom);

  // The connection: one socket while enabled.
  useEffect(() => {
    if (!enabled) return;
    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setConnected(true);
      setError(null);
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      // "io server disconnect": the server ended it (logout); no auto-retry.
      setStatus(socket.active ? "reconnecting" : reason === "io client disconnect" ? "idle" : "disconnected");
    });
    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err.message);
      setStatus(socket.active ? "reconnecting" : "error");
    });
    socket.on("message:new", (message) => dispatch({ type: "message", message }));
    socket.on("message:deleted", ({ roomId: room, id }) => dispatch({ type: "deleted", roomId: room, id }));
    socket.on("presence", (presence) => dispatch({ type: "presence", presence }));
    socket.on("typing", ({ roomId: room, userId, username }) => {
      typingSeqRef.current += 1;
      const seq = typingSeqRef.current;
      dispatch({ type: "typing", roomId: room, userId, username, seq });
      setTimeout(() => dispatch({ type: "typingExpired", userId, seq }), TYPING_VISIBLE_MS);
    });

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  // The room: (re)join whenever connected, leave on switch.
  useEffect(() => {
    const socket = socketRef.current;
    if (!enabled || !connected || !socket || !roomId) return;
    let cancelled = false;
    socket
      .timeout(CHAT_ACK_TIMEOUT_MS)
      .emitWithAck("room:join", { roomId })
      .then(
        (ack) => {
          if (cancelled) return;
          if (ack.success) {
            dispatch({ type: "joined", roomId, room: ack.room, history: ack.history, presence: ack.presence });
          } else {
            setError(ack.message);
          }
        },
        () => {
          if (!cancelled) setError("Could not join the room.");
        },
      );
    return () => {
      cancelled = true;
      if (socket.connected) socket.emit("room:leave", { roomId }, () => undefined);
    };
  }, [enabled, connected, roomId]);

  const send = useCallback(
    async (text: string, clientId: string = newClientId()): Promise<ChatSendAck> => {
      const socket = socketRef.current;
      if (!socket || !roomId) return { success: false, message: "Chat is not connected." };
      // Buffered by Socket.IO while offline; the clientId keeps a resend single.
      const ack = await socket
        .timeout(CHAT_ACK_TIMEOUT_MS)
        .emitWithAck("message:send", { roomId, text, clientId });
      if (ack.success) dispatch({ type: "message", message: ack.chatMessage });
      return ack;
    },
    [roomId],
  );

  const current = state.roomId === roomId ? state : emptyRoom(roomId);
  const oldest = current.messages[0]?._id;

  const loadOlder = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await api.chat.messages(roomId, oldest ? { before: oldest } : {});
      dispatch({ type: "older", roomId, messages: res.messages, hasMore: res.hasMore });
    } catch (err) {
      setError(apiErrorMessage(err) || "Could not load older messages.");
    }
  }, [roomId, oldest]);

  // Rejects with the ApiError (e.g. 403 after the 5-minute window) so the
  // screen can show the server's message.
  const remove = useCallback(
    async (messageId: ObjectId) => {
      if (!roomId) return;
      await api.chat.removeMessage(messageId);
      dispatch({ type: "deleted", roomId, id: messageId });
    },
    [roomId],
  );

  const notifyTyping = useCallback(() => {
    const socket = socketRef.current;
    const now = Date.now();
    if (!socket?.connected || !roomId || now - lastTypingRef.current < TYPING_EMIT_INTERVAL_MS) return;
    lastTypingRef.current = now;
    socket.emit("typing", { roomId });
  }, [roomId]);

  const reconnect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  return {
    status: enabled ? status : "idle",
    error,
    room: current.room,
    messages: current.messages,
    presence: current.presence,
    hasMore: current.hasMore,
    typingUsers: Object.values(current.typing).map((t) => t.username),
    send,
    loadOlder,
    remove,
    notifyTyping,
    reconnect,
  };
}
