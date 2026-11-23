// UI baseline for the Chat page (/chat), added 2026-11-23 when the freeze was
// lifted for this page only. REST goes through the MSW mock backend like the
// other pages; the Socket.IO connection is answered by a minimal fake /chat
// server speaking the Engine.IO 4 / Socket.IO 5 wire protocol over
// page.routeWebSocket, so nothing reaches a real backend.
import type { Page, WebSocketRoute } from "@playwright/test";
import { test, expect } from "./fixtures";
import { chatMessages, chatRooms, ids } from "../mocks/data";

type Ack = Record<string, unknown>;
interface FakeChatOptions {
  /** connect_error message instead of a successful namespace connect. */
  refuse?: string;
}

const PRESENCE_USERS = [
  { _id: ids.user, username: "riya" },
  { _id: ids.other, username: "arjun" },
  { _id: ids.admin, username: "kabir" },
];

function answer(event: string, payload: { roomId?: string }): Ack {
  if (event === "room:join") {
    const room = chatRooms.find((r) => r._id === payload.roomId);
    if (!room) return { success: false, message: "Room not found." };
    const general = room._id === ids.chatGeneral;
    return {
      success: true,
      room,
      history: general ? chatMessages : [],
      presence: { roomId: room._id, count: general ? 3 : 1, users: general ? PRESENCE_USERS : PRESENCE_USERS.slice(0, 1) },
    };
  }
  return { success: true };
}

async function fakeChatServer(page: Page, { refuse }: FakeChatOptions = {}) {
  await page.routeWebSocket(/\/socket\.io\//, (ws: WebSocketRoute) => {
    // Engine.IO open packet.
    ws.send('0{"sid":"e2e","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}');
    ws.onMessage((raw) => {
      const message = String(raw);
      if (message.startsWith("40/chat")) {
        ws.send(refuse ? `44/chat,${JSON.stringify({ message: refuse })}` : '40/chat,{"sid":"e2e-chat"}');
        return;
      }
      const event = /^42\/chat,(\d+)(\[.*\])$/s.exec(message);
      if (event) {
        const [, id, body] = event;
        const [name, payload] = JSON.parse(body ?? "[]") as [string, { roomId?: string }];
        ws.send(`43/chat,${id}${JSON.stringify([answer(name, payload)])}`);
      }
    });
  });
}

test.describe("page: chat", () => {
  test.use({ scenario: { session: "user" } });

  test("chat @mobile", async ({ page, api }) => {
    await fakeChatServer(page);
    await api.open("/chat", chatMessages[0]!.text);
    await expect(page.getByTestId("chat-status")).toHaveText("Live");
    await api.shot("chat");
  });

  test("chat-announcements-readonly", async ({ page, api }) => {
    await fakeChatServer(page);
    await api.open("/chat?room=announcements", "Read-only channel. Only admins broadcast here.");
    await api.shot("chat-announcements-readonly");
  });

  test("chat-offline", async ({ page, api }) => {
    await fakeChatServer(page, { refuse: "Invalid or expired ticket." });
    await api.open("/chat", "Reconnect");
    await expect(page.getByTestId("chat-status")).toHaveText("Offline");
    await api.shot("chat-offline", { fullPage: false });
  });
});

test.describe("page: chat, admin", () => {
  test.use({ scenario: { session: "admin" } });

  test("chat-admin-announcements", async ({ page, api }) => {
    await fakeChatServer(page);
    await api.open("/chat?room=announcements", "No transmissions yet. Open the channel.");
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await api.shot("chat-admin-announcements", { fullPage: false });
  });
});
