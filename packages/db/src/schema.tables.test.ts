import { describe, expect, it } from "vitest";
import {
  dogs,
  invitations,
  legs,
  organizationMembers,
  organizations,
  transports,
  user,
} from "./schema";

describe("Drizzle schema exports", () => {
  it("exports expected org and transport tables", () => {
    expect(organizations).toBeDefined();
    expect(organizationMembers).toBeDefined();
    expect(transports).toBeDefined();
    expect(legs).toBeDefined();
    expect(dogs).toBeDefined();
    expect(invitations).toBeDefined();
    expect(user).toBeDefined();
  });
});
