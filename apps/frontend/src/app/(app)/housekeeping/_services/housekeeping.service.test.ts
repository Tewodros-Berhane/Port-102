import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { housekeepingService } from "./housekeeping.service";
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
describe("housekeeping service contracts", () => {
  beforeEach(() => vi.clearAllMocks());
  it("serializes assigned task filters to the assigned-to-me endpoint", () => {
    housekeepingService.assigned({
      page: 2,
      limit: 20,
      status: "IN_PROGRESS",
      search: "101",
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      "proxy/housekeeping/tasks/assigned/me",
      { page: 2, limit: 20, status: "IN_PROGRESS", search: "101" },
    );
  });
  it("sends the exact room cleaning enum payload", () => {
    housekeepingService.updateCleaning(12, "INSPECTED", "Supervisor check");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/housekeeping/rooms/12/cleaning-status",
      { cleaningStatus: "INSPECTED", reason: "Supervisor check" },
    );
  });
  it("uses backend rejection and issue resolution DTO fields", () => {
    housekeepingService.reject(8, "Dust remains", "Reinspect");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/housekeeping/tasks/8/reject",
      { reason: "Dust remains", inspectionNotes: "Reinspect" },
    );
    housekeepingService.resolveIssue(3, "Lamp replaced");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/housekeeping/issues/3/resolve",
      { resolutionNotes: "Lamp replaced" },
    );
  });
});
