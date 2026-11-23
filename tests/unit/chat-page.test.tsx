// The Chat page (/chat) on top of useChat, with a fake Socket.IO socket and
// the mock backend for REST.
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chat from "../../src/pages/Chat";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { mockApi } from "../mocks/server";
import { chatMessages, ids } from "../mocks/data";
import { lastSocket, presence, resetSockets } from "../mocks/socket";
import { renderAt } from "../utils";
import type { ChatMessage } from "../../src/types/api";

vi.mock("socket.io-client", async () => (await import("../mocks/socket")).socketIoModule);

beforeEach(() => resetSockets());

const page = (route = "/chat") =>
  renderAt(
    <ProtectedRoute>
      <Chat />
    </ProtectedRoute>,
    { route, path: "/chat" },
  );

const ready = async () => {
  await screen.findByText(chatMessages[0]!.text);
  return lastSocket();
};

const incoming = (n: number, room = ids.chatGeneral): ChatMessage => ({
  _id: `65f0000000000000000f3${String(n).padStart(3, "0")}`,
  room,
  user: ids.other,
  username: "arjun",
  text: `incoming ${n}`,
  createdAt: "2030-01-05T19:00:00.000Z",
});

describe("Chat page", () => {
  it("logged out: redirects to /login", async () => {
    mockApi({ session: "none" });
    page();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });

  it("lists rooms, opens General, shows history, own messages as You", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();

    const rooms = screen.getByRole("navigation", { name: "Chat rooms" });
    expect(within(rooms).getAllByRole("button").map((b) => b.textContent)).toEqual(["General", "Announcements"]);
    expect(within(rooms).getByRole("button", { name: "General" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("arjun")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument(); // riya's message
    expect(screen.getByTestId("chat-status")).toHaveTextContent("Live");
    expect(socket.emitted[0]).toEqual({ event: "room:join", payload: { roomId: ids.chatGeneral } });
  });

  it("?room=announcements opens that room; read-only for a user", async () => {
    mockApi({ session: "user" });
    page("/chat?room=announcements");
    await screen.findByText("Read-only channel. Only admins broadcast here.");
    expect(screen.queryByRole("textbox", { name: "Message" })).not.toBeInTheDocument();
    expect(screen.getByText("No transmissions yet. Open the channel.")).toBeInTheDocument();
  });

  it("admins can post in announcements", async () => {
    mockApi({ session: "admin" });
    page("/chat?room=announcements");
    expect(await screen.findByRole("textbox", { name: "Message" })).toBeInTheDocument();
  });

  it("switching rooms joins the new room", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    await userEvent.click(screen.getByRole("button", { name: "Announcements" }));
    await screen.findByText("Read-only channel. Only admins broadcast here.");
    expect(socket.emitted.map((e) => e.event)).toEqual(["room:join", "room:leave", "room:join"]);
  });

  it("sends a message, clears the box, shows it", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    const stored: ChatMessage = { ...incoming(1), user: ids.user, username: "riya", text: "on my way" };
    socket.ackHandler = (event) =>
      event === "message:send" ? { success: true, chatMessage: stored, duplicate: false } : { success: true };

    const box = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(box, "  on my way ");
    expect(screen.getByText("12/500")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("on my way")).toBeInTheDocument();
    expect(box).toHaveValue("");
    const sent = socket.emitted.find((e) => e.event === "message:send")!.payload as Record<string, string>;
    expect(sent.text).toBe("on my way");
    expect(sent.roomId).toBe(ids.chatGeneral);
  });

  it("the next message can be typed while one is in flight and is not wiped", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    let release: (value: unknown) => void = () => undefined;
    socket.ackHandler = (event) =>
      event === "message:send"
        ? new Promise((resolve) => {
            release = () => resolve({ success: true, chatMessage: { ...incoming(5), user: ids.user }, duplicate: false });
          })
        : { success: true };
    const box = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(box, "first");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(box).toHaveValue("");
    await userEvent.type(box, "second");
    await act(async () => release(undefined));
    expect(box).toHaveValue("second");
  });

  it("send is disabled for an empty box", async () => {
    mockApi({ session: "user" });
    page();
    await ready();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("a refused send keeps the text and toasts the server message", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    socket.ackHandler = () => ({ success: false, message: "You are muted in chat." });
    const box = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(box, "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("YOU ARE MUTED IN CHAT.")).toBeInTheDocument();
    expect(box).toHaveValue("hello");
  });

  it("a retry after a failed send reuses the same clientId", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    socket.ackHandler = () => Promise.reject(new Error("operation has timed out"));
    await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("TRANSMISSION NOT CONFIRMED. CHECK YOUR CONNECTION AND RESEND.");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    const ids_ = socket.emitted.filter((e) => e.event === "message:send").map((e) => (e.payload as { clientId: string }).clientId);
    expect(ids_).toHaveLength(2);
    expect(ids_[0]).toBe(ids_[1]);
  });

  it("shows live messages, presence and typing", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    act(() => {
      socket.fire("message:new", incoming(2));
      socket.fire("presence", { ...presence(ids.chatGeneral, 2), users: [{ _id: ids.other, username: "arjun" }, { _id: ids.user, username: "riya" }] });
      socket.fire("typing", { roomId: ids.chatGeneral, userId: ids.admin, username: "kabir" });
    });
    expect(screen.getByText("incoming 2")).toBeInTheDocument();
    expect(screen.getByText("Online · 2")).toBeInTheDocument();
    expect(screen.getByText("kabir is typing...")).toBeInTheDocument();
  });

  it("renders message text as text, not HTML", async () => {
    mockApi({ session: "user" });
    const { container } = page();
    const socket = await ready();
    act(() => socket.fire("message:new", { ...incoming(3), text: "<img src=x onerror=alert(1)>" }));
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img[src='x']")).toBeNull();
  });

  it("a user can delete only their own message, and it disappears", async () => {
    mockApi({ session: "user" });
    page();
    await ready();
    const buttons = screen.getAllByRole("button", { name: "Delete message" });
    expect(buttons).toHaveLength(1); // only riya's own message
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(screen.queryByText(chatMessages[1]!.text)).not.toBeInTheDocument());
  });

  it("admins see delete on every message", async () => {
    mockApi({ session: "admin" });
    page();
    await ready();
    expect(screen.getAllByRole("button", { name: "Delete message" })).toHaveLength(2);
  });

  it("offline after a refused handshake, with Reconnect", async () => {
    mockApi({ session: "user" });
    page();
    const socket = await ready();
    act(() => {
      socket.active = false;
      socket.fire("connect_error", new Error("Invalid or expired ticket."));
    });
    expect(screen.getByTestId("chat-status")).toHaveTextContent("Offline");
    await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(screen.getByTestId("chat-status")).toHaveTextContent("Live");
  });

  it("room list failure shows Retry", async () => {
    const api = mockApi({ session: "user" });
    const { http, HttpResponse } = await import("msw");
    const { server } = await import("../mocks/server");
    server.use(http.get("*/api/chat/rooms", () => HttpResponse.json({ success: false, message: "x" }, { status: 500 })));
    page();
    expect(await screen.findByText("Could not reach the comms relay.")).toBeInTheDocument();
    server.resetHandlers(...api.handlers);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(chatMessages[0]!.text)).toBeInTheDocument();
  });
});
