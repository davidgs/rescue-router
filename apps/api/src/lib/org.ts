import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, organizationMembers, organizations } from "@rescue-router/db";
import type { OrgRole } from "@rescue-router/shared";
import { getSessionUser } from "./session.js";

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = await getSessionUser(request);
  if (!user) {
    await reply.status(401).send({ error: "Unauthorized" });
    return null;
  }
  return user;
}

export async function getMembership(userId: string, organizationId: string) {
  const [row] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function requireOrgMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  organizationId: string,
  allowedRoles?: OrgRole[],
) {
  const user = await requireUser(request, reply);
  if (!user) return null;
  const membership = await getMembership(user.id, organizationId);
  if (!membership) {
    await reply
      .status(403)
      .send({ error: "Not a member of this organization" });
    return null;
  }
  if (allowedRoles?.length) {
    const ok = allowedRoles.includes(membership.role as OrgRole);
    if (!ok) {
      await reply.status(403).send({ error: "Insufficient role" });
      return null;
    }
  }
  return { user, membership };
}

export async function loadOrganization(organizationId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org ?? null;
}
