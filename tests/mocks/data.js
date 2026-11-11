// Fixtures in EXACTLY the shapes documented in Nexus/docs/API_CONTRACT.md
// (key lists are the ones asserted by the backend contract tests).
// Shared by the Vitest suite (msw/node) and the Playwright UI baseline
// (msw/browser), so both see the same API.

const stamp = { createdAt: "2030-01-01T09:00:00.000Z", updatedAt: "2030-01-01T09:00:00.000Z", __v: 0 };

export const ids = {
  user: "65f000000000000000000001",
  admin: "65f000000000000000000002",
  other: "65f000000000000000000003",
  bookingMine: "65f0000000000000000b0001",
  bookingOther: "65f0000000000000000b0002",
  tournamentOpen: "65f0000000000000000c0001",
  tournamentFull: "65f0000000000000000c0002",
  team1: "65f0000000000000000d0001",
  team2: "65f0000000000000000d0002",
  messageUnread: "65f0000000000000000e0001",
  messageRead: "65f0000000000000000e0002",
};

// GET /users/profile → `user`
export const profileUser = {
  _id: ids.user,
  email: "riya@example.test",
  username: "riya",
  phone: "9000000001",
  role: "User",
  wishlist: [],
  bookings: [],
  ...stamp,
};

export const profileAdmin = {
  _id: ids.admin,
  email: "admin@example.test",
  username: "commander",
  phone: "9000000002",
  role: "Admin",
  wishlist: [],
  bookings: [],
  ...stamp,
};

// POST /users/login and /users/register → `user` (no role, no phone)
export const loginUserShape = (u) => ({ _id: u._id, email: u.email, username: u.username });

const station = (stationId, n, extra = {}) => ({
  _id: `65f0000000000000000a${String(n).padStart(4, "0")}`,
  stationId,
  type: stationId.startsWith("C") ? "Console" : "PC",
  status: "Available",
  assignedUser: null,
  activeBooking: null,
  ...stamp,
  ...extra,
});

export const bookingWindow = { start: "2030-01-10T10:00:00.000Z", end: "2030-01-10T12:00:00.000Z" };

// GET /stations → `stations` (sorted by stationId)
export const stations = [
  station("C-01", 1),
  station("C-02", 2),
  station("PC-01", 3),
  station("PC-02", 4),
  station("PC-03", 5, {
    status: "Occupied",
    assignedUser: ids.other,
    activeBooking: { _id: ids.bookingOther, bookingTime: bookingWindow },
  }),
  station("PC-04", 6, { status: "Maintenance" }),
  station("PC-05", 7),
  station("PC-06", 8, { status: "Offline" }),
];

const booking = (extra) => ({
  stations: ["PC-01", "PC-02"],
  name: "riya",
  email: profileUser.email,
  phone: "9123456780",
  bookingType: "PC",
  membersCount: 2,
  membersName: ["riya"],
  bookingTime: bookingWindow,
  totalAmount: 400,
  status: "Active",
  ...stamp,
  ...extra,
});

// GET /bookings → `bookings` (user populated: _id, username, email)
export const bookings = [
  booking({
    _id: ids.bookingMine,
    user: { _id: ids.user, username: profileUser.username, email: profileUser.email },
  }),
  booking({
    _id: ids.bookingOther,
    user: { _id: ids.other, username: "kabir", email: "kabir@example.test" },
    name: "kabir",
    email: "kabir@example.test",
    phone: "9988776655",
    bookingType: "Console",
    membersCount: 1,
    membersName: ["kabir"],
    stations: ["C-01"],
    totalAmount: 100,
  }),
];

// GET /bookings/:id → `booking` (user populated: _id, username)
export const bookingById = (id) => {
  const found = bookings.find((b) => b._id === id);
  return found && { ...found, user: { _id: found.user._id, username: found.user.username } };
};

const player = (n) => ({
  _id: `65f0000000000000000f${String(n).padStart(4, "0")}`,
  name: `Player ${n}`,
  inGameId: `player#${n}`,
  phone: `90000000${String(n).padStart(2, "0")}`,
});

const team = (_id, teamName, captain, status, firstPlayer) => ({
  _id,
  teamName,
  captain,
  players: [0, 1, 2, 3, 4].map((i) => player(firstPlayer + i)),
  status,
  assignedPCs: [],
});

const tournament = (extra) => ({
  description: "Five versus five, single elimination.",
  prize: "TBD",
  entryFee: "Free",
  format: "5v5 Standard",
  thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
  rules: [],
  registeredTeams: [],
  status: "Upcoming",
  ...stamp,
  ...extra,
});

// GET /tournaments → `tournaments` (sorted by eventTime.start)
export const tournaments = [
  tournament({
    _id: ids.tournamentOpen,
    title: "Winter Clash",
    game: "Valorant",
    eventTime: { start: "2030-03-01T10:00:00.000Z", end: "2030-03-01T18:00:00.000Z" },
    maxTeams: 8,
    status: "Registration Open",
    registeredTeams: [
      team(ids.team1, "Night Owls", ids.other, "Pending", 1),
      team(ids.team2, "Pixel Pirates", ids.admin, "Approved", 6),
    ],
  }),
  tournament({
    _id: ids.tournamentFull,
    title: "Console Cup",
    game: "FIFA",
    eventTime: { start: "2030-04-12T12:00:00.000Z", end: "2030-04-12T20:00:00.000Z" },
    maxTeams: 1,
    registeredTeams: [team("65f0000000000000000d0003", "Solo Kings", ids.other, "Approved", 11)],
  }),
];

// GET /messages → `messages` (newest first; no updatedAt on this model)
export const messages = [
  {
    _id: ids.messageUnread,
    name: "Meera",
    email: "meera@example.test",
    subject: "Birthday booking",
    message: "Can we book ten PCs for a birthday on Saturday evening?",
    status: "Unread",
    createdAt: "2030-01-05T15:30:00.000Z",
    __v: 0,
  },
  {
    _id: ids.messageRead,
    name: "Arjun",
    email: "arjun@example.test",
    phone: "9000000042",
    subject: "Lost headset",
    message: "I think I left my headset at station PC-07 yesterday.",
    status: "Read",
    createdAt: "2030-01-03T11:00:00.000Z",
    __v: 0,
  },
];

// GET /admin/dashboard → `data`
export const dashboard = {
  totalStations: stations.length,
  stationsData: stations,
  activeBookingsCount: bookings.length,
  activeBookingsData: bookings,
  totalGamers: 42,
};
