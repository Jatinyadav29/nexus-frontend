// Tournament flows: list, details, team registration, admin create/update/delete.
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tournament from "../../src/pages/Tournament.jsx";
import TournamentDetails from "../../src/pages/TournamentDetails.jsx";
import { mockApi } from "../mocks/server.js";
import { ids } from "../mocks/data.js";
import { renderAt, lastCall } from "../utils.jsx";

describe("Tournament list", () => {
  it("shows the loading state, then every tournament with its slot count", async () => {
    mockApi({ delayMs: 50 });
    renderAt(<Tournament />, { route: "/tournament" });

    expect(screen.getByText("Fetching Circuit Data...")).toBeInTheDocument();
    expect(await screen.findByText("Winter Clash")).toBeInTheDocument();
    expect(screen.getByText("Console Cup")).toBeInTheDocument();
    expect(screen.getByText("2/8 TEAMS")).toBeInTheDocument();
    expect(screen.getByText("1/1 TEAMS")).toBeInTheDocument();
  });

  it("links to the details page and disables enlisting when the roster is full", async () => {
    mockApi();
    renderAt(<Tournament />, { route: "/tournament" });
    await screen.findByText("Winter Clash");

    const links = screen.getAllByRole("link", { name: /Intel/ });
    expect(links[0]).toHaveAttribute("href", `/tournament/${ids.tournamentOpen}`);
    expect(screen.getByRole("button", { name: /Enlist/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Roster Full/ })).toBeDisabled();
  });

  it("shows the empty state", async () => {
    mockApi({ tournaments: "empty" });
    renderAt(<Tournament />, { route: "/tournament" });

    expect(
      await screen.findByText("No active tournaments found in the database."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when loading fails", async () => {
    mockApi({ tournaments: "error" });
    renderAt(<Tournament />, { route: "/tournament" });

    expect(await screen.findByText("Failed to fetch tournaments")).toBeInTheDocument();
  });

  it("only an admin sees the Deploy Tournament button", async () => {
    mockApi({ session: "user" });
    const view = renderAt(<Tournament />, { route: "/tournament" });
    await screen.findByText("Winter Clash");
    expect(screen.queryByRole("button", { name: /Deploy Tournament/ })).not.toBeInTheDocument();
    view.unmount();

    mockApi({ session: "admin" });
    renderAt(<Tournament />, { route: "/tournament" });
    expect(await screen.findByRole("button", { name: /Deploy Tournament/ })).toBeInTheDocument();
  });

  it("a logged-out visitor who clicks Enlist is sent to /login", async () => {
    mockApi({ session: "none" });
    renderAt(<Tournament />, { route: "/tournament" });
    await screen.findByText("Winter Clash");

    await userEvent.click(screen.getByRole("button", { name: /Enlist/ }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });

  it("admin create: sends { title, game, description, maxTeams, eventTime } and reloads the list", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<Tournament />, { route: "/tournament" });

    await userEvent.click(await screen.findByRole("button", { name: /Deploy Tournament/ }));
    await userEvent.type(screen.getByPlaceholderText("VALORANT MASTERS"), "Spring Open");
    await userEvent.type(screen.getByPlaceholderText("VALORANT"), "CS2");
    await userEvent.type(screen.getByPlaceholderText("Rules of engagement..."), "Bring a mouse");
    await userEvent.click(screen.getByRole("button", { name: "INITIALIZE CIRCUIT" }));

    expect(await screen.findByText("TOURNAMENT DEPLOYED SUCCESSFULLY!")).toBeInTheDocument();
    const { body } = lastCall(calls, "POST", "/tournaments");
    expect(Object.keys(body).sort()).toEqual([
      "description",
      "eventTime",
      "game",
      "maxTeams",
      "title",
    ]);
    expect(body).toMatchObject({
      title: "Spring Open",
      game: "CS2",
      description: "Bring a mouse",
      maxTeams: 16,
    });
    // default window 12:00–18:00 local (TZ is pinned to UTC)
    expect(body.eventTime.start).toMatch(/T12:00:00\.\d{3}Z$/);
    expect(body.eventTime.end).toMatch(/T18:00:00\.\d{3}Z$/);
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "GET" && c.path === "/api/tournaments")).toHaveLength(2),
    );
  });

  it("admin create: does not submit while required fields are empty", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<Tournament />, { route: "/tournament" });

    await userEvent.click(await screen.findByRole("button", { name: /Deploy Tournament/ }));
    await userEvent.click(screen.getByRole("button", { name: "INITIALIZE CIRCUIT" }));

    expect(lastCall(calls, "POST", "/tournaments")).toBeUndefined();
  });
});

