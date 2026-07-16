import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";
describe("login schema", () => {
  it("accepts the backend DTO shape", () =>
    expect(
      loginSchema.safeParse({
        email: "staff@example.com",
        password: "password",
      }).success,
    ).toBe(true));
  it("rejects invalid email and short passwords", () =>
    expect(
      loginSchema.safeParse({ email: "bad", password: "short" }).success,
    ).toBe(false));
});
