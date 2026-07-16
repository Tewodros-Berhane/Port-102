import { describe, expect, it } from "vitest";
import { visibleManagementRoutes } from "./Sidebar";
describe("housekeeping navigation permissions", () => {
  it("shows the supervisor feature root", () =>
    expect(visibleManagementRoutes(["housekeeping.dashboard.read"])).toContain(
      "/housekeeping",
    ));
  it("shows the supervisor task queue as its own destination", () => {
    const routes = visibleManagementRoutes(["housekeeping.tasks.read"]);
    expect(routes).toContain("/housekeeping/tasks");
    expect(routes).not.toContain("/housekeeping");
  });
  it("shows attendants only their shared assigned route", () => {
    const routes = visibleManagementRoutes([
      "housekeeping.tasks.read.assigned",
    ]);
    expect(routes).toContain("/housekeeping/assigned");
    expect(routes).not.toContain("/housekeeping");
  });
});
