import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format.utils";
import { formatPropertyDate } from "./date.utils";
describe("property formatting", () => {
  it("uses configured currency", () => expect(formatCurrency(10, { locale: "en-US", defaultCurrency: "USD" })).toContain("$10.00"));
  it("uses configured timezone", () => expect(formatPropertyDate("2026-01-01T00:30:00Z", { locale: "en-CA", timezone: "America/New_York" })).toContain("Dec"));
});
