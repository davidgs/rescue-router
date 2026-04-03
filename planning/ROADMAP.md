# Rescue transport app — phased roadmap

This roadmap complements **[INITIAL_PLAN.md](./INITIAL_PLAN.md)** (vision, architecture, tenancy, and deployment principles). Use it to sequence implementation and delivery.

---

## Phase 0 — Foundation (1–2 weeks, depending on spare time)

- Repo layout: **React app** + **API** (or Next.js monolith), **Postgres** in Docker for local dev.
- **Auth** with org-less login working first, then **organizations** + **members** + **roles**.
- **Invitation** flow for `coordinator` and `driver`; redeem → membership.
- **Health checks** and **structured logging** (helps any hosting target).

**Exit criteria:** Two test users, two orgs, no cross-org data visible.

---

## Phase 1 — MVP domain

- CRUD: **transports**, **dogs**, **legs** (manual ordering and assignments).
- Driver view: **my legs** with read-only org-scoped detail.
- Coordinator view: transport board + leg editor + assign member by email/name.
- **Email** for invites minimum; optional **transactional email** for “new leg assigned” (can be phase 2).

**Exit criteria:** End-to-end “create transport → assign legs to invited drivers → drivers see their legs.”

---

## Phase 2 — Day-of execution

- **Run sheet** page (print-friendly CSS or PDF export later).
- **Leg / transport status** transitions and timestamps.
- **Reminder** job (worker): e.g. 24h and 1h before first leg (configurable per org later).

**Exit criteria:** A coordinator can run a real transport from the app without spreadsheets.

---

## Phase 3 — Hardening for “real” self-host

- Backups for Postgres (automated dumps or volume snapshots documented).
- **Compose** file + short **README** for deploy on your server.
- Basic **backup/restore** drill once.

**Exit criteria:** You’d trust it for one org’s real data with backups.

---

## Phase 4 — Cloud and Kubernetes readiness (when you migrate)

- Document **env vars** and **migration** procedure.
- Publish **container image(s)** to a registry.
- Optional: **Helm chart** or plain K8s manifests (`Deployment`, `Service`, `Ingress`, `CronJob` or worker `Deployment`).

**Exit criteria:** Same app runs on VM Compose and on a cluster with only config changes.

---

## Phase 5 — Nice-to-haves (prioritize by rescue feedback)

- Map / duration hints (Mapbox, Google), optional PostGIS.
- SMS, public read-only tracking links.
- Volunteer availability and “suggest next driver” (heuristics, not full optimization at first).

---

## Related documents

- **[INITIAL_PLAN.md](./INITIAL_PLAN.md)** — product scope, multi-tenancy, stack, data model, deployment, and security.
- **[PHASE_1_PLAN.md](./PHASE_1_PLAN.md)** — detailed implementation plan v1 (phases 0–5), dependencies, and technical exit criteria.