describe("Team registration modal", () => {
  const open = async () => {
    renderAt(<Tournament />, { route: "/tournament" });
    await screen.findByText("Winter Clash");
    await userEvent.click(screen.getByRole("button", { name: /Enlist/ }));
    return screen.findByText("Enlist: Winter Clash");
  };

  const fillRoster = async (teamName) => {
    await userEvent.type(screen.getByPlaceholderText("SQUAD NAME (e.g. Nexus Elite)"), teamName);
    const names = screen.getAllByPlaceholderText("REAL NAME");
    const gameIds = screen.getAllByPlaceholderText("IN-GAME ID");
    const emails = screen.getAllByPlaceholderText("EMAIL");
    const phones = screen.getAllByPlaceholderText("PHONE");
    for (let i = 0; i < 5; i += 1) {
      if (i > 0) {
        await userEvent.type(names[i], `Mate ${i}`);
        await userEvent.type(emails[i], `mate${i}@example.test`);
        await userEvent.type(phones[i], `900000001${i}`);
      }
      await userEvent.type(gameIds[i], `tag#${i}`);
    }
  };

  it("prefills the captain from the session (five player rows)", async () => {
    mockApi({ session: "user" });
    await open();

    expect(screen.getAllByPlaceholderText("REAL NAME")).toHaveLength(5);
    expect(screen.getAllByPlaceholderText("REAL NAME")[0]).toHaveValue("riya");
    expect(screen.getAllByPlaceholderText("EMAIL")[0]).toHaveValue("riya@example.test");
    expect(screen.getAllByPlaceholderText("PHONE")[0]).toHaveValue("9000000001");
  });

  it("does not submit an incomplete roster", async () => {
    const { calls } = mockApi({ session: "user" });
    await open();

    await userEvent.click(screen.getByRole("button", { name: "CONFIRM FULL ROSTER" }));

    expect(lastCall(calls, "POST", "/register")).toBeUndefined();
  });

  it("sends { teamName, players[5] } and shows the success screen", async () => {
    const { calls } = mockApi({ session: "user" });
    await open();
    await fillRoster("Nexus Elite");

    await userEvent.click(screen.getByRole("button", { name: "CONFIRM FULL ROSTER" }));

    expect(await screen.findByRole("button", { name: "Acknowledge & Refresh" })).toBeInTheDocument();
    const { body, path, credentials } = lastCall(calls, "POST", "/register");
    expect(path).toBe(`/api/tournaments/${ids.tournamentOpen}/register`);
    expect(credentials).toBe("include");
    expect(Object.keys(body).sort()).toEqual(["players", "teamName"]);
    expect(body.teamName).toBe("Nexus Elite");
    expect(body.players).toHaveLength(5);
    expect(body.players[0]).toEqual({
      name: "riya",
      inGameId: "tag#0",
      email: "riya@example.test",
      phone: "9000000001",
    });
  }, 30000);

  it("shows the server's message when the team name is taken", async () => {
    mockApi({ session: "user" });
    await open();
    await fillRoster("Night Owls");

    await userEvent.click(screen.getByRole("button", { name: "CONFIRM FULL ROSTER" }));

    expect(
      await screen.findByText("You or this team name are already registered"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge & Refresh" })).not.toBeInTheDocument();
  }, 30000);
});

describe("Tournament details", () => {
  const route = `/tournament/${ids.tournamentOpen}`;
  const path = "/tournament/:id";

  it("shows the loading state, then the tournament and its teams", async () => {
    mockApi({ delayMs: 50 });
    renderAt(<TournamentDetails />, { route, path });

    expect(screen.getByText("Fetching Intel...")).toBeInTheDocument();
    expect(await screen.findByText("Winter Clash")).toBeInTheDocument();
    expect(screen.getByText("Five versus five, single elimination.")).toBeInTheDocument();
    expect(screen.getByText("Night Owls")).toBeInTheDocument();
    expect(screen.getByText("Pixel Pirates")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enlist Squad Now" })).toBeEnabled();
  });

  it("disables enlisting when the roster is full", async () => {
    mockApi();
    renderAt(<TournamentDetails />, { route: `/tournament/${ids.tournamentFull}`, path });

    expect(await screen.findByRole("button", { name: "Roster Full" })).toBeDisabled();
  });

  it("renders nothing and shows a toast when the tournament does not exist", async () => {
    mockApi();
    renderAt(<TournamentDetails />, { route: "/tournament/65f0000000000000000c0999", path });

    expect(await screen.findByText("Failed to fetch intel")).toBeInTheDocument();
    expect(screen.queryByText("Mission Details")).not.toBeInTheDocument();
  });

  it("a normal user sees no admin controls", async () => {
    mockApi({ session: "user" });
    renderAt(<TournamentDetails />, { route, path });
    await screen.findByText("Winter Clash");

    expect(screen.queryByRole("button", { name: /Edit Intel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Abort$/ })).not.toBeInTheDocument();
  });

  it("admin update: sends the edit form plus eventTime and reloads", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<TournamentDetails />, { route, path });

    await userEvent.click(await screen.findByRole("button", { name: /Edit Intel/ }));
    const title = screen.getByDisplayValue("Winter Clash");
    await userEvent.clear(title);
    await userEvent.type(title, "Winter Clash II");
    await userEvent.selectOptions(screen.getByDisplayValue("Registration Open"), "Live");
    await userEvent.click(screen.getByRole("button", { name: "CONFIRM UPDATE" }));

    expect(await screen.findByText("Tournament Intel Updated!")).toBeInTheDocument();
    const { body, path: called } = lastCall(calls, "PUT", "/tournaments/");
    expect(called).toBe(`/api/tournaments/${ids.tournamentOpen}`);
    // current behaviour: UI-only fields are sent along with the real ones
    expect(Object.keys(body).sort()).toEqual([
      "description",
      "endTime",
      "eventTime",
      "game",
      "maxTeams",
      "selectedDate",
      "startTime",
      "status",
      "title",
    ]);
    expect(body).toMatchObject({ title: "Winter Clash II", status: "Live", maxTeams: 8 });
    expect(body.eventTime).toEqual({
      start: "2030-03-01T10:00:00.000Z",
      end: "2030-03-01T18:00:00.000Z",
    });
  });

  it("admin delete: asks first, then calls DELETE and returns to the list", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<TournamentDetails />, { route, path });

    await userEvent.click(await screen.findByRole("button", { name: /^Abort$/ }));
    expect(await screen.findByText("Abort Tournament?")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/tournaments/")).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Confirm Abort" }));

    expect(await screen.findByText("Tournament Aborted Permanently!")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/tournaments/").path).toBe(
      `/api/tournaments/${ids.tournamentOpen}`,
    );
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/tournament"));
  });

  it("admin delete: 'Hold Ops' cancels without calling the API", async () => {
    const { calls } = mockApi({ session: "admin" });
    renderAt(<TournamentDetails />, { route, path });

    await userEvent.click(await screen.findByRole("button", { name: /^Abort$/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Hold Ops" }));

    await waitFor(() => expect(screen.queryByText("Abort Tournament?")).not.toBeInTheDocument());
    expect(lastCall(calls, "DELETE", "/tournaments/")).toBeUndefined();
  });
});
