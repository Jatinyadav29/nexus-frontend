// Booking flows: list, cancel, edit, station grid, and the create wizard.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingList from "../../src/pages/BookingList";
import Booking from "../../src/pages/Booking";
import UpdateBooking from "../../src/components/UpdateBooking";
import StationGrid from "../../src/components/StationGrid";
import { mockApi } from "../mocks/server";
import { ids, bookings } from "../mocks/data";
import { renderAt, lastCall, callTo, must, $ } from "../utils";
import type { CreateBookingRequest, UpdateBookingRequest } from "../../src/types/api";

describe("BookingList", () => {
  it("shows the loading state, then the bookings", async () => {
    mockApi({ session: "user", delayMs: 50 });
    renderAt(<BookingList />, { route: "/bookings" });

    expect(screen.getByText("Syncing with Nexus Mainframe...")).toBeInTheDocument();
    expect(await screen.findByText("riya@example.test")).toBeInTheDocument();
    expect(screen.getByText("9123456780")).toBeInTheDocument();
    expect(screen.getByText("PC-01")).toBeInTheDocument();
    expect(screen.getByText("2 OPS")).toBeInTheDocument();
    expect(screen.getByText("ID: 0B0001")).toBeInTheDocument();
  });

  it("current behaviour (AUDIT SEC-01): other customers' bookings are rendered too", async () => {
    mockApi({ session: "user" });
    renderAt(<BookingList />, { route: "/bookings" });

    expect(await screen.findByText("kabir@example.test")).toBeInTheDocument();
    expect(screen.getByText("9988776655")).toBeInTheDocument();
  });

  it("a user can manage only their own booking", async () => {
    mockApi({ session: "user" });
    renderAt(<BookingList />, { route: "/bookings" });
    await screen.findByText("riya@example.test");

    expect(screen.getAllByRole("button", { name: /Abort/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Re-Calibrate/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Re-Calibrate/ })).toHaveAttribute(
      "href",
      `/booking/update/${ids.bookingMine}`,
    );
    expect(screen.getByText(/Your Squad/)).toBeInTheDocument();
  });

  it("an admin can manage every booking", async () => {
    mockApi({ session: "admin" });
    renderAt(<BookingList />, { route: "/bookings" });
    await screen.findByText("riya@example.test");

    expect(screen.getAllByRole("button", { name: /Abort/ })).toHaveLength(2);
    expect(screen.getByText(/All Units/)).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    mockApi({ session: "user", bookings: "empty" });
    renderAt(<BookingList />, { route: "/bookings" });

    expect(
      await screen.findByText("Radar Clear. No active deployments detected."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when loading fails", async () => {
    mockApi({ session: "user", bookings: "error" });
    renderAt(<BookingList />, { route: "/bookings" });

    expect(await screen.findByText("COULD NOT SYNC WITH MAINFRAME.")).toBeInTheDocument();
  });

  it("cancel: asks for confirmation, calls DELETE and removes the card", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<BookingList />, { route: "/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getByRole("button", { name: /Abort/ }));
    expect(await screen.findByText("Abort Mission?")).toBeInTheDocument();
    expect(lastCall(calls, "DELETE", "/bookings/")).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Confirm Abort" }));

    expect(await screen.findByText("DEPLOYMENT ABORTED SUCCESSFULLY.")).toBeInTheDocument();
    expect(callTo(calls, "DELETE", "/bookings/").path).toBe(`/api/bookings/${ids.bookingMine}`);
    await waitFor(() => expect(screen.queryByText("riya@example.test")).not.toBeInTheDocument());
  });

  it("cancel: 'Hold Ops' closes the dialog without calling the API", async () => {
    const { calls } = mockApi({ session: "user" });
    renderAt(<BookingList />, { route: "/bookings" });
    await screen.findByText("riya@example.test");

    await userEvent.click(screen.getByRole("button", { name: /Abort/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Hold Ops" }));

    await waitFor(() => expect(screen.queryByText("Abort Mission?")).not.toBeInTheDocument());
    expect(lastCall(calls, "DELETE", "/bookings/")).toBeUndefined();
  });
});

describe("UpdateBooking", () => {
  const route = `/booking/update/${ids.bookingMine}`;
  const path = "/booking/update/:id";

  it("loads the booking and prefills the form", async () => {
    mockApi({ session: "admin" });
    const { container } = renderAt(<UpdateBooking />, { route, path });

    expect(screen.getByText("Scanning Matrix...")).toBeInTheDocument();
    expect(await screen.findByText("Operative: riya")).toBeInTheDocument();
    expect(screen.getByText("Squad: 2")).toBeInTheDocument();
    expect(container.querySelector('input[type="tel"]')).toHaveValue("9123456780");
    expect(container.querySelector("select")).toHaveValue("10:00");
  });

  it("saves phone, the new time window and a recomputed amount, then returns to the list", async () => {
    const { calls } = mockApi({ session: "admin" });
    const { container } = renderAt(<UpdateBooking />, { route, path });
    await screen.findByText("Operative: riya");

    const phone = $(container, 'input[type="tel"]');
    await userEvent.clear(phone);
    await userEvent.type(phone, "9555555555");
    await userEvent.selectOptions($(container, "select"), "09:30");
    await userEvent.click(screen.getByRole("button", { name: "PM" }));
    await userEvent.click(screen.getByRole("button", { name: "3H" }));
    await userEvent.click(screen.getByRole("button", { name: /CONFIRM RE-CALIBRATION/ }));

    expect(await screen.findByText("DEPLOYMENT RE-CALIBRATED!")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/bookings"));

    const { body, path: calledPath } = callTo<UpdateBookingRequest>(calls, "PUT", "/bookings/");
    expect(calledPath).toBe(`/api/bookings/${ids.bookingMine}`);
    expect(Object.keys(body).sort()).toEqual(["bookingTime", "phone", "totalAmount"]);
    expect(body.phone).toBe("9555555555");
    expect(body.totalAmount).toBe(2 * 3 * 100); // membersCount × hours × 100
    expect(body.bookingTime?.start).toMatch(/T21:30:00\.000Z$/);
    const slot = must(body.bookingTime);
    expect(new Date(slot.end).getTime() - new Date(slot.start).getTime()).toBe(3 * 3600 * 1000);
  });

  it("SEC-17 fixed (ML-009): the owner can open their own booking", async () => {
    const { calls } = mockApi({ session: "user" });
    const { container } = renderAt(<UpdateBooking />, { route, path });

    await waitFor(() =>
      expect(container.querySelector('input[type="tel"]')).toHaveValue(
        must(bookings.find((b) => b._id === ids.bookingMine)).phone,
      ),
    );
    expect(screen.queryByText("Forbidden Access.")).not.toBeInTheDocument();
    expect(callTo(calls, "GET", "/bookings/").path).toBe(`/api/bookings/${ids.bookingMine}`);
  });

  it("someone who is neither owner nor admin gets 403, a toast and is sent back", async () => {
    mockApi({ session: "user", bookingById: "forbidden" });
    renderAt(<UpdateBooking />, { route, path });

    expect(await screen.findByText("Forbidden Access.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/bookings"));
  });
});

describe("StationGrid", () => {
  it("lists stations from the API and lets the user pick available ones only", async () => {
    mockApi();
    const onFinalize = vi.fn();
    renderAt(<StationGrid maxSelectable={2} onFinalize={onFinalize} />);

    expect(screen.getByText("Scanning Sector for Available Units...")).toBeInTheDocument();
    expect(await screen.findByText("PC-01")).toBeInTheDocument();
    expect(screen.getByText("Need 2 more to confirm.")).toBeInTheDocument();

    await userEvent.click(screen.getByText("PC-03")); // Occupied
    await userEvent.click(screen.getByText("PC-04")); // Maintenance
    expect(screen.getByText("Need 2 more to confirm.")).toBeInTheDocument();

    await userEvent.click(screen.getByText("PC-01"));
    expect(screen.getByText("Need 1 more to confirm.")).toBeInTheDocument();
    await userEvent.click(screen.getByText("PC-02"));

    await userEvent.click(await screen.findByRole("button", { name: "Confirm Deployment" }));
    expect(onFinalize).toHaveBeenCalledWith(["PC-01", "PC-02"]);
  });

  it("shows the empty state when no stations exist", async () => {
    mockApi({ stations: "empty" });
    renderAt(<StationGrid maxSelectable={1} onFinalize={() => {}} />);

    expect(
      await screen.findByText("No Stations Found in Database. Run Seed Script."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ stations: "error" });
    renderAt(<StationGrid maxSelectable={1} onFinalize={() => {}} />);

    expect(await screen.findByText("Radar Offline: Could not sync with base.")).toBeInTheDocument();
  });
});

describe("Booking wizard (create)", () => {
  const walkToForm = async (container: HTMLElement) => {
    fireEvent.change(await waitFor(() => {
      const range = container.querySelector('input[type="range"]');
      expect(range).not.toBeNull();
      return must(range);
    }), { target: { value: "2" } });
    await userEvent.click(await screen.findByText(/CONFIRM 2 PLAYERS/));
    await userEvent.click(await screen.findByText("PC-01"));
    await userEvent.click(screen.getByText("PC-02"));
    await userEvent.click(await screen.findByRole("button", { name: "Confirm Deployment" }));
    return screen.findByPlaceholderText("CONTACT NUMBER");
  };

  it("sends the documented payload and shows the confirmation step", async () => {
    const { calls } = mockApi({ session: "user" });
    const { container } = renderAt(<Booking />, { route: "/booking" });

    const phone = await walkToForm(container);
    await userEvent.type(phone, "9123456780");
    await userEvent.click(screen.getByRole("button", { name: "2H" }));
    await userEvent.click(screen.getByRole("button", { name: "FINALIZE DEPLOYMENT" }));

    expect(await screen.findByText("MISSION ACCOMPLISHED")).toBeInTheDocument();
    const { body, credentials } = callTo<CreateBookingRequest>(calls, "POST", "/bookings");
    expect(credentials).toBe("include");
    expect(Object.keys(body).sort()).toEqual([
      "bookingTime",
      "bookingType",
      "email",
      "membersCount",
      "membersName",
      "name",
      "phone",
      "stations",
      "totalAmount",
    ]);
    expect(body).toMatchObject({
      name: "riya",
      email: "riya@example.test",
      phone: "9123456780",
      bookingType: "PC",
      membersCount: 2,
      membersName: ["riya"],
      stations: ["PC-01", "PC-02"],
      totalAmount: 2 * 2 * 100, // players × hours × 100, computed in the browser
    });
    expect(body.bookingTime.start).toMatch(/T21:00:00\.000Z$/); // default 09:00 PM
    expect(new Date(body.bookingTime.end).getTime() - new Date(body.bookingTime.start).getTime()).toBe(
      2 * 3600 * 1000,
    );
  });

  it("shows the server's message when the slot clashes with a tournament", async () => {
    mockApi({ session: "user", bookingCreate: "clash" });
    const { container } = renderAt(<Booking />, { route: "/booking" });

    const phone = await walkToForm(container);
    await userEvent.type(phone, "9123456780");
    await userEvent.click(screen.getByRole("button", { name: "FINALIZE DEPLOYMENT" }));

    expect(await screen.findByText("Cafe is reserved for 'Winter Clash'.")).toBeInTheDocument();
    expect(screen.queryByText("MISSION ACCOMPLISHED")).not.toBeInTheDocument();
  });

  it("sends a logged-out visitor to /login", async () => {
    mockApi({ session: "none" });
    renderAt(<Booking />, { route: "/booking" });

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });
});
