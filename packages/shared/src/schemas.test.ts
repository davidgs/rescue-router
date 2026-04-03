import { describe, expect, it } from "vitest";
import {
  createDogSchema,
  createInvitationSchema,
  createOrgSchema,
  demoSeed,
  orgRoleSchema,
  redeemInvitationSchema,
} from "./index";

describe("shared Zod schemas", () => {
  it("parses createOrgSchema", () => {
    expect(createOrgSchema.parse({ name: "North Star Rescue" }).name).toBe(
      "North Star Rescue",
    );
  });

  it("rejects empty org name", () => {
    expect(() => createOrgSchema.parse({ name: "" })).toThrow();
  });

  it("parses invitation with role", () => {
    const v = createInvitationSchema.parse({
      email: "driver@example.com",
      role: "driver",
    });
    expect(v.email).toBe("driver@example.com");
    expect(orgRoleSchema.safeParse("driver").success).toBe(true);
  });

  it("parses redeem body", () => {
    expect(
      redeemInvitationSchema.parse({ token: "abc" }).token,
    ).toBe("abc");
  });

  it("parses dog create", () => {
    expect(createDogSchema.parse({ name: "Bear" }).name).toBe("Bear");
  });

  it("exposes demoSeed emails compatible with createInvitationSchema", () => {
    expect(
      createInvitationSchema.safeParse({
        email: demoSeed.coordinatorEmail,
        role: "admin",
      }).success,
    ).toBe(true);
  });
});
