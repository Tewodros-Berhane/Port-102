import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import {
  cancelReservation,
  checkInReservation,
  createReservation,
  getReservations,
  listAvailableRooms,
} from "./reservations.service";
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
describe("reservations service contracts", () => {
  beforeEach(() => vi.clearAllMocks());
  it("serializes supported list filters", () => {
    getReservations({
      page: 2,
      limit: 20,
      status: "CONFIRMED",
      source: "PHONE",
    });
    expect(apiClient.get).toHaveBeenCalledWith("proxy/reservations", {
      page: 2,
      limit: 20,
      status: "CONFIRMED",
      source: "PHONE",
    });
  });
  it("submits the backend create DTO without derived fields", () => {
    const payload = {
      guestId: 12,
      checkInDate: "2026-08-10",
      checkOutDate: "2026-08-12",
      rooms: [{ roomTypeId: 4 }],
    };
    createReservation(payload);
    expect(apiClient.post).toHaveBeenCalledWith("proxy/reservations", payload);
  });
  it("uses backend availability and transition endpoints", () => {
    listAvailableRooms({
      checkInDate: "2026-08-10",
      checkOutDate: "2026-08-12",
      roomTypeId: 4,
    });
    cancelReservation(8, "Guest request");
    checkInReservation(8, {});
    expect(apiClient.get).toHaveBeenCalledWith(
      "proxy/reservations/availability/rooms",
      expect.any(Object),
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/reservations/8/cancel",
      { cancellationReason: "Guest request" },
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "proxy/reservations/8/check-in",
      {},
    );
  });
});
