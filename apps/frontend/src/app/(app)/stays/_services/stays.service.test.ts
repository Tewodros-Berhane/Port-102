import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import {
  addCharge,
  checkoutStay,
  extendStay,
  moveRoom,
  recordPayment,
} from "./stays.service";
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
describe("cashier stay contracts", () => {
  beforeEach(() => vi.clearAllMocks());
  it("submits move and extension DTOs", () => {
    moveRoom(3, { fromAssignmentId: 7, toRoomId: 12, reason: "Quiet room" });
    extendStay(3, {
      newExpectedCheckOutDate: "2026-08-15",
      reason: "Extra night",
    });
    expect(apiClient.post).toHaveBeenCalledWith("proxy/stays/3/room-move", {
      fromAssignmentId: 7,
      toRoomId: 12,
      reason: "Quiet room",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("proxy/stays/3/extend", {
      newExpectedCheckOutDate: "2026-08-15",
      reason: "Extra night",
    });
  });
  it("submits financial and checkout DTOs exactly", () => {
    addCharge(4, {
      type: "MANUAL_CHARGE",
      description: "Extra bed",
      quantity: 1,
      unitAmount: 50,
    });
    recordPayment({
      folioId: 4,
      amount: 25,
      method: "CASH",
      generateReceipt: true,
    });
    checkoutStay(3, { closeFolio: true });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "proxy/folios/4/line-items",
      expect.objectContaining({ type: "MANUAL_CHARGE", unitAmount: 50 }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "proxy/payments", {
      folioId: 4,
      amount: 25,
      method: "CASH",
      generateReceipt: true,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      "proxy/stays/3/check-out",
      { closeFolio: true },
    );
  });
});
