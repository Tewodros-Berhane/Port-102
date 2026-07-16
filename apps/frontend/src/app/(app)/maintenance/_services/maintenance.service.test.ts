import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { maintenanceApi } from "./maintenance.service";
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
describe("maintenance API contracts", () => {
  beforeEach(() => vi.clearAllMocks());
  it("serializes assigned ticket filters", () => {
    maintenanceApi.assigned({
      page: 2,
      limit: 20,
      status: "IN_PROGRESS",
      search: "pump",
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      "proxy/maintenance/tickets/assigned/me",
      { page: 2, limit: 20, status: "IN_PROGRESS", search: "pump" },
    );
  });
  it("uses exact lifecycle DTO fields", () => {
    maintenanceApi.complete(4, "Fixed");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/maintenance/tickets/4/complete",
      { completionNotes: "Fixed" },
    );
    maintenanceApi.reject(4, "Still leaking");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/maintenance/tickets/4/reject",
      { rejectionReason: "Still leaking" },
    );
  });
  it("uses metadata-only photo and room endpoints", () => {
    maintenanceApi.photo(4, "https://example.test/photo.jpg", "Before repair");
    expect(apiClient.post).toHaveBeenCalledWith(
      "proxy/maintenance/tickets/4/photos",
      { url: "https://example.test/photo.jpg", description: "Before repair" },
    );
    maintenanceApi.markUnder(7, "Repair");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "proxy/maintenance/rooms/7/mark-under-maintenance",
      { reason: "Repair" },
    );
  });
});
