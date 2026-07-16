import { describe, expect, it } from "vitest";
import { createReservationSchema } from "./reservation.schema";
describe("create reservation schema", () => {
  const valid = {
    guestId: "12",
    checkInDate: "2026-08-10",
    checkOutDate: "2026-08-12",
    adults: "2",
    children: "0",
    source: "PHONE",
    roomTypeId: "4",
    roomId: "",
    specialRequests: "",
    internalNotes: "",
  };
  it("mirrors the backend create DTO coercions", () =>
    expect(createReservationSchema.parse(valid)).toMatchObject({
      guestId: 12,
      adults: 2,
      roomTypeId: 4,
      source: "PHONE",
    }));
  it("rejects checkout dates that are not after check-in", () =>
    expect(
      createReservationSchema.safeParse({
        ...valid,
        checkOutDate: valid.checkInDate,
      }).success,
    ).toBe(false));
});
