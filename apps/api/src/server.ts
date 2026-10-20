import "./load-env.js";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { createHash, randomBytes } from "node:crypto";
import {
  createDogSchema,
  createInvitationSchema,
  createLegSchema,
  createOrgSchema,
  createTransportSchema,
  patchDogSchema,
  patchLegSchema,
  patchTransportSchema,
  redeemInvitationSchema,
  reorderLegsSchema,
} from "@rescue-router/shared";
import { z } from "zod";
import {
  db,
  dogs,
  invitations,
  legs,
  organizationMembers,
  organizations,
  transportDogs,
  transports,
  user,
} from "@rescue-router/db";
import { auth } from "./auth.js";
import {
  demoEnterEnabled,
  demoGuestEmailNormalized,
  resolveDemoGuestPassword,
  shouldBlockDemoMutation,
} from "./lib/demo.js";
import { forwardAuthResponse } from "./lib/forward-auth-response.js";
import { sendInviteEmail } from "./lib/mail.js";
import {
  getMembership,
  loadOrganization,
  requireOrgMembership,
  requireUser,
} from "./lib/org.js";

const orgIdParam = z.object({
  orgId: z.string().uuid(),
});

const transportIdParam = orgIdParam.extend({
  transportId: z.string().uuid(),
});

const legIdParam = transportIdParam.extend({
  legId: z.string().uuid(),
});

const dogIdParam = orgIdParam.extend({
  dogId: z.string().uuid(),
});

const poiCache = new Map<
  string,
  {
    expiresAt: number;
    rows: Array<{
      id: string;
      lat: number;
      lon: number;
      amenity: string;
      name: string | null;
    }>;
  }
>();

const geocodeCache = new Map<
  string,
  {
    expiresAt: number;
    value: { lat: number; lon: number; label: string };
  }
>();

