// Live community chat (Nexus/docs/API_CONTRACT.md §1.8). The one page added
// after the UI freeze, with the freeze lifted for this page only (2026-11-23).
// Messages are plain text: React renders them as text, never as HTML.
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  IoChatbubblesOutline,
  IoChevronUp,
  IoLockClosedOutline,
  IoMegaphoneOutline,
  IoPeopleOutline,
  IoRefresh,
  IoSend,
  IoTrashOutline,
  IoTrophyOutline,
} from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import useChat, { newClientId, type ChatStatus } from "../hooks/useChat";
import { apiErrorMessage } from "../api";
import type { ChatMessage, ChatRoom, ChatRoomType } from "../types/api";

const MAX_LENGTH = 500;
const NEAR_BOTTOM_PX = 120;

const ROOM_ICON: Record<ChatRoomType, ReactNode> = {
  lobby: <IoChatbubblesOutline />,
  announcements: <IoMegaphoneOutline />,
  tournament: <IoTrophyOutline />,
};

const STATUS: Record<ChatStatus, { label: string; dot: string; text: string }> = {
  connected: { label: "Live", dot: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]", text: "text-green-400" },
  connecting: { label: "Connecting", dot: "bg-yellow-500 animate-pulse", text: "text-yellow-400" },
  reconnecting: { label: "Reconnecting", dot: "bg-yellow-500 animate-pulse", text: "text-yellow-400" },
  disconnected: { label: "Offline", dot: "bg-red-500", text: "text-red-400" },
  error: { label: "Offline", dot: "bg-red-500", text: "text-red-400" },
  idle: { label: "Offline", dot: "bg-gray-500", text: "text-gray-400" },
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const Chat = () => {
  const { user } = useContext(AuthContext);
  const api = useApi();
  const [params, setParams] = useSearchParams();

  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [roomsFailed, setRoomsFailed] = useState(false);
  const [roomsAttempt, setRoomsAttempt] = useState(0);

  // Room list (public endpoint).
  useEffect(() => {
    let cancelled = false;
    api.chat.rooms().then(
      (res) => {
        if (cancelled) return;
        setRooms(res.rooms);
        setRoomsFailed(false);
      },
      () => {
        if (!cancelled) setRoomsFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, roomsAttempt]);

  // ?room=<slug> selects the room, so a link can open a tournament's channel.
  const requested = params.get("room");
  const active = rooms?.find((r) => r.slug === requested) ?? rooms?.[0] ?? null;
  const chat = useChat(active?._id ?? null, { enabled: Boolean(user) });
  const isAdmin = user?.role === "Admin";
  const canPost = Boolean(active) && (!active?.readOnly || isAdmin);
  const status = STATUS[chat.status];

  // ── Composer ──────────────────────────────────────────────────────────
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  // Kept across a failed attempt, so retrying the same text cannot post it twice.
  const clientIdRef = useRef<string | null>(null);
  // Message list: follow new messages unless the user scrolled up.
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const heightBeforeOlderRef = useRef<number | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const clientId = clientIdRef.current ?? newClientId();
    clientIdRef.current = clientId;
    // Clear at once so the next message can be typed while this one is in
    // flight; a failure puts the text back (unless something new was typed).
    const restore = () => setDraft((current) => current || draft);
    setDraft("");
    stickToBottomRef.current = true;
    setSending(true);
    try {
      const ack = await chat.send(text, clientId);
      if (ack.success) {
        clientIdRef.current = null;
      } else {
        restore();
        toast.error(ack.message.toUpperCase());
      }
    } catch {
      restore();
      toast.error("TRANSMISSION NOT CONFIRMED. CHECK YOUR CONNECTION AND RESEND.");
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (message: ChatMessage) => {
    try {
      await chat.remove(message._id);
    } catch (error) {
      toast.error((apiErrorMessage(error) || "Could not delete the message.").toUpperCase());
    }
  };

  // ── Scrolling: follow new messages unless the user scrolled up ────────

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (heightBeforeOlderRef.current !== null) {
      // Older messages were prepended: keep the same message in view.
      list.scrollTo({ top: list.scrollTop + list.scrollHeight - heightBeforeOlderRef.current });
      heightBeforeOlderRef.current = null;
    } else if (stickToBottomRef.current) {
      list.scrollTo({ top: list.scrollHeight });
    }
  }, [chat.messages]);

  const loadOlder = async () => {
    heightBeforeOlderRef.current = listRef.current?.scrollHeight ?? null;
    await chat.loadOlder();
  };

  const selectRoom = (room: ChatRoom) => {
    stickToBottomRef.current = true;
    setParams({ room: room.slug }, { replace: true });
  };

  if (!rooms) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-6 text-center">
        {roomsFailed ? (
          <>
            <p className="text-red-400 font-black uppercase tracking-widest text-xs">
              Could not reach the comms relay.
            </p>
            <button
              onClick={() => setRoomsAttempt((n) => n + 1)}
              className="flex items-center gap-2 border border-white/10 hover:border-purple-500 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all"
            >
              <IoRefresh className="text-sm" /> Retry
            </button>
          </>
        ) : (
          <div className="text-purple-500 font-black animate-pulse uppercase tracking-widest text-xs">
            Tuning into Nexus comms...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 pt-28 pb-40 px-4 sm:px-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] font-mono tracking-[0.5em] text-purple-500 uppercase block mb-3">
              Squad Comms
            </span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
              Nexus <span className="text-purple-500">Chat.</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              data-testid="chat-status"
              className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 rounded-full px-4 py-2"
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${status.text}`}>
                {status.label}
              </span>
            </div>
            {(chat.status === "error" || chat.status === "disconnected") && (
              <button
                onClick={chat.reconnect}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-full transition-all"
              >
                <IoRefresh className="text-sm" /> Reconnect
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Rooms + who is online */}
          <aside className="flex flex-col gap-6 min-w-0">
            <nav
              aria-label="Chat rooms"
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-3 flex lg:flex-col gap-2 overflow-x-auto"
            >
              <span className="hidden lg:block text-[9px] font-mono tracking-[0.4em] text-gray-500 uppercase px-3 pt-2 pb-1">
                Channels
              </span>
              {rooms.map((room) => {
                const selected = room._id === active?._id;
                return (
                  <button
                    key={room._id}
                    onClick={() => selectRoom(room)}
                    aria-current={selected ? "true" : undefined}
                    className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                      selected
                        ? "bg-purple-600/15 border-purple-500/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                        : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className={`text-lg ${selected ? "text-purple-400" : ""}`}>{ROOM_ICON[room.type]}</span>
                    <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap truncate">
                      {room.name}
                    </span>
                    {room.readOnly && <IoLockClosedOutline className="ml-auto text-xs text-gray-500" />}
                  </button>
                );
              })}
            </nav>

            <div className="hidden lg:block bg-[#0a0a0a] border border-white/10 rounded-3xl p-5">
              <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.4em] text-gray-500 uppercase mb-4">
                <IoPeopleOutline className="text-sm" /> Online · {chat.presence?.count ?? 0}
              </div>
              <ul className="space-y-3 max-h-64 overflow-y-auto" data-lenis-prevent>
                {(chat.presence?.users ?? []).map((member) => (
                  <li key={member._id} className="flex items-center gap-3 text-xs font-bold text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                    <span className="truncate">{member.username}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Conversation */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col h-[calc(100svh-330px)] min-h-[420px] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.05)]"
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl text-purple-400">{active && ROOM_ICON[active.type]}</span>
                <h2 className="text-sm md:text-base font-black uppercase tracking-widest truncate">
                  {active?.name}
                </h2>
              </div>
              <span className="lg:hidden flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                <IoPeopleOutline /> {chat.presence?.count ?? 0}
              </span>
            </div>

            <div
              ref={listRef}
              onScroll={onScroll}
              data-lenis-prevent
              data-testid="chat-messages"
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 custom-scrollbar"
            >
              {chat.hasMore && (
                <button
                  onClick={loadOlder}
                  className="mx-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-400 border border-white/10 rounded-full px-4 py-2 transition-all"
                >
                  <IoChevronUp /> Load older transmissions
                </button>
              )}

              {chat.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-gray-500">
                  <IoChatbubblesOutline className="text-4xl text-purple-500/40" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {chat.status === "connected" ? "No transmissions yet. Open the channel." : "Waiting for signal..."}
                  </p>
                </div>
              ) : (
                chat.messages.map((message) => {
                  const mine = message.user === user?._id;
                  return (
                    <div key={message._id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest ${mine ? "text-purple-300" : "text-purple-400"}`}
                          >
                            {mine ? "You" : message.username}
                          </span>
                          <span className="text-[9px] font-mono text-gray-600">{timeOf(message.createdAt)}</span>
                          {(mine || isAdmin) && (
                            <button
                              onClick={() => removeMessage(message)}
                              aria-label="Delete message"
                              className="text-gray-600 hover:text-red-400 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                            >
                              <IoTrashOutline className="text-xs" />
                            </button>
                          )}
                        </div>
                        <p
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                            mine
                              ? "bg-purple-600/20 border-purple-500/30 text-white rounded-tr-sm"
                              : "bg-white/5 border-white/10 text-gray-200 rounded-tl-sm"
                          }`}
                        >
                          {message.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="h-6 px-6 text-[10px] font-mono uppercase tracking-widest text-purple-400/80">
              {chat.typingUsers.length > 0 &&
                `${chat.typingUsers.slice(0, 3).join(", ")} ${chat.typingUsers.length === 1 ? "is" : "are"} typing...`}
            </div>

            {canPost ? (
              <form onSubmit={submit} className="flex items-center gap-3 px-4 sm:px-6 pb-5">
                <div className="relative flex-1">
                  <input
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      clientIdRef.current = null;
                      chat.notifyTyping();
                    }}
                    maxLength={MAX_LENGTH}
                    placeholder={`Message ${active?.name ?? ""}...`}
                    aria-label="Message"
                    className="w-full bg-[#050505] border border-white/10 rounded-xl pl-4 pr-16 py-3 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-600">
                    {draft.length}/{MAX_LENGTH}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={sending || !draft.trim() || chat.status !== "connected"}
                  aria-label="Send message"
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <IoSend className="text-sm" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            ) : (
              <div className="mx-4 sm:mx-6 mb-5 flex items-center justify-center gap-2 border border-white/10 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <IoLockClosedOutline /> Read-only channel. Only admins broadcast here.
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default Chat;
