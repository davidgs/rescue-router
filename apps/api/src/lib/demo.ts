import type { FastifyRequest } from "fastify";
import { demoReadOnlyViewerEmail, demoSeed } from "@rescue-router/shared";
import { getSessionUser } from "./session.js";

/** When unset, demo entry is allowed unless NODE_ENV is `production` (local dev works without extra env). */
export function demoEnterEnabled(): boolean {
  if (process.env.DEMO_ENTER_ENABLED === "true") return true;
  if (process.env.DEMO_ENTER_ENABLED === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Email signed in by POST /api/demo/enter (defaults to seeded demo coordinator). */
export function demoGuestEmailNormalized(): string {
  return (
    process.env.DEMO_GUEST_EMAIL ?? demoReadOnlyViewerEmail
  ).toLowerCase();
}

/**
 * Password for demo sign-in (server env only). In production you must set
 * DEMO_GUEST_PASSWORD to match the seeded demo user.
 */
export function resolveDemoGuestPassword(): string | null {
  if (process.env.DEMO_GUEST_PASSWORD)
    return process.env.DEMO_GUEST_PASSWORD;
  if (process.env.NODE_ENV === "production") return null;
  return demoSeed.password;
}

export function isDemoReadOnlyUser(email: string): boolean {
  return email.toLowerCase() === demoGuestEmailNormalized();
}

/**
 * When true, the shared demo account cannot mutate data (safe for public marketing sites).
 * - `DEMO_READ_ONLY=true` → always block demo mutations.
 * - `DEMO_READ_ONLY=false` → never block (fully interactive demo; use with care).
 * - unset → block only in production (local/staging demos can use the app normally).
 */
export function demoMutationsBlocked(): boolean {
  if (process.env.DEMO_READ_ONLY === "true") return true;
  if (process.env.DEMO_READ_ONLY === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** True when this mutating request should be rejected for the demo viewer (see demoMutationsBlocked). */
export async function shouldBlockDemoMutation(
  request: FastifyRequest,
): Promise<boolean> {
  if (!demoMutationsBlocked()) return false;
  const m = request.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  const path = request.url.split("?")[0] ?? "";
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/auth")) return false;
  if (path === "/api/demo/enter") return false;
  const u = await getSessionUser(request);
  return !!u && isDemoReadOnlyUser(u.email);
}