async function main() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: { colorize: true },
            }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();
  app.log.info(
    { dbTarget: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "missing" },
    "API boot environment",
  );

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });
  await app.register(cookie);
  await app.register(helmet);
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
  });

  app.addHook("preHandler", async (request, reply) => {
    if (await shouldBlockDemoMutation(request)) {
      return reply.status(403).send({
        error:
          "The shared demo account is view-only. Create your own account to make changes.",
      });
    }
  });

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/readyz", async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true };
    } catch {
      return reply.status(503).send({ ok: false });
    }
  });

  const authPublicBase =
    process.env.AUTH_BASE_URL ?? "http://localhost:5173";

  app.post(
    "/api/demo/enter",
    {
      preHandler:
        typeof app.rateLimit === "function"
          ? app.rateLimit({ max: 15, timeWindow: "1 minute" })
          : async () => {},
    },
    async (_request, reply) => {
      if (!demoEnterEnabled()) {
        return reply.status(503).send({
          error:
            "Try demo is turned off for this server. Set DEMO_ENTER_ENABLED=true on the API, or run the API with NODE_ENV not set to production for local development.",
        });
      }
      const password = resolveDemoGuestPassword();
      if (!password) {
        return reply.status(503).send({
          error: "Demo login is not configured on this server.",
        });
      }
      const email = demoGuestEmailNormalized();
      const req = new Request(`${authPublicBase}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: authPublicBase,
        },
        body: JSON.stringify({ email, password }),
      });
      try {
        const response = await auth.handler(req);
        if (!response.ok) {
          const t = await response.text();
          app.log.warn(
            { status: response.status, body: t },
            "Demo sign-in rejected by auth",
          );
          return reply.status(503).send({
            error:
              "Demo session could not be started. Run yarn demo:seed and set DEMO_GUEST_PASSWORD if you use a non-default password.",
          });
        }
        return forwardAuthResponse(reply, response);
      } catch (e) {
        app.log.error(e);
        return reply.status(500).send({ error: "Demo sign-in failed" });
      }
    },
  );

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = fromNodeHeaders(request.headers);
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.method !== "GET" && request.method !== "HEAD" && request.body
            ? { body: JSON.stringify(request.body) }
            : {}),
        });
        const response = await auth.handler(req);
        return forwardAuthResponse(reply, response);
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: "Authentication error" });
      }
    },
  });

  app.get("/api/me/memberships", async (request, reply) => {
    const u = await requireUser(request, reply);
    if (!u) return;
    const rows = await db
      .select({
        organizationId: organizations.id,
        name: organizations.name,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(eq(organizationMembers.userId, u.id));
    return rows;
  });

  app.post(
    "/api/orgs",
    { schema: { body: createOrgSchema } },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const { name } = request.body;
      const [org] = await db
        .insert(organizations)
        .values({ name })
        .returning();
      if (!org) {
        return reply.status(500).send({ error: "Failed to create organization" });
      }
      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: u.id,
        role: "admin",
      });
      return org;
    },
  );

  app.post(
    "/api/orgs/:orgId/invitations",
    {
      schema: {
        params: orgIdParam,
        body: createInvitationSchema,
      },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const org = await loadOrganization(orgId);
      if (!org) return reply.status(404).send({ error: "Organization not found" });

      const raw = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(raw).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(invitations).values({
        organizationId: orgId,
        email: request.body.email.toLowerCase(),
        role: request.body.role,
        tokenHash,
        expiresAt,
      });

      await sendInviteEmail({
        to: request.body.email,
        token: raw,
        organizationName: org.name,
      });

      return { ok: true };
    },
  );

  app.post(
    "/api/invitations/redeem",
    { schema: { body: redeemInvitationSchema } },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const tokenHash = createHash("sha256")
        .update(request.body.token)
        .digest("hex");

      const [inv] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.tokenHash, tokenHash))
        .limit(1);

      if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
        return reply.status(400).send({ error: "Invalid or expired invitation" });
      }

      if (inv.email.toLowerCase() !== u.email.toLowerCase()) {
        return reply
          .status(403)
          .send({ error: "Signed in as a different email than the invite" });
      }

      const existing = await getMembership(u.id, inv.organizationId);
      if (existing) {
        await db
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, inv.id));
        return { ok: true, organizationId: inv.organizationId };
      }

      await db.transaction(async (tx) => {
        await tx.insert(organizationMembers).values({
          organizationId: inv.organizationId,
          userId: u.id,
          role: inv.role,
        });
        await tx
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, inv.id));
      });

      return { ok: true, organizationId: inv.organizationId };
    },
  );

  /** Transports */
  app.get(
    "/api/orgs/:orgId/transports",
    { schema: { params: orgIdParam } },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId);
      if (!ctx) return;
      const list = await db
        .select()
        .from(transports)
        .where(eq(transports.organizationId, orgId))
        .orderBy(asc(transports.windowStart));
      if (!list.length) return [];
      const tids = list.map((t) => t.id);
      const links = await db
        .select({
          transportId: transportDogs.transportId,
          dogId: transportDogs.dogId,
        })
        .from(transportDogs)
        .where(inArray(transportDogs.transportId, tids));
      const dogIdsByTransport = new Map<string, string[]>();
      for (const row of links) {
        const cur = dogIdsByTransport.get(row.transportId) ?? [];
        cur.push(row.dogId);
        dogIdsByTransport.set(row.transportId, cur);
      }
      return list.map((t) => ({
        ...t,
        dogIds: dogIdsByTransport.get(t.id) ?? [],
      }));
    },
  );

  app.post(
    "/api/orgs/:orgId/transports",
    {
      schema: {
        params: orgIdParam,
        body: createTransportSchema,
      },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const b = request.body;
      const [row] = await db
        .insert(transports)
        .values({
          organizationId: orgId,
          title: b.title,
          notes: b.notes,
          originText: b.originText,
          destinationText: b.destinationText,
          windowStart: new Date(b.windowStart),
          windowEnd: new Date(b.windowEnd),
          status: b.status ?? "draft",
        })
        .returning();
      if (!row) return reply.status(500).send({ error: "Insert failed" });
      if (b.dogIds?.length) {
        const valid = await db
          .select({ id: dogs.id })
          .from(dogs)
          .where(
            and(eq(dogs.organizationId, orgId), inArray(dogs.id, b.dogIds)),
          );
        const ids = valid.map((d) => d.id);
        if (ids.length) {
          await db.insert(transportDogs).values(
            ids.map((dogId) => ({ transportId: row.id, dogId })),
          );
        }
      }
      return row;
    },
  );

  app.get(
    "/api/orgs/:orgId/transports/:transportId",
    { schema: { params: transportIdParam } },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId);
      if (!ctx) return;
      const [row] = await db
        .select()
        .from(transports)
        .where(
          and(
            eq(transports.id, transportId),
            eq(transports.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!row) return reply.status(404).send({ error: "Not found" });
      const dogRows = await db
        .select({ dog: dogs })
        .from(transportDogs)
        .innerJoin(dogs, eq(transportDogs.dogId, dogs.id))
        .where(eq(transportDogs.transportId, transportId));
      return { ...row, dogs: dogRows.map((r) => r.dog) };
    },
  );

  app.patch(
    "/api/orgs/:orgId/transports/:transportId",
    {
      schema: {
        params: transportIdParam,
        body: patchTransportSchema,
      },
    },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const b = request.body;
      const [existing] = await db
        .select()
        .from(transports)
        .where(
          and(
            eq(transports.id, transportId),
            eq(transports.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!existing) return reply.status(404).send({ error: "Not found" });

      const [row] = await db
        .update(transports)
        .set({
          ...(b.title !== undefined && { title: b.title }),
          ...(b.notes !== undefined && { notes: b.notes }),
          ...(b.originText !== undefined && { originText: b.originText }),
          ...(b.destinationText !== undefined && {
            destinationText: b.destinationText,
          }),
          ...(b.windowStart !== undefined && {
            windowStart: new Date(b.windowStart),
          }),
          ...(b.windowEnd !== undefined && {
            windowEnd: new Date(b.windowEnd),
          }),
          ...(b.status !== undefined && { status: b.status }),
        })
        .where(eq(transports.id, transportId))
        .returning();
      if (b.dogIds) {
        await db
          .delete(transportDogs)
          .where(eq(transportDogs.transportId, transportId));
        if (b.dogIds.length) {
          const valid = await db
            .select({ id: dogs.id })
            .from(dogs)
            .where(
              and(eq(dogs.organizationId, orgId), inArray(dogs.id, b.dogIds)),
            );
          const ids = valid.map((d) => d.id);
          if (ids.length) {
            await db.insert(transportDogs).values(
              ids.map((dogId) => ({ transportId, dogId })),
            );
          }
        }
      }
      return row;
    },
  );

  app.delete(
    "/api/orgs/:orgId/transports/:transportId",
    { schema: { params: transportIdParam } },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const res = await db
        .delete(transports)
        .where(
          and(
            eq(transports.id, transportId),
            eq(transports.organizationId, orgId),
          ),
        )
        .returning({ id: transports.id });
      if (!res.length) return reply.status(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  /** Legs */
  app.get(
    "/api/orgs/:orgId/transports/:transportId/legs",
    { schema: { params: transportIdParam } },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId);
      if (!ctx) return;
      const [t] = await db
        .select({ id: transports.id })
        .from(transports)
        .where(
          and(
            eq(transports.id, transportId),
            eq(transports.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!t) return reply.status(404).send({ error: "Transport not found" });
      const list = await db
        .select({
          leg: legs,
          driver: { id: user.id, name: user.name, email: user.email },
        })
        .from(legs)
        .leftJoin(user, eq(legs.assignedUserId, user.id))
        .where(eq(legs.transportId, transportId))
        .orderBy(asc(legs.sequence));
      return list.map((r) => ({
        ...r.leg,
        assignedUser: r.driver?.id ? r.driver : null,
      }));
    },
  );

  app.post(
    "/api/orgs/:orgId/transports/:transportId/legs",
    {
      schema: {
        params: transportIdParam,
        body: createLegSchema,
      },
    },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const [t] = await db
        .select({ id: transports.id })
        .from(transports)
        .where(
          and(
            eq(transports.id, transportId),
            eq(transports.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!t) return reply.status(404).send({ error: "Transport not found" });
      const b = request.body;
      if (typeof b.assignedUserId === "string") {
        const m = await getMembership(b.assignedUserId, orgId);
        if (!m) {
          return reply
            .status(400)
            .send({ error: "Assigned user is not a member of this org" });
        }
      }
      const [row] = await db
        .insert(legs)
        .values({
          transportId,
          sequence: b.sequence,
          startLocation: b.startLocation,
          endLocation: b.endLocation,
          startLat: b.startLat ?? null,
          startLng: b.startLng ?? null,
          endLat: b.endLat ?? null,
          endLng: b.endLng ?? null,
          plannedStart: b.plannedStart ? new Date(b.plannedStart) : null,
          plannedEnd: b.plannedEnd ? new Date(b.plannedEnd) : null,
          assignedUserId: b.assignedUserId ?? null,
          status: b.status ?? "pending",
        })
        .returning();
      return row;
    },
  );

  app.patch(
    "/api/orgs/:orgId/transports/:transportId/legs/:legId",
    {
      schema: {
        params: legIdParam,
        body: patchLegSchema,
      },
    },
    async (request, reply) => {
      const { orgId, transportId, legId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const b = request.body;
      if (typeof b.assignedUserId === "string") {
        const m = await getMembership(b.assignedUserId, orgId);
        if (!m) {
          return reply
            .status(400)
            .send({ error: "Assigned user is not a member of this org" });
        }
      }
      const [row] = await db
        .update(legs)
        .set({
          ...(b.startLocation !== undefined && { startLocation: b.startLocation }),
          ...(b.endLocation !== undefined && { endLocation: b.endLocation }),
          ...(b.startLat !== undefined && { startLat: b.startLat }),
          ...(b.startLng !== undefined && { startLng: b.startLng }),
          ...(b.endLat !== undefined && { endLat: b.endLat }),
          ...(b.endLng !== undefined && { endLng: b.endLng }),
          ...(b.plannedStart !== undefined && {
            plannedStart: b.plannedStart ? new Date(b.plannedStart) : null,
          }),
          ...(b.plannedEnd !== undefined && {
            plannedEnd: b.plannedEnd ? new Date(b.plannedEnd) : null,
          }),
          ...(b.assignedUserId !== undefined && {
            assignedUserId: b.assignedUserId,
          }),
          ...(b.status !== undefined && { status: b.status }),
        })
        .where(
          and(
            eq(legs.id, legId),
            eq(legs.transportId, transportId),
          ),
        )
        .returning();
      if (!row) return reply.status(404).send({ error: "Not found" });
      return row;
    },
  );

  app.delete(
    "/api/orgs/:orgId/transports/:transportId/legs/:legId",
    { schema: { params: legIdParam } },
    async (request, reply) => {
      const { orgId, transportId, legId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const res = await db
        .delete(legs)
        .where(
          and(eq(legs.id, legId), eq(legs.transportId, transportId)),
        )
        .returning({ id: legs.id });
      if (!res.length) return reply.status(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  app.patch(
    "/api/orgs/:orgId/transports/:transportId/legs/reorder",
    {
      schema: {
        params: transportIdParam,
        body: reorderLegsSchema,
      },
    },
    async (request, reply) => {
      const { orgId, transportId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const { legIds } = request.body;
      const existing = await db
        .select({ id: legs.id })
        .from(legs)
        .where(eq(legs.transportId, transportId));
      const idSet = new Set(existing.map((e) => e.id));
      if (legIds.length !== idSet.size || !legIds.every((id) => idSet.has(id))) {
        return reply.status(400).send({ error: "Leg set mismatch" });
      }
      let seq = 0;
      for (const id of legIds) {
        await db
          .update(legs)
          .set({ sequence: seq++ })
          .where(and(eq(legs.id, id), eq(legs.transportId, transportId)));
      }
      return { ok: true };
    },
  );

  app.get(
    "/api/orgs/:orgId/members",
    { schema: { params: orgIdParam } },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      return db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          name: user.name,
          email: user.email,
        })
        .from(organizationMembers)
        .innerJoin(user, eq(organizationMembers.userId, user.id))
        .where(eq(organizationMembers.organizationId, orgId))
        .orderBy(asc(user.name));
    },
  );

  /** Dogs */
  app.get(
    "/api/orgs/:orgId/dogs",
    { schema: { params: orgIdParam } },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId);
      if (!ctx) return;
      return db.select().from(dogs).where(eq(dogs.organizationId, orgId));
    },
  );

  app.post(
    "/api/orgs/:orgId/dogs",
    {
      schema: { params: orgIdParam, body: createDogSchema },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const b = request.body;
      const [row] = await db
        .insert(dogs)
        .values({
          organizationId: orgId,
          name: b.name,
          careNotes: b.careNotes,
        })
        .returning();
      return row;
    },
  );

  app.patch(
    "/api/orgs/:orgId/dogs/:dogId",
    {
      schema: { params: dogIdParam, body: patchDogSchema },
    },
    async (request, reply) => {
      const { orgId, dogId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const b = request.body;
      const [row] = await db
        .update(dogs)
        .set({
          ...(b.name !== undefined && { name: b.name }),
          ...(b.careNotes !== undefined && { careNotes: b.careNotes }),
        })
        .where(and(eq(dogs.id, dogId), eq(dogs.organizationId, orgId)))
        .returning();
      if (!row) return reply.status(404).send({ error: "Not found" });
      return row;
    },
  );

  app.delete(
    "/api/orgs/:orgId/dogs/:dogId",
    { schema: { params: dogIdParam } },
    async (request, reply) => {
      const { orgId, dogId } = request.params;
      const ctx = await requireOrgMembership(request, reply, orgId, [
        "admin",
        "coordinator",
      ]);
      if (!ctx) return;
      const res = await db
        .delete(dogs)
        .where(and(eq(dogs.id, dogId), eq(dogs.organizationId, orgId)))
        .returning({ id: dogs.id });
      if (!res.length) return reply.status(404).send({ error: "Not found" });
      return { ok: true };
    },
  );

  const nominatimUserAgent =
    process.env.NOMINATIM_USER_AGENT ??
    "RescueRouter/1.0 (https://github.com/rescue-router)";

  /** Forward or reverse geocode (Nominatim; authenticated users only). */
  app.get(
    "/api/geocode",
    {
      schema: {
        querystring: z.object({
          q: z.string().min(2).max(500).optional(),
          lat: z.coerce.number().finite().gte(-90).lte(90).optional(),
          lon: z.coerce.number().finite().gte(-180).lte(180).optional(),
        }),
      },
      preHandler:
        typeof app.rateLimit === "function"
          ? app.rateLimit({ max: 40, timeWindow: "1 minute" })
          : async () => {},
    },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const { q, lat, lon } = request.query;
      const hasQ = q != null && q.length >= 2;
      const hasLatLon = lat !== undefined && lon !== undefined;
      if (!hasQ && !hasLatLon) {
        return reply
          .status(400)
          .send({ error: "Provide q= for search or lat= and lon= for reverse" });
      }
      if (hasQ && hasLatLon) {
        return reply
          .status(400)
          .send({ error: "Use either q or lat/lon, not both" });
      }
      try {
        const cacheKey = hasLatLon
          ? `r:${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`
          : `q:${q!.trim().toLowerCase()}`;
        const cached = geocodeCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.value;
        }
        if (hasLatLon) {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
          const res = await fetch(url, {
            headers: {
              "User-Agent": nominatimUserAgent,
              Accept: "application/json",
            },
          });
          if (!res.ok) {
            app.log.warn({ status: res.status }, "Reverse geocode upstream error");
            if (res.status === 429 && cached) return cached.value;
            return reply.status(502).send({ error: "Geocoding service error" });
          }
          const data = (await res.json()) as {
            lat?: string | number;
            lon?: string | number;
            display_name?: string;
            error?: string;
          };
          if (data.error || data.display_name == null) {
            return reply.status(404).send({ error: "Location not found" });
          }
          const plat =
            typeof data.lat === "number" ? data.lat : Number.parseFloat(String(data.lat));
          const plon =
            typeof data.lon === "number" ? data.lon : Number.parseFloat(String(data.lon));
          if (!Number.isFinite(plat) || !Number.isFinite(plon)) {
            return reply.status(404).send({ error: "Location not found" });
          }
          const value = {
            lat: plat,
            lon: plon,
            label: data.display_name,
          };
          geocodeCache.set(cacheKey, {
            expiresAt: Date.now() + 1000 * 60 * 60 * 24,
            value,
          });
          return value;
        }
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q!)}&limit=1`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": nominatimUserAgent,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          app.log.warn({ status: res.status }, "Geocode upstream error");
          if (res.status === 429 && cached) return cached.value;
          return reply.status(502).send({ error: "Geocoding service error" });
        }
        const data = (await res.json()) as {
          lat: string;
          lon: string;
          display_name: string;
        }[];
        const hit = data[0];
        if (!hit) return reply.status(404).send({ error: "Location not found" });
        const value = {
          lat: Number.parseFloat(hit.lat),
          lon: Number.parseFloat(hit.lon),
          label: hit.display_name,
        };
        geocodeCache.set(cacheKey, {
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
          value,
        });
        return value;
      } catch (e) {
        app.log.error(e);
        return reply.status(502).send({ error: "Geocoding failed" });
      }
    },
  );

  app.get(
    "/api/route",
    {
      schema: {
        querystring: z.object({
          startLat: z.coerce.number().finite().gte(-90).lte(90),
          startLon: z.coerce.number().finite().gte(-180).lte(180),
          endLat: z.coerce.number().finite().gte(-90).lte(90),
          endLon: z.coerce.number().finite().gte(-180).lte(180),
        }),
      },
      preHandler:
        typeof app.rateLimit === "function"
          ? app.rateLimit({ max: 60, timeWindow: "1 minute" })
          : async () => {},
    },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const { startLat, startLon, endLat, endLon } = request.query;
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(String(startLon))},${encodeURIComponent(String(startLat))};${encodeURIComponent(String(endLon))},${encodeURIComponent(String(endLat))}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          app.log.warn({ status: res.status }, "Route upstream error");
          return reply.status(502).send({ error: "Routing service error" });
        }
        const data = (await res.json()) as {
          code?: string;
          routes?: Array<{
            distance: number;
            duration: number;
            geometry?: { coordinates?: [number, number][] };
          }>;
        };
        const route = data.routes?.[0];
        const coords = route?.geometry?.coordinates ?? [];
        if (!route || coords.length < 2) {
          return reply.status(404).send({ error: "Route not found" });
        }
        return {
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          points: coords.map(([lon, lat]) => ({ lat, lon })),
        };
      } catch (e) {
        app.log.error(e);
        return reply.status(502).send({ error: "Routing failed" });
      }
    },
  );

  app.get(
    "/api/pois",
    {
      schema: {
        querystring: z.object({
          minLat: z.coerce.number().finite().gte(-90).lte(90),
          minLng: z.coerce.number().finite().gte(-180).lte(180),
          maxLat: z.coerce.number().finite().gte(-90).lte(90),
          maxLng: z.coerce.number().finite().gte(-180).lte(180),
        }),
      },
    },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const { minLat, minLng, maxLat, maxLng } = request.query;
      if (minLat >= maxLat || minLng >= maxLng) {
        return reply.status(400).send({ error: "Invalid map bounds" });
      }
      try {
        const cacheKey = [
          minLat.toFixed(3),
          minLng.toFixed(3),
          maxLat.toFixed(3),
          maxLng.toFixed(3),
        ].join(",");
        const cached = poiCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.rows;
        }
        const viewbox = `${minLng},${maxLat},${maxLng},${minLat}`;
        const poiQueries: Array<{ key: string; q: string }> = [
          { key: "fuel", q: "gas station" },
          { key: "restaurant", q: "restaurant" },
          { key: "cafe", q: "cafe" },
          { key: "supermarket", q: "supermarket" },
          { key: "pharmacy", q: "pharmacy" },
          { key: "hospital", q: "hospital urgent care" },
        ];
        const results: Array<
          Array<{
            id: string;
            lat: number;
            lon: number;
            amenity: string;
            name: string | null;
          }>
        > = [];
        for (const { key, q } of poiQueries) {
            const url =
              `https://nominatim.openstreetmap.org/search?format=jsonv2` +
              `&bounded=1&viewbox=${encodeURIComponent(viewbox)}` +
              `&limit=8&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, {
              headers: {
                "User-Agent": nominatimUserAgent,
                Accept: "application/json",
              },
            });
            if (!res.ok) {
              app.log.warn({ status: res.status, q }, "POI upstream error");
              if (res.status === 429) break;
              results.push([]);
              continue;
            }
            const data = (await res.json()) as Array<{
              place_id?: number;
              lat: string;
              lon: string;
              display_name?: string;
              name?: string;
            }>;
            const rows = data
              .map((r) => {
                const lat = Number.parseFloat(r.lat);
                const lon = Number.parseFloat(r.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                return {
                  id: `${key}:${r.place_id ?? `${lat.toFixed(5)},${lon.toFixed(5)}`}`,
                  lat,
                  lon,
                  amenity: key,
                  name: r.name ?? r.display_name?.split(",")[0] ?? null,
                };
              })
              .filter(
                (
                  row,
                ): row is {
                  id: string;
                  lat: number;
                  lon: number;
                  amenity: string;
                  name: string | null;
                } => !!row,
              );
            results.push(rows);
        }

        const dedup = new Map<
          string,
          { id: string; lat: number; lon: number; amenity: string; name: string | null }
        >();
        for (const group of results) {
          for (const r of group) {
            const key = `${r.lat.toFixed(5)}:${r.lon.toFixed(5)}:${(r.name ?? "").toLowerCase()}`;
            if (!dedup.has(key)) dedup.set(key, r);
          }
        }
        const rows = [...dedup.values()];
        poiCache.set(cacheKey, {
          expiresAt: Date.now() + 1000 * 60 * 5,
          rows,
        });
        return rows;
      } catch (e) {
        app.log.error(e);
        return reply.status(502).send({ error: "POI lookup failed" });
      }
    },
  );

  /** Driver legs */
  app.get(
    "/api/me/legs",
    {
      schema: {
        querystring: z.object({
          upcoming: z.enum(["true", "false"]).optional(),
        }),
      },
    },
    async (request, reply) => {
      const u = await requireUser(request, reply);
      if (!u) return;
      const upcoming = request.query.upcoming !== "false";
      const base = eq(legs.assignedUserId, u.id);
      const cond = upcoming
        ? and(
            base,
            or(
              isNull(legs.plannedStart),
              gte(legs.plannedStart, new Date()),
            ),
          )
        : base;

      const rows = await db
        .select({
          leg: legs,
          transport: transports,
        })
        .from(legs)
        .innerJoin(transports, eq(legs.transportId, transports.id))
        .where(cond)
        .orderBy(asc(legs.plannedStart));

      return rows.map((r) => ({
        ...r.leg,
        transport: {
          id: r.transport.id,
          title: r.transport.title,
          organizationId: r.transport.organizationId,
          originText: r.transport.originText,
          destinationText: r.transport.destinationText,
          windowStart: r.transport.windowStart,
          windowEnd: r.transport.windowEnd,
          status: r.transport.status,
        },
      }));
    },
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
