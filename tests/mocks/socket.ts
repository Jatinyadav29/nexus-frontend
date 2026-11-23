// A fake socket.io-client for unit tests: `vi.mock("socket.io-client", async
// () => (await import("../mocks/socket")).socketIoModule)`. Each io() call
// records its URL and options and returns a FakeSocket that answers acks
// like the real /chat namespace (API_CONTRACT.md §1.8).
import type { ChatMessage, ChatPresence } from "../../src/types/api";
import { chatMessages, chatRooms, ids } from "./data";

type Listener = (...args: never[]) => void;
export type AckHandler = (event: string, payload: unknown) => unknown;

export const presence = (roomId: string, count = 1): ChatPresence => ({ roomId, count, users: [] });

/** Answers room:join with the fixture rooms; General gets `history`. */
export function joinAck(history: ChatMessage[] = chatMessages): AckHandler {
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

export class FakeSocket {
  connected = false;
  active = false;
  emitted: Array<{ event: string; payload: unknown }> = [];
  ackHandler: AckHandler = joinAck();
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

export const io = { sockets: [] as FakeSocket[], options: [] as unknown[], urls: [] as string[] };

export const resetSockets = (): void => {
  io.sockets.length = 0;
  io.options.length = 0;
  io.urls.length = 0;
};

export const lastSocket = (): FakeSocket => {
  const socket = io.sockets.at(-1);
  if (!socket) throw new Error("no socket was created");
  return socket;
};

export const socketIoModule = {
  io: (url: string, options: unknown) => {
    const socket = new FakeSocket();
    io.urls.push(url);
    io.options.push(options);
    io.sockets.push(socket);
    return socket;
  },
};
