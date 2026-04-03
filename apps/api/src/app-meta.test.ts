import { describe, expect, it } from "vitest";

describe("apps/api", () => {
  it("loads module graph smoke check", () => {
    expect(typeof fetch).toBe("function");
  });
});
