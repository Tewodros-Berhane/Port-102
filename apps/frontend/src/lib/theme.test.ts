import { describe, expect, it } from "vitest";
import { isThemeMode, themeModes } from "./theme";

describe("theme modes", () => {
  it("supports light, dark, and system", () => expect(themeModes).toEqual(["light", "dark", "system"]));
  it("rejects unsupported persisted values", () => { expect(isThemeMode("dark")).toBe(true); expect(isThemeMode("midnight")).toBe(false); });
});
