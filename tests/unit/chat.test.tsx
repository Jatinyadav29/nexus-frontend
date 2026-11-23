// Live chat API layer (Nexus/docs/API_CONTRACT.md §1.8): the REST client
// against the mock backend, and useChat against a fake Socket.IO socket.
import { act, renderHook, waitFor } from "@testing-library/react";
import { api, getSocketUrl } from "../../src/api";
import useChat, { mergeMessages, TYPING_VISIBLE_MS } from "../../src/hooks/useChat";
import type { ChatMessage, ChatPresence } from "../../src/types/api";
import { mockApi } from "../mocks/server";
import { chatMessages, chatRooms, ids } from "../mocks/data";
import { callTo } from "../utils";

// ── A fake socket.io-client socket ───────────────────────────────────────
type Listener = (...args: never[]) => void;
type AckHandler = (event: string, payload: unknown) => unknown;

class FakeSocket {
  connected = false;
  active = false;
  emitted: Array<{ event: string; payload: unknown }> = [];
  // Hoisted function below: answers room:join like the server would.
  ackHandler: AckHandler = (event, payload) => joinAck()(event, payload);
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  removeAllListeners() {
    this.listeners.clear();
    return this;
  }
  /** Server → client. */
  fire(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) (listener as (...a: unknown[]) => void)(...args);
  }
  connect() {
    this.connected = true;
    this.active = true;
    this.fire("connect");
    return this;
  }
  disconnect() {
    this.connected = false;
    this.active = false;
    this.fire("disconnect", "io client disconnect");
    return this;
  }
  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    return this;
  }
  timeout() {
    return {
      emitWithAck: async (event: string, payload: unknown) => {
        this.emitted.push({ event, payload });
        return this.ackHandler(event, payload);
      },
    };
  }
}

const io = vi.hoisted(() => ({ sockets: [] as unknown[], options: [] as unknown[], urls: [] as string[] }));
vi.mock("socket.io-client", () => ({
  io: (url: string, options: unknown) => {
    const socket = new FakeSocket();
    io.urls.push(url);
    io.options.push(options);
    io.sockets.push(socket);
    return socket;
  },
}));

const lastSocket = () => io.sockets.at(-1) as FakeSocket;
const presence = (roomId: string, count = 1): ChatPresence => ({ roomId, count, users: [] });
const msg = (n: number, room = ids.chatGeneral): ChatMessage => ({
  _id: `65f0000000000000000f2${String(n).padStart(3, "0")}`,
  room,
  user: ids.other,
  username: "arjun",
  text: `hello ${n}`,
  createdAt: `2030-01-05T18:${String(10 + n).padStart(2, "0")}:00.000Z`,
});

function joinAck(history: ChatMessage[] = chatMessages): AckHandler {
  return (event, payload) => {
  if (event === "room:join") {
    const { roomId } = payload as { roomId: string };
    const room = chatRooms.find((r) => r._id === roomId);
    return room
      ? { success: true, room, history: room._id === ids.chatGeneral ? history : [], presence: presence(roomId) }
      : { success: false, message: "Room not found." };
  }
  return { success: true };
  };
}

beforeEach(() => {
  io.sockets.length = 0;
  io.options.length = 0;
  io.urls.length = 0;
});

