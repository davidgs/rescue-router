# Rescue transport app — initial planning

## 1. Problem and vision

Many dog rescues run **relay transports**: multiple **legs**, each driven by a volunteer for about one to two hours, then a **handoff** to the next driver. Coordinators need to plan routes, assign people, and execute the day with clear contact and animal information. Each driver must be given an exact clear pick-up and drop-off (exchange) location and the coordinator must be able to se the entire transport and progress along the route. The coordinator should be able to easily email/text each driver with their pick-up/drop-off location as well as clear turn-by-turn directions for their leg of the route.

The coordinator should be able to send invites to new members, and they should be able to access a simple form from that invite to sign up and enter their information including address, email address, phone number, car make and model, and license plate number.

The owner oof the overall app should be able to send invites to new rescue organizations so that the organization owner can fill out a simple form for information about the organization, and invite rescue coordinators to the org (who can then invite drivers, etc.)

Coordinators should have a simple form to add new dogs needing transport that includes dog's name, breed, size, weight, sex, whether the dog is spayed/neutered, current location, and destination.

**Goal:** A practical, easy-to-use app that supports **planning and execution** of these transports and volunteer drivers, with **multi-tenancy** so each rescue group has its own isolated **organization account**.

---

## 2. What “practical” means

### Planning

- **Transport**: origin, destination, date/time window, dog(s), special needs (crate, meds, behavior notes).
- **Legs**: ordered segments with start/end location, distance/duration estimates, assigned driver (or open slot), planned pickup/handoff times.
- **Volunteers / drivers**: contact info, optional home base or service area, max leg length, vehicle capacity, blackout dates.
- **Routing**: Start with **manual legs** and map links; optional later: suggestions or optimization along a corridor with human approval. Legs should be specific along major highways, etc. Coordinator should be able to search near each proposed transfer point to find a suitable location (typically gas stations, restaurant parking lots, hotel/motel parking lots, etc.)

### Execution

- **Run sheet** (day-of): one place per transport—contacts, addresses, dog photo/notes, simple “running late” or status.
- **Notifications**: Email for v1; SMS later if needed.
- **Status**: e.g. planned → in progress → completed (per leg and/or whole transport).
- **Audit / handoff trail**: who had the dog when (operations and accountability).

---

## 3. Users and roles

| Role | Typical capabilities |
|------|----------------------|
| **Org admin** | Org settings, invites, members; billing later if applicable. |
| **Coordinator** | Create transports and legs, assign drivers, communicate. |
| **Driver** | Invited user; sees assigned legs, details, updates status. |

**v1 decision:** Drivers are **invited users** (full accounts), not anonymous SMS-only participants.

Optional later: limited **token links** for fosters/senders (no full account).

---

## 4. Multi-tenancy

**Recommended default:** **Row-level tenancy** — every tenant-owned row carries `organization_id`; every API path resolves the user’s membership and **never trusts** a client-supplied org id without verification.

| Approach | Notes |
|----------|--------|
| Row-level + `organization_id` | One DB, one migration path; enforce in app and optionally with **PostgreSQL RLS**. |
| Schema per tenant | Stronger isolation; more migration overhead at scale. |
| Database per tenant | Maximum isolation; higher ops cost. |

**Compliance / safety:** Addresses and phones are sensitive; define retention and who can see what inside an org.

---

## 5. Technology choices

- **Frontend:** React (e.g. Vite SPA or Next.js if you want server components / simpler auth wiring).
- **Backend / API:** Node (Fastify, Express, Hono) with **Postgres**, or Next.js API routes / server actions with the same DB.
- **DB access:** Raw `pg`, or **Drizzle**, **Prisma**, or **Kysely** (migrations + type safety help as the schema grows).
- **Auth:** Auth.js, Clerk, Supabase Auth, or similar — must support **email invites** and **organization membership**.

**Deferred for v1:** Cross-org volunteer pools, public tracking pages, automatic multi-stop optimization, SMS as primary driver channel.

---

## 6. Authentication and invitations (drivers as users)

- Identity: email + password or magic link.
- **Invitation** record: `email`, `organization_id`, `role` (e.g. `driver`, `coordinator`, `admin`), expiring token (store **hash** only).
- Flow: coordinator invites → email with link → sign-up or login → redeem token → create **`organization_members`** row.

**Security:** Short-lived, single-use invite tokens; rate limits; every query scoped by verified membership; optional RLS as a safety net.

---

## 7. Data model (minimal Postgres)

- `organizations`
- `users` (or provider subject ids, depending on auth)
- `organization_members` — `(user_id, organization_id, role)` unique pair
- `invitations` — org, email, role, token hash, expiry, accepted timestamp
- `volunteer_profiles` (optional but useful) — `user_id`, `organization_id`, preferences and constraints
- `transports` — org, schedule window, origin/destination, status
- `dogs` — org, identifiers and care notes
- `transport_dogs` — many-to-many
- `legs` — `transport_id`, sequence, locations, times, `assigned_user_id`, status

**Indexes:** `(organization_id, …)` on tenant tables; unique `(transport_id, sequence)` on legs. **PostGIS** can wait until you need distance queries or serious routing.

---

## 8. Frontend patterns (React)

- Load memberships after login; **org switcher** if a user belongs to multiple orgs.
- API sends session/JWT; server derives `user_id` and **validates org** on every mutating request.
- **Driver home:** upcoming legs, leg detail (map link, contacts, dog notes), status updates when you add workflows.

---

## 9. Deployment: self-host now, cloud later, Kubernetes-ready later

### Principles (works on a single VM today, fits K8s later)

- **Twelve-factor style:** config via environment variables; no secrets in the image.
- **Stateless app:** session in DB or signed cookie/JWT; horizontal scaling does not depend on local disk.
- **One container image** (or two if you split web and API) built from a repeatable Dockerfile; same image for self-host and cloud.
- **Postgres** as a **managed or separate** process: on self-host, bind to private network or localhost; in cloud/K8s, use a managed DB or a StatefulSet — app connects via **URL from env**.
- **Migrations** run as an explicit step (job, init container, or deploy hook), not only on app boot in prod if you want zero-downtime discipline later.
- **Background work** (email, reminders): start with a **queue table + worker process** or a small worker container; later the worker becomes another Deployment in K8s with the same image and different `CMD`.
- **Ingress / TLS:** Caddy or Traefik on the VM; in K8s, Ingress + cert-manager.

### Self-host v1 (no Kubernetes)

- Docker Compose: `app` + `postgres` (+ optional `worker` for jobs).
- Reverse proxy + HTTPS in front.

### Cloud later

- Same Compose layout often maps to: managed Postgres + container service (Railway, Fly, ECS, Cloud Run, etc.) with the same env vars.

### Kubernetes later (optional)

- **Deployments:** `web` (and `api` if split), `worker`.
- **Service** per deployment; **Ingress** for HTTP.
- **Secrets** for DB URL and auth secrets.
- **ConfigMap** for non-secret config.
- Avoid storing uploads on pod filesystem long-term; use object storage if you add files.

This does **not** require running K8s today; it only avoids choices that block moving API, web, worker, and DB into that model later.

---

## 10. Security checklist (short)

- Tenant isolation on every query (or RLS).
- Invite tokens: hashed, expiring, single use.
- Rate limiting on auth and invite endpoints.

---

## Related documents

- **[ROADMAP.md](./ROADMAP.md)** — phased execution plan from foundation through cloud/Kubernetes readiness and nice-to-haves.
- **[PHASE_1_PLAN.md](./PHASE_1_PLAN.md)** — detailed implementation plan v1: stack choices, per-phase deliverables, and dependency list.
