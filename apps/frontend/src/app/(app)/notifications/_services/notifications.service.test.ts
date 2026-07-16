import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { getNotifications } from "./notifications.service";

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("notifications service", () => {
  it("requests the backend list whose unwrapped result is the notification array", () => {
    getNotifications({ page: 1, limit: 100 });
    expect(apiClient.get).toHaveBeenCalledWith("proxy/notifications", {
      page: 1,
      limit: 100,
    });
  });
});