// ── REST ─────────────────────────────────────────────────────────────────
describe("api.chat (REST)", () => {
  it("ticket: POST /chat/ticket with credentials", async () => {
    const { calls } = mockApi({ session: "user" });
    const res = await api.chat.ticket();
    expect(res).toEqual({ success: true, ticket: "test-chat-ticket", expiresIn: 60 });
    expect(callTo(calls, "POST", "/chat/ticket").credentials).toBe("include");
  });

  it("rooms: GET /chat/rooms", async () => {
    mockApi();
    expect((await api.chat.rooms()).rooms).toEqual(chatRooms);
  });

  it("messages: GET with before/limit in the query string", async () => {
    const { calls } = mockApi({ session: "user" });
    const res = await api.chat.messages(ids.chatGeneral, { before: ids.chatMessage2, limit: 20 });
    expect(res).toEqual({ success: true, messages: chatMessages, hasMore: false });
    const call = callTo(calls, "GET", "/chat/rooms/");
    expect(call.url).toBe(
      `http://localhost:3005/api/chat/rooms/${ids.chatGeneral}/messages?before=${ids.chatMessage2}&limit=20`,
    );
  });

  it("messages: no query string when nothing is passed", async () => {
    const { calls } = mockApi({ session: "user" });
    await api.chat.messages(ids.chatGeneral);
    expect(callTo(calls, "GET", "/chat/rooms/").url).toMatch(/\/messages$/);
  });

  it("removeMessage and mute hit the documented paths", async () => {
    const { calls } = mockApi({ session: "admin" });
    expect(await api.chat.removeMessage(ids.chatMessage1)).toEqual({ success: true, message: "Message deleted." });
    expect(callTo(calls, "DELETE", "/chat/messages/").path).toBe(`/api/chat/messages/${ids.chatMessage1}`);

    const muted = await api.chat.mute(ids.other, { minutes: 10 });
    expect(muted.message).toBe("User muted.");
    expect(callTo(calls, "PUT", "/mute").body).toEqual({ minutes: 10 });
  });

  it("errors carry the server message", async () => {
    mockApi({ session: "user" });
    await expect(api.chat.removeMessage(ids.chatMessage1)).rejects.toMatchObject({
      status: 403,
      serverMessage: "You can only delete your own message within 5 minutes.",
    });
  });
});

describe("getSocketUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("falls back to localhost", () => {
    expect(getSocketUrl()).toBe("http://localhost:3005");
  });

  it("uses the origin of an absolute VITE_API_BASE_URL", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
    expect(getSocketUrl()).toBe("https://api.example.test");
  });

  it("prefers VITE_SOCKET_URL (needed when the API base is the relative /api rewrite)", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    vi.stubEnv("VITE_SOCKET_URL", "https://socket.example.test/");
    expect(getSocketUrl()).toBe("https://socket.example.test");
  });
});

// ── useChat ──────────────────────────────────────────────────────────────
describe("useChat", () => {
  it("connects to /chat with a fresh ticket from POST /chat/ticket", async () => {
    mockApi({ session: "user" });
    renderHook(() => useChat(ids.chatGeneral));
    await waitFor(() => expect(io.urls).toEqual(["http://localhost:3005/chat"]));

    const options = io.options[0] as { auth: (cb: (data: object) => void) => void; withCredentials: boolean };
    expect(options.withCredentials).toBe(false);
    const auth = await new Promise<object>((resolve) => options.auth(resolve));
    expect(auth).toEqual({ ticket: "test-chat-ticket" });
  });

  it("without a session the handshake carries no ticket", async () => {
    mockApi({ session: "none" });
    renderHook(() => useChat(ids.chatGeneral));
    const options = io.options[0] as { auth: (cb: (data: object) => void) => void };
    expect(await new Promise<object>((resolve) => options.auth(resolve))).toEqual({});
  });

  it("does nothing while disabled", () => {
    const { result } = renderHook(() => useChat(ids.chatGeneral, { enabled: false }));
    expect(io.sockets).toHaveLength(0);
    expect(result.current.status).toBe("idle");
  });
});

/** Renders useChat with the join ack installed before the socket connects. */
async function joined(roomId: string = ids.chatGeneral, history: ChatMessage[] = chatMessages) {
  const connect = FakeSocket.prototype.connect;
  vi.spyOn(FakeSocket.prototype, "connect").mockImplementation(function (this: FakeSocket) {
    this.ackHandler = joinAck(history);
    return connect.call(this);
  });
  const hook = renderHook(({ room }) => useChat(room), { initialProps: { room: roomId } });
  await waitFor(() => expect(hook.result.current.room).not.toBeNull());
  return { ...hook, socket: lastSocket() };
}

