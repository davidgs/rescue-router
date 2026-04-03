import { z } from "zod";

export const orgRoles = ["admin", "coordinator", "driver"] as const;
export type OrgRole = (typeof orgRoles)[number];
export const orgRoleSchema = z.enum(orgRoles);

export const transportStatuses = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TransportStatus = (typeof transportStatuses)[number];
export const transportStatusSchema = z.enum(transportStatuses);

export const legStatuses = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type LegStatus = (typeof legStatuses)[number];
export const legStatusSchema = z.enum(legStatuses);

export const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: orgRoleSchema,
});

export const redeemInvitationSchema = z.object({
  token: z.string().min(1),
});

export const createDogSchema = z.object({
  name: z.string().min(1).max(200),
  careNotes: z.string().max(10000).optional(),
});

export const patchDogSchema = createDogSchema.partial();

export const createTransportSchema = z.object({
  title: z.string().min(1).max(300),
  notes: z.string().max(10000).optional(),
  originText: z.string().min(1).max(2000),
  destinationText: z.string().min(1).max(2000),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  status: transportStatusSchema.optional(),
  dogIds: z.array(z.string().uuid()).optional(),
});

export const patchTransportSchema = createTransportSchema.partial();

const latSchema = z.number().finite().gte(-90).lte(90);
const lngSchema = z.number().finite().gte(-180).lte(180);

function refineLegEndpointCoords<
  T extends {
    startLat?: number | null;
    startLng?: number | null;
    endLat?: number | null;
    endLng?: number | null;
  },
>(data: T, ctx: z.RefinementCtx) {
  const pairs: [keyof T, keyof T][] = [
    ["startLat", "startLng"],
    ["endLat", "endLng"],
  ];
  for (const [a, b] of pairs) {
    const av = data[a] as number | null | undefined;
    const bv = data[b] as number | null | undefined;
    const aSet = av != null;
    const bSet = bv != null;
    if (aSet !== bSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must be provided together for each endpoint",
      });
    }
  }
}

export const createLegSchema = z
  .object({
    sequence: z.number().int().min(0),
    startLocation: z.string().min(1).max(2000),
    endLocation: z.string().min(1).max(2000),
    startLat: latSchema.optional(),
    startLng: lngSchema.optional(),
    endLat: latSchema.optional(),
    endLng: lngSchema.optional(),
    plannedStart: z.string().datetime().optional(),
    plannedEnd: z.string().datetime().optional(),
    assignedUserId: z.string().min(1).nullable().optional(),
    status: legStatusSchema.optional(),
  })
  .superRefine(refineLegEndpointCoords);

export const patchLegSchema = z
  .object({
    startLocation: z.string().min(1).max(2000).optional(),
    endLocation: z.string().min(1).max(2000).optional(),
    startLat: z.union([latSchema, z.null()]).optional(),
    startLng: z.union([lngSchema, z.null()]).optional(),
    endLat: z.union([latSchema, z.null()]).optional(),
    endLng: z.union([lngSchema, z.null()]).optional(),
    plannedStart: z.string().datetime().nullable().optional(),
    plannedEnd: z.string().datetime().nullable().optional(),
    assignedUserId: z.union([z.string().min(1), z.null()]).optional(),
    status: legStatusSchema.optional(),
  })
  .superRefine(refineLegEndpointCoords);

export const reorderLegsSchema = z.object({
  legIds: z.array(z.string().uuid()),
});

/** Pre-seeded demo data (see `pnpm demo:seed`). Safe for local development only. */
export const demoSeed = {
  orgName: "Demo County Animal Rescue",
  orgSlug: "demo-rescue",
  password: "demo-demo-demo",
  coordinatorEmail: "coordinator+demo@example.com",
  coordinatorName: "Alex Coordinator",
  driverEmail: "driver+demo@example.com",
  driverName: "Jordan Driver",
} as const;

/**
 * Seeded user used by **Try demo** (`POST /api/demo/enter`). Coordinator so the
 * demo can see team, assignments, and coordinator UI (mutations are still blocked).
 */
export const demoReadOnlyViewerEmail = demoSeed.coordinatorEmail;