describe("useChat events", () => {
  it("joins the room and exposes room, history and presence", async () => {
    const { result, socket } = await joined();
    expect(socket.emitted[0]).toEqual({ event: "room:join", payload: { roomId: ids.chatGeneral } });
    expect(result.current.status).toBe("connected");
    expect(result.current.room?.slug).toBe("general");
    expect(result.current.messages).toEqual(chatMessages);
    expect(result.current.presence).toEqual(presence(ids.chatGeneral));
    expect(result.current.hasMore).toBe(false);
  });

  it("hasMore is true when the join returned a full page of 50", async () => {
    const { result } = await joined(ids.chatGeneral, Array.from({ length: 50 }, (_, i) => msg(i)));
    expect(result.current.hasMore).toBe(true);
  });

  it("a refused join sets error", async () => {
    const { result } = await joined();
    const socket = lastSocket();
    socket.ackHandler = () => ({ success: false, message: "Room not found." });
    act(() => socket.fire("disconnect", "transport close"));
    act(() => socket.fire("connect"));
    await waitFor(() => expect(result.current.error).toBe("Room not found."));
  });

  it("message:new appends once, ignores other rooms", async () => {
    const { result, socket } = await joined();
    act(() => {
      socket.fire("message:new", msg(1));
      socket.fire("message:new", msg(1));
      socket.fire("message:new", msg(2, ids.chatAnnouncements));
    });
    expect(result.current.messages.map((m) => m._id)).toEqual([...chatMessages.map((m) => m._id), msg(1)._id]);
  });

  it("message:deleted removes the message", async () => {
    const { result, socket } = await joined();
    act(() => socket.fire("message:deleted", { roomId: ids.chatGeneral, id: ids.chatMessage1 }));
    expect(result.current.messages.map((m) => m._id)).toEqual([ids.chatMessage2]);
  });

  it("presence updates for the current room only", async () => {
    const { result, socket } = await joined();
    act(() => {
      socket.fire("presence", presence(ids.chatGeneral, 7));
      socket.fire("presence", presence(ids.chatAnnouncements, 99));
    });
    expect(result.current.presence?.count).toBe(7);
  });

  it("typing shows the user, then expires; their message clears it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result, socket } = await joined();
      act(() => socket.fire("typing", { roomId: ids.chatGeneral, userId: ids.other, username: "arjun" }));
      expect(result.current.typingUsers).toEqual(["arjun"]);
      act(() => {
        vi.advanceTimersByTime(TYPING_VISIBLE_MS + 10);
      });
      expect(result.current.typingUsers).toEqual([]);

      act(() => socket.fire("typing", { roomId: ids.chatGeneral, userId: ids.other, username: "arjun" }));
      act(() => socket.fire("message:new", msg(3)));
      expect(result.current.typingUsers).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("send emits roomId, text and a clientId, and shows the acked message", async () => {
    const { result, socket } = await joined();
    const stored = { ...msg(4), user: ids.user, username: "riya" };
    socket.ackHandler = (event) =>
      event === "message:send" ? { success: true, chatMessage: stored, duplicate: false } : { success: true };

    let ack: unknown;
    await act(async () => {
      ack = await result.current.send("hello 4");
    });
    expect(ack).toEqual({ success: true, chatMessage: stored, duplicate: false });
    const sent = socket.emitted.find((e) => e.event === "message:send")!.payload as Record<string, string>;
    expect(sent.roomId).toBe(ids.chatGeneral);
    expect(sent.text).toBe("hello 4");
    expect(sent.clientId).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(result.current.messages.at(-1)).toEqual(stored);
  });

  it("send reuses a given clientId (idempotent retry) and passes errors through", async () => {
    const { result, socket } = await joined();
    socket.ackHandler = () => ({ success: false, message: "You are muted in chat." });
    let ack: unknown;
    await act(async () => {
      ack = await result.current.send("hi", "retry-1");
    });
    expect(ack).toEqual({ success: false, message: "You are muted in chat." });
    expect(socket.emitted.at(-1)).toEqual({
      event: "message:send",
      payload: { roomId: ids.chatGeneral, text: "hi", clientId: "retry-1" },
    });
  });

  it("a reconnect rejoins and merges history without duplicates", async () => {
    const { result, socket } = await joined();
    act(() => socket.fire("message:new", msg(5)));
    socket.ackHandler = joinAck([...chatMessages, msg(5), msg(6)]);
    act(() => {
      socket.fire("disconnect", "transport close");
    });
    expect(result.current.status).toBe("reconnecting");
    act(() => socket.fire("connect"));

    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(result.current.messages.map((m) => m.text)).toEqual([
      chatMessages[0]!.text,
      chatMessages[1]!.text,
      "hello 5",
      "hello 6",
    ]);
    expect(socket.emitted.filter((e) => e.event === "room:join")).toHaveLength(2);
  });

  it("switching rooms leaves the old one and joins the new one on the same socket", async () => {
    const { result, socket, rerender } = await joined();
    rerender({ room: ids.chatAnnouncements });
    await waitFor(() => expect(result.current.room?.slug).toBe("announcements"));
    expect(result.current.messages).toEqual([]);
    expect(io.sockets).toHaveLength(1);
    expect(socket.emitted.map((e) => e.event)).toEqual(["room:join", "room:leave", "room:join"]);
  });

  it("a refused handshake sets status error and the server message", async () => {
    const { result, socket } = await joined();
    act(() => {
      socket.active = false;
      socket.fire("connect_error", new Error("Invalid or expired ticket."));
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Invalid or expired ticket.");
  });

  it("a server disconnect (logout) is final until reconnect()", async () => {
    const { result, socket } = await joined();
    act(() => {
      socket.active = false;
      socket.fire("disconnect", "io server disconnect");
    });
    expect(result.current.status).toBe("disconnected");
    act(() => result.current.reconnect());
    expect(result.current.status).toBe("connected");
  });

  it("loadOlder pages with the oldest message as cursor", async () => {
    const { calls } = mockApi({ session: "user" });
    const { result } = await joined(ids.chatGeneral, [msg(7)]);
    await act(async () => {
      await result.current.loadOlder();
    });
    expect(callTo(calls, "GET", "/chat/rooms/").url).toContain(`before=${msg(7)._id}`);
    expect(result.current.messages.map((m) => m._id)).toEqual([...chatMessages.map((m) => m._id), msg(7)._id]);
  });

  it("remove calls DELETE and drops the message; a refusal sets error", async () => {
    mockApi({ session: "user" });
    const { result } = await joined();
    await act(async () => {
      await result.current.remove(ids.chatMessage2); // riya's own
    });
    expect(result.current.messages.map((m) => m._id)).toEqual([ids.chatMessage1]);
    await act(async () => {
      await result.current.remove(ids.chatMessage1); // someone else's
    });
    expect(result.current.error).toBe("You can only delete your own message within 5 minutes.");
  });

  it("notifyTyping emits at most once per 2 s", async () => {
    const { result, socket } = await joined();
    act(() => {
      result.current.notifyTyping();
      result.current.notifyTyping();
    });
    expect(socket.emitted.filter((e) => e.event === "typing")).toEqual([
      { event: "typing", payload: { roomId: ids.chatGeneral } },
    ]);
  });

  it("unmount disconnects the socket", async () => {
    const { unmount, socket } = await joined();
    unmount();
    expect(socket.connected).toBe(false);
  });
});

describe("mergeMessages", () => {
  it("unions by _id and sorts oldest first", () => {
    expect(mergeMessages([msg(2), msg(1)], [msg(3), { ...msg(1), text: "edited" }]).map((m) => m.text)).toEqual([
      "edited",
      "hello 2",
      "hello 3",
    ]);
  });
});
