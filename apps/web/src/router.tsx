import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { authClient } from "./lib/auth";
import { apiJson, fetchMemberships, type Membership } from "./lib/api";
import { mapsDirUrl } from "./lib/mapsDirections";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { LegMeetingPlacesEditor } from "./components/LegMeetingPlacesEditor";
import { LocationPickerMap } from "./components/LocationPickerMap";
import { TransportRouteMap } from "./components/TransportRouteMap";
import { enterReadOnlyDemo, isDemoViewerSession } from "./lib/demo";

const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const session = authClient.useSession();
  const qc = useQueryClient();
  const [demoErr, setDemoErr] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const demoViewer = isDemoViewerSession(session.data?.user?.email);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="rr-skip">
        Skip to main content
      </a>
      {demoViewer && (
        <div
          role="status"
          aria-live="polite"
          className="rr-demo-strip shadow-sm"
        >
          You&apos;re using the <strong>shared demo</strong> coordinator account
          (see sample transport &amp; legs).{" "}
          <Link
            to="/register"
            className="font-semibold text-[var(--rr-demo-link)] underline decoration-2 underline-offset-4 outline-offset-4 hover:opacity-90 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--rr-focus-ring)]"
          >
            Create an account
          </Link>{" "}
          to run your own transports.
        </div>
      )}
      <header className="rr-header">
        <div className="rr-shell flex flex-col gap-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            aria-label="Rescue Router home"
            className="group flex w-fit max-w-full items-center gap-3 rounded-xl outline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--rr-focus-ring)]"
          >
            <img
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-lg shadow-black/20 ring-1 ring-black/5 dark:ring-white/10"
              decoding="async"
            />
            <span className="rr-display text-lg font-semibold tracking-tight text-[var(--rr-header-text)]">
              Rescue Router
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <ThemeSwitcher />
            <nav
              aria-label="Primary navigation"
              className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            >
            {session.data?.user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rr-nav-link"
                  activeProps={{ className: "rr-nav-link-active" }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/my-legs"
                  className="rr-nav-link"
                  activeProps={{ className: "rr-nav-link-active" }}
                >
                  My legs
                </Link>
                <button
                  type="button"
                  className="rr-nav-link w-auto text-left"
                  onClick={async () => {
                    await authClient.signOut();
                    qc.clear();
                    window.location.replace("/");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={demoLoading}
                  aria-busy={demoLoading}
                  aria-live="polite"
                  className="rr-btn-primary text-sm disabled:opacity-50"
                  onClick={async () => {
                    setDemoErr(null);
                    setDemoLoading(true);
                    try {
                      await enterReadOnlyDemo();
                      window.location.assign("/dashboard");
                    } catch (e) {
                      setDemoErr(
                        e instanceof Error ? e.message : "Could not start demo",
                      );
                    } finally {
                      setDemoLoading(false);
                    }
                  }}
                >
                  Try demo
                </button>
                <Link
                  to="/login"
                  className="rr-nav-link"
                  activeProps={{ className: "rr-nav-link-active" }}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rr-nav-link"
                  activeProps={{ className: "rr-nav-link-active" }}
                >
                  Register
                </Link>
              </>
            )}
            </nav>
          </div>
        </div>
        {!session.data?.user && demoErr && (
          <div
            className="rr-shell border-t border-[var(--rr-header-border)] pb-3 pt-2 text-center text-sm"
            role="alert"
            aria-live="assertive"
          >
            <span className="rr-error-box inline-block max-w-prose text-left">
              {demoErr}
            </span>
          </div>
        )}
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="rr-shell py-8 sm:py-12 outline-none focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}

function HomePage() {
  const session = authClient.useSession();
  return (
    <div className="space-y-10 py-2">
      <div className="rr-card relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-orange-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-2xl space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
            Relay logistics for rescues
          </p>
          <h1 className="rr-display text-4xl font-semibold leading-[1.1] rr-ink sm:text-5xl">
            Plan multi-leg dog transports with clarity
          </h1>
          <p className="max-w-prose text-lg leading-relaxed rr-ink-muted">
            Coordinate volunteers, legs, and timing so every animal gets where
            they need to go—without the spreadsheet chaos.
          </p>
          {session.data?.user ? (
            <Link to="/dashboard" className="rr-btn-primary mt-2">
              Go to dashboard
            </Link>
          ) : (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/register" className="rr-btn-primary text-center">
                Create an account
              </Link>
              <p className="max-w-md text-sm rr-ink-muted sm:pl-1">
                Prefer to look around first? Use{" "}
                <strong className="rr-ink">Try demo</strong> in the
                header—read-only sample data, no signup.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: "One transport, many legs",
            d: "Break a long haul into relay segments drivers can own.",
          },
          {
            t: "Built for volunteers",
            d: "Drivers see their assignments and open directions in one tap.",
          },
          {
            t: "Your org, your data",
            d: "Organizations and invites keep teams separate and safe.",
          },
        ].map((x) => (
          <div key={x.t} className="rr-panel">
            <h2 className="font-semibold rr-ink">{x.t}</h2>
            <p className="mt-2 text-sm leading-relaxed rr-ink-muted">{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage() {
  const nav = useNavigate();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-md">
      <div className="rr-card p-8">
        <form
          className="space-y-5"
          aria-describedby={err ? `${formId}-err` : undefined}
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            const { error } = await authClient.signIn.email({ email, password });
            if (error) setErr(error.message ?? "Sign in failed");
            else await nav({ to: "/dashboard" });
          }}
        >
          <div>
            <h1 className="rr-display text-2xl font-semibold rr-ink">
              Log in
            </h1>
            <p className="mt-2 text-sm leading-relaxed rr-ink-muted">
              New here? Use <strong className="rr-ink">Try demo</strong>{" "}
              in the header for a read-only tour, or create an account.
            </p>
          </div>
          {err && (
            <p id={`${formId}-err`} className="rr-error-box" role="alert">
              {err}
            </p>
          )}
          <label className="rr-label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            className="rr-field mt-1"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="rr-label" htmlFor={passwordId}>
            Password
          </label>
          <input
            id={passwordId}
            className="rr-field mt-1"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="rr-btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

function RegisterPage() {
  const nav = useNavigate();
  const formId = useId();
  const nameId = `${formId}-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-md">
      <div className="rr-card p-8">
        <form
          className="space-y-5"
          aria-describedby={err ? `${formId}-err` : undefined}
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            const { error } = await authClient.signUp.email({
              email,
              password,
              name,
            });
            if (error) setErr(error.message ?? "Registration failed");
            else await nav({ to: "/dashboard" });
          }}
        >
          <h1 className="rr-display text-2xl font-semibold rr-ink">
            Register
          </h1>
          {err && (
            <p id={`${formId}-err`} className="rr-error-box" role="alert">
              {err}
            </p>
          )}
          <label className="rr-label" htmlFor={nameId}>
            Name
          </label>
          <input
            id={nameId}
            className="rr-field mt-1"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="rr-label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            className="rr-field mt-1"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="rr-label" htmlFor={passwordId}>
            Password{" "}
            <span className="font-normal rr-ink-subtle">(min. 8 characters)</span>
          </label>
          <input
            id={passwordId}
            className="rr-field mt-1"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button type="submit" className="rr-btn-primary w-full">
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}

function AcceptInvitePage() {
  const nav = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <div className="mx-auto max-w-md">
      <div className="rr-card space-y-4 p-8 shadow-lg shadow-slate-300/15">
        <h1 className="rr-display text-2xl font-semibold rr-ink">
          Accept invitation
        </h1>
        {!token && (
          <p className="text-sm rr-text-danger">Missing token in URL.</p>
        )}
        {err && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm rr-text-danger">
            {err}
          </p>
        )}
        {done && (
          <p className="text-sm text-emerald-800">
            You joined the organization.{" "}
            <button
              type="button"
              className="font-medium text-orange-600 underline decoration-orange-500/30 hover:decoration-orange-700"
              onClick={() => nav({ to: "/dashboard" })}
            >
              Dashboard
            </button>
          </p>
        )}
        {token && !done && (
          <button
            type="button"
            className="rr-btn-primary"
            onClick={async () => {
              setErr(null);
              try {
                await apiJson("/api/invitations/redeem", {
                  method: "POST",
                  body: JSON.stringify({ token }),
                });
                setDone(true);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Join organization
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const session = authClient.useSession();
  const q = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
    enabled: !!session.data?.user,
  });
  const qc = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const createOrg = useMutation({
    mutationFn: () =>
      apiJson<{ id: string; name: string }>("/api/orgs", {
        method: "POST",
        body: JSON.stringify({ name: orgName }),
      }),
    onSuccess: () => {
      setOrgName("");
      void qc.invalidateQueries({ queryKey: ["memberships"] });
    },
  });

  if (!session.data?.user) {
    return <p>Please log in.</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="rr-display text-2xl font-semibold rr-ink">
        Your organizations
      </h1>
      {q.isLoading && <p className="rr-ink-muted">Loading…</p>}
      {q.error && (
        <p className="rr-text-danger">{(q.error as Error).message}</p>
      )}
      <ul className="space-y-3">
        {(q.data ?? []).map((m: Membership) => (
          <li key={m.organizationId} className="rr-list-item">
            <Link
              to="/orgs/$orgId"
              params={{ orgId: m.organizationId }}
              className="font-semibold text-orange-700 hover:underline"
            >
              {m.name}
            </Link>{" "}
            <span className="text-sm rr-ink-subtle">({m.role})</span>
          </li>
        ))}
      </ul>
      <form
        className="rr-panel flex max-w-md flex-col gap-3 border-t border-[var(--rr-border)] pt-8"
        onSubmit={(e) => {
          e.preventDefault();
          createOrg.mutate();
        }}
      >
        <h2 className="font-semibold rr-ink">Create organization</h2>
        <input
          className="rr-field mt-0"
          placeholder="Rescue name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={createOrg.isPending}
          className="rr-btn-inverse w-fit disabled:opacity-50"
        >
          Create
        </button>
        {createOrg.error && (
          <p className="text-sm rr-text-danger">
            {(createOrg.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}

type OrgMemberRow = {
  userId: string;
  role: string;
  name: string;
  email: string;
};

function OrgTeamPanel({ orgId }: { orgId: string }) {
  const q = useQuery({
    queryKey: ["orgMembers", orgId],
    queryFn: () =>
      apiJson<OrgMemberRow[]>(`/api/orgs/${orgId}/members`),
    enabled: !!orgId,
  });
  if (q.isLoading) {
    return (
      <p className="text-sm rr-ink-muted" aria-live="polite">
        Loading team…
      </p>
    );
  }
  if (q.error) {
    return (
      <p className="text-sm rr-text-danger">
        {(q.error as Error).message}
      </p>
    );
  }
  const members = q.data ?? [];
  const drivers = members.filter((m) => m.role === "driver");
  return (
    <div className="rr-panel">
      <h2 className="rr-display text-lg font-semibold rr-ink">
        Team &amp; drivers
      </h2>
      <p className="mt-1 text-sm rr-ink-muted">
        People in this organization. Coordinators assign transport legs to{" "}
        <strong className="rr-ink">drivers</strong> (and other coordinators)
        from each transport&apos;s detail page.
      </p>
      {drivers.length > 0 && (
        <p className="mt-2 text-sm rr-ink-muted">
          <strong className="rr-ink">{drivers.length}</strong> driver
          {drivers.length === 1 ? "" : "s"} in this org.
        </p>
      )}
      <ul className="mt-4 divide-y divide-[var(--rr-border)]">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-col gap-1 py-3 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium rr-ink">{m.name}</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  m.role === "driver"
                    ? "bg-[var(--rr-chip-bg)] text-[var(--rr-chip-text)]"
                    : "bg-[var(--rr-surface)] text-[var(--rr-text-muted)]"
                }`}
              >
                {m.role}
              </span>
            </div>
            <span className="text-sm rr-ink-subtle">{m.email}</span>
          </li>
        ))}
      </ul>
      {members.length === 0 && (
        <p className="mt-3 text-sm rr-ink-muted">No members yet.</p>
      )}
    </div>
  );
}

function OrgHomePage() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const session = authClient.useSession();
  const q = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
    enabled: !!session.data?.user,
  });
  if (!session.data?.user) {
    return (
      <p className="rr-ink-muted">
        <Link to="/login" className="font-medium text-orange-700 underline">
          Log in
        </Link>{" "}
        to open this organization.
      </p>
    );
  }
  const org = q.data?.find((m) => m.organizationId === orgId);
  if (q.isLoading) {
    return <p className="rr-ink-muted">Loading…</p>;
  }
  if (!org) {
    return <p className="rr-ink-muted">Organization not found or no access.</p>;
  }
  const canManage = org.role === "admin" || org.role === "coordinator";
  return (
    <div className="space-y-8">
      <h1 className="rr-display text-2xl font-semibold rr-ink sm:text-3xl">
        {org.name}
      </h1>
      <nav aria-label="Organization sections" className="flex flex-wrap gap-3">
        <Link
          to="/orgs/$orgId/transports"
          params={{ orgId }}
          className="rr-btn-muted text-sm"
        >
          Transports
        </Link>
        <Link
          to="/orgs/$orgId/dogs"
          params={{ orgId }}
          className="rr-btn-muted text-sm"
        >
          Dogs
        </Link>
        {canManage && (
          <Link
            to="/orgs/$orgId/team"
            params={{ orgId }}
            className="rr-btn-muted text-sm"
          >
            Team &amp; drivers
          </Link>
        )}
      </nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          {canManage ? (
            <OrgTeamPanel orgId={orgId!} />
          ) : (
            <div className="rr-panel">
              <h2 className="rr-display text-lg font-semibold rr-ink">
                Drivers &amp; roster
              </h2>
              <p className="mt-2 text-sm leading-relaxed rr-ink-muted">
                Volunteer drivers and coordinators are listed for admins on the{" "}
                <strong className="rr-ink">Team &amp; drivers</strong> page. As a
                driver, your assignments appear under{" "}
                <Link to="/my-legs" className="font-medium text-orange-700 underline">
                  My legs
                </Link>{" "}
                and on each transport&apos;s leg list.
              </p>
            </div>
          )}
        </div>
        <div>{canManage && <InviteBlock orgId={orgId!} />}</div>
      </div>
    </div>
  );
}

function OrgTeamPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId/team" });
  const session = authClient.useSession();
  const mq = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
    enabled: !!session.data?.user,
  });
  if (!session.data?.user) {
    return (
      <p className="rr-ink-muted">
        <Link to="/login" className="font-medium text-orange-700 underline">
          Log in
        </Link>{" "}
        to view the team.
      </p>
    );
  }
  const org = mq.data?.find((m) => m.organizationId === orgId);
  if (mq.isLoading) {
    return <p className="rr-ink-muted">Loading…</p>;
  }
  if (!org) {
    return <p className="rr-ink-muted">Organization not found or no access.</p>;
  }
  const canManage = org.role === "admin" || org.role === "coordinator";
  if (!canManage) {
    return (
      <div className="space-y-4">
        <p className="rr-ink-muted">
          Only coordinators and admins can open the full volunteer roster. Check{" "}
          <Link to="/my-legs" className="font-medium text-orange-700 underline">
            My legs
          </Link>{" "}
          for your assignments.
        </p>
        <Link
          to="/orgs/$orgId"
          params={{ orgId: orgId! }}
          className="rr-btn-muted inline-flex text-sm"
        >
          ← Back to organization
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <Link
        to="/orgs/$orgId"
        params={{ orgId: orgId! }}
        className="rr-btn-muted inline-flex text-sm"
      >
        ← Organization
      </Link>
      <h1 className="rr-page-title">Team &amp; drivers</h1>
      <OrgTeamPanel orgId={orgId!} />
    </div>
  );
}

function InviteBlock({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"driver" | "coordinator" | "admin">(
    "driver",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rr-panel max-w-md">
      <h2 className="font-semibold rr-ink">Invite volunteer</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setMsg(null);
          try {
            await apiJson(`/api/orgs/${orgId}/invitations`, {
              method: "POST",
              body: JSON.stringify({ email, role }),
            });
            setMsg("Invitation sent (check Mailpit in dev).");
            setEmail("");
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Failed");
          }
        }}
      >
        <input
          type="email"
          className="rr-field mt-0 w-full"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="rr-field mt-0 w-full"
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "driver" | "coordinator" | "admin")
          }
        >
          <option value="driver">driver</option>
          <option value="coordinator">coordinator</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="rr-btn-primary text-sm">
          Send invite
        </button>
        {msg && <p className="text-sm rr-text-success">{msg}</p>}
        {err && <p className="text-sm rr-text-danger">{err}</p>}
      </form>
    </div>
  );
}

type Dog = {
  id: string;
  name: string;
  careNotes: string | null;
};

function DogsPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId/dogs" });
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["dogs", orgId],
    queryFn: () => apiJson<Dog[]>(`/api/orgs/${orgId}/dogs`),
    enabled: !!orgId,
  });
  const tq = useQuery({
    queryKey: ["transports", orgId],
    queryFn: () =>
      apiJson<TransportRow[]>(`/api/orgs/${orgId}/transports`),
    enabled: !!orgId,
  });
  const [name, setName] = useState("");
  const createDog = useMutation({
    mutationFn: () =>
      apiJson<Dog>(`/api/orgs/${orgId}/dogs`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["dogs", orgId] });
    },
  });
  const mq = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });
  const org = mq.data?.find((m) => m.organizationId === orgId);
  const canManage = org?.role === "admin" || org?.role === "coordinator";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="rr-page-title">Dogs</h1>
          <p className="mt-2 max-w-prose text-sm rr-ink-muted">
            Plan a new transport with a dog pre-selected, or jump to a run that
            already includes them.
          </p>
        </div>
        <Link
          to="/orgs/$orgId"
          params={{ orgId: orgId! }}
          className="rr-btn-muted text-sm self-start"
        >
          ← Org
        </Link>
      </div>
      {q.isLoading && <p className="rr-ink-muted">Loading…</p>}
      <ul className="space-y-4">
        {(q.data ?? []).map((d) => {
          const onTransport = tq.data?.find((t) =>
            (t.dogIds ?? []).includes(d.id),
          );
          return (
            <li
              key={d.id}
              className="rr-list-item flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold rr-ink">{d.name}</h2>
                {d.careNotes && (
                  <p className="mt-1 text-sm rr-ink-muted">{d.careNotes}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-col gap-2 sm:items-end">
                {canManage && (
                  <Link
                    to="/orgs/$orgId/transports/new"
                    params={{ orgId: orgId! }}
                    search={{ dogId: d.id }}
                    className="rr-btn-primary text-center text-sm"
                  >
                    Plan transport with {d.name}
                  </Link>
                )}
                {onTransport && (
                  <Link
                    to="/orgs/$orgId/transports/$transportId"
                    params={{
                      orgId: orgId!,
                      transportId: onTransport.id,
                    }}
                    className="text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900"
                  >
                    Open “{onTransport.title}”
                  </Link>
                )}
                {!canManage && !onTransport && (
                  <span className="text-xs rr-ink-subtle">
                    Coordinator tools required to start a new transport.
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {canManage && (
        <form
          className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createDog.mutate();
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="rr-label" htmlFor={`add-dog-${orgId}`}>
              Add another dog
            </label>
            <input
              id={`add-dog-${orgId}`}
              className="rr-field mt-1 w-full"
              placeholder="Dog name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="rr-btn-inverse shrink-0 sm:mb-0.5">
            Add
          </button>
        </form>
      )}
    </div>
  );
}

type TransportRow = {
  id: string;
  title: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  dogIds?: string[];
};

function TransportsPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId/transports" });
  const mq = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });
  const org = mq.data?.find((m) => m.organizationId === orgId);
  const canPlan =
    org?.role === "admin" || org?.role === "coordinator";
  const q = useQuery({
    queryKey: ["transports", orgId],
    queryFn: () =>
      apiJson<TransportRow[]>(`/api/orgs/${orgId}/transports`),
    enabled: !!orgId,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="rr-page-title">Transports</h1>
          {!canPlan && (
            <p className="mt-2 max-w-prose text-sm rr-ink-muted">
              Coordinators and admins create transports. Open a transport below to
              see legs and assignments, or ask for coordinator access.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {canPlan && (
            <Link
              to="/orgs/$orgId/transports/new"
              params={{ orgId: orgId! }}
              search={{ dogId: undefined }}
              className="rr-btn-primary text-sm"
            >
              New transport
            </Link>
          )}
          <Link
            to="/orgs/$orgId"
            params={{ orgId: orgId! }}
            className="rr-btn-muted text-sm"
          >
            ← Org
          </Link>
        </div>
      </div>
      {q.isLoading && <p>Loading…</p>}
      <ul className="space-y-2">
        {(q.data ?? []).map((t) => (
          <li key={t.id}>
            <Link
              to="/orgs/$orgId/transports/$transportId"
              params={{ orgId: orgId!, transportId: t.id }}
              className="font-medium text-orange-700 hover:underline"
            >
              {t.title}
            </Link>
            <span className="ml-2 text-sm rr-ink-subtle">
              {t.status} · {new Date(t.windowStart).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewTransportPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId/transports/new" });
  const { dogId: dogIdFromSearch } = useSearch({
    from: "/orgs/$orgId/transports/new",
  });
  const nav = useNavigate();
  const qc = useQueryClient();
  const dogsQ = useQuery({
    queryKey: ["dogs", orgId],
    queryFn: () => apiJson<Dog[]>(`/api/orgs/${orgId}/dogs`),
    enabled: !!orgId,
  });
  const [title, setTitle] = useState("");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [dogIds, setDogIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const dogIdValid =
    dogIdFromSearch &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      dogIdFromSearch,
    )
      ? dogIdFromSearch
      : undefined;

  useEffect(() => {
    if (!dogIdValid || !dogsQ.data?.some((d) => d.id === dogIdValid)) return;
    setDogIds((prev) =>
      prev.includes(dogIdValid) ? prev : [...prev, dogIdValid],
    );
  }, [dogIdValid, dogsQ.data]);

  return (
    <form
      className="rr-card max-w-lg space-y-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        try {
          const row = await apiJson<{ id: string }>(
            `/api/orgs/${orgId}/transports`,
            {
              method: "POST",
              body: JSON.stringify({
                title,
                originText,
                destinationText,
                windowStart: new Date(windowStart).toISOString(),
                windowEnd: new Date(windowEnd).toISOString(),
                dogIds: dogIds.length ? dogIds : undefined,
              }),
            },
          );
          void qc.invalidateQueries({ queryKey: ["transports", orgId] });
          await nav({
            to: "/orgs/$orgId/transports/$transportId",
            params: { orgId: orgId!, transportId: row.id },
          });
        } catch (er) {
          setErr(er instanceof Error ? er.message : "Failed");
        }
      }}
    >
      <h1 className="rr-display text-2xl font-semibold rr-ink">
        New transport
      </h1>
      {err && <p className="text-sm rr-text-danger">{err}</p>}
      <label className="block text-sm">
        Title
        <input
          className="rr-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Origin
        <textarea
          className="rr-field"
          value={originText}
          onChange={(e) => setOriginText(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Destination
        <textarea
          className="rr-field"
          value={destinationText}
          onChange={(e) => setDestinationText(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Window start
        <input
          type="datetime-local"
          className="rr-field"
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Window end
        <input
          type="datetime-local"
          className="rr-field"
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
          required
        />
      </label>
      {!!dogsQ.data?.length && (
        <fieldset className="text-sm">
          <legend className="font-medium">Dogs on this transport</legend>
          <div className="mt-2 space-y-1">
            {dogsQ.data.map((d) => (
              <label key={d.id} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={dogIds.includes(d.id)}
                  onChange={(e) => {
                    if (e.target.checked) setDogIds([...dogIds, d.id]);
                    else setDogIds(dogIds.filter((x) => x !== d.id));
                  }}
                />
                {d.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button
        type="submit"
        className="rr-btn-primary"
      >
        Create
      </button>
    </form>
  );
}

type Leg = {
  id: string;
  transportId: string;
  sequence: number;
  startLocation: string;
  endLocation: string;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  assignedUserId: string | null;
  status: string;
  assignedUser: { id: string; name: string; email: string } | null;
};

type LegMapPickState =
  | {
      kind: "leg";
      legId: string;
      end: "start" | "end";
      suggestAddress: string;
      initialLat?: number | null;
      initialLng?: number | null;
    }
  | {
      kind: "newLeg";
      end: "start" | "end";
      suggestAddress: string;
      initialLat?: number | null;
      initialLng?: number | null;
    };

type TransportDetail = TransportRow & {
  originText: string;
  destinationText: string;
  dogs: Dog[];
};

function TransportDetailPage() {
  const { orgId, transportId } = useParams({
    from: "/orgs/$orgId/transports/$transportId",
  });
  const session = authClient.useSession();
  const qc = useQueryClient();
  const tq = useQuery({
    queryKey: ["transport", orgId, transportId],
    queryFn: () =>
      apiJson<TransportDetail>(
        `/api/orgs/${orgId}/transports/${transportId}`,
      ),
    enabled: !!orgId && !!transportId,
  });
  const lq = useQuery({
    queryKey: ["legs", transportId],
    queryFn: () =>
      apiJson<Leg[]>(
        `/api/orgs/${orgId}/transports/${transportId}/legs`,
      ),
    enabled: !!orgId && !!transportId,
  });
  const membersQ = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });
  const org = membersQ.data?.find((m) => m.organizationId === orgId);
  const canManage = org?.role === "admin" || org?.role === "coordinator";

  const [startLoc, setStartLoc] = useState("");
  const [endLoc, setEndLoc] = useState("");
  const [seq, setSeq] = useState(0);
  const [newStartLat, setNewStartLat] = useState<number | undefined>();
  const [newStartLng, setNewStartLng] = useState<number | undefined>();
  const [newEndLat, setNewEndLat] = useState<number | undefined>();
  const [newEndLng, setNewEndLng] = useState<number | undefined>();
  const [mapPick, setMapPick] = useState<LegMapPickState | null>(null);

  const orgMembersQ = useQuery({
    queryKey: ["orgMembers", orgId],
    queryFn: () =>
      apiJson<
        { userId: string; role: string; name: string; email: string }[]
      >(`/api/orgs/${orgId}/members`),
    enabled: !!orgId && canManage,
  });

  if (tq.isLoading || !tq.data) return <p>Loading…</p>;

  const t = tq.data;
  const legsSorted = [...(lq.data ?? [])].sort(
    (a, b) => a.sequence - b.sequence,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="rr-page-title">{t.title}</h1>
          <p className="mt-2 text-sm font-medium capitalize rr-ink-muted">
            {t.status}
            <span className="font-normal rr-ink-subtle"> · </span>
            <span className="font-normal">
              {t.originText} → {t.destinationText}
            </span>
          </p>
        </div>
        <Link
          to="/orgs/$orgId/transports"
          params={{ orgId: orgId! }}
          className="rr-btn-muted text-sm self-start"
        >
          ← All transports
        </Link>
      </div>

      {!!t.dogs?.length && (
        <div className="rr-panel">
          <h2 className="text-sm font-semibold uppercase tracking-wide rr-ink-subtle">
            Dogs on this run
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {t.dogs.map((d) => (
              <li
                key={d.id}
                className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-950"
              >
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2 className="mb-3 rr-display text-lg font-semibold rr-ink">
          Route map
        </h2>
        <TransportRouteMap
          legs={legsSorted}
          orgId={orgId!}
          transportId={transportId!}
          canManage={canManage}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="rr-display text-lg font-semibold rr-ink">
            Legs
          </h2>
          {lq.isLoading && (
            <p className="text-sm rr-ink-subtle">Loading legs…</p>
          )}
          <ul className="space-y-3">
            {legsSorted.map((leg) => (
              <li key={leg.id} className="rr-list-item text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-bold rr-ink-muted">
                    Leg {leg.sequence}
                  </span>
                  {session.data?.user && (
                    <a
                      className="text-xs font-semibold text-orange-700 underline decoration-orange-300/50 underline-offset-2 hover:text-orange-900"
                      href={mapsDirUrl(
                        leg.startLocation,
                        leg.endLocation,
                        leg.startLat,
                        leg.startLng,
                        leg.endLat,
                        leg.endLng,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                    </a>
                  )}
                </div>
                <p className="mt-2 font-medium leading-snug rr-ink">
                  {leg.startLocation}
                  <span className="mx-1.5 font-normal rr-ink-subtle">→</span>
                  {leg.endLocation}
                </p>
                <p className="mt-1 rr-ink-muted">
                  <span className="rr-ink-subtle">Assigned:</span>{" "}
                  {leg.assignedUser
                    ? `${leg.assignedUser.name} (${leg.assignedUser.email})`
                    : "—"}
                </p>
                {canManage && orgMembersQ.data && (
                  <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                    <label className="block text-xs font-semibold uppercase tracking-wide rr-ink-subtle">
                      Assign driver
                    </label>
                    <select
                      className="rr-field mt-1.5 max-w-md text-sm"
                      value={leg.assignedUserId ?? ""}
                      onChange={async (e) => {
                        const v = e.target.value;
                        await apiJson(
                          `/api/orgs/${orgId}/transports/${transportId}/legs/${leg.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              assignedUserId: v === "" ? null : v,
                            }),
                          },
                        );
                        void qc.invalidateQueries({
                          queryKey: ["legs", transportId],
                        });
                      }}
                    >
                      <option value="">Unassigned</option>
                      {orgMembersQ.data
                        .filter(
                          (m) =>
                            m.role === "driver" || m.role === "coordinator",
                        )
                        .map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name} ({m.email}) · {m.role}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                {canManage && (
                  <LegMeetingPlacesEditor
                    leg={leg}
                    orgId={orgId!}
                    transportId={transportId!}
                    onOpenMapPicker={(ctx) =>
                      setMapPick({
                        kind: "leg",
                        legId: ctx.legId,
                        end: ctx.end,
                        suggestAddress: ctx.suggestAddress,
                        initialLat: ctx.initialLat,
                        initialLng: ctx.initialLng,
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
          {canManage && (
            <form
              className="rr-muted-well rr-panel mt-6 max-w-lg space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await apiJson(
                  `/api/orgs/${orgId}/transports/${transportId}/legs`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      sequence: seq,
                      startLocation: startLoc,
                      endLocation: endLoc,
                      ...(newStartLat != null &&
                        newStartLng != null && {
                          startLat: newStartLat,
                          startLng: newStartLng,
                        }),
                      ...(newEndLat != null &&
                        newEndLng != null && {
                          endLat: newEndLat,
                          endLng: newEndLng,
                        }),
                    }),
                  },
                );
                setStartLoc("");
                setEndLoc("");
                setNewStartLat(undefined);
                setNewStartLng(undefined);
                setNewEndLat(undefined);
                setNewEndLng(undefined);
                void qc.invalidateQueries({ queryKey: ["legs", transportId] });
              }}
            >
              <h3 className="font-semibold rr-ink">Add leg</h3>
              <div className="flex flex-wrap gap-3">
                <label className="text-xs rr-ink-muted">
                  #
                  <input
                    type="number"
                    className="rr-field mt-1 w-24 text-sm"
                    value={seq}
                    onChange={(e) => setSeq(Number(e.target.value))}
                  />
                </label>
              </div>
              <input
                className="rr-field text-sm"
                placeholder="Start location"
                value={startLoc}
                onChange={(e) => setStartLoc(e.target.value)}
                required
              />
              <input
                className="rr-field text-sm"
                placeholder="End location"
                value={endLoc}
                onChange={(e) => setEndLoc(e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rr-btn-muted text-xs"
                  onClick={() =>
                    setMapPick({
                      kind: "newLeg",
                      end: "start",
                      suggestAddress: startLoc,
                      initialLat: newStartLat,
                      initialLng: newStartLng,
                    })
                  }
                >
                  Set start on map
                </button>
                <button
                  type="button"
                  className="rr-btn-muted text-xs"
                  onClick={() =>
                    setMapPick({
                      kind: "newLeg",
                      end: "end",
                      suggestAddress: endLoc,
                      initialLat: newEndLat,
                      initialLng: newEndLng,
                    })
                  }
                >
                  Set end on map
                </button>
              </div>
              {(newStartLat != null ||
                newStartLng != null ||
                newEndLat != null ||
                newEndLng != null) && (
                <p className="text-[11px] rr-ink-subtle">
                  Exact pins will be saved with this leg (clear by removing both
                  map picks before submit).
                </p>
              )}
              <button
                type="submit"
                className="rr-btn border border-stone-800 bg-stone-900 text-white hover:bg-stone-800"
              >
                Add leg
              </button>
            </form>
          )}
        </div>

        {canManage && (
          <aside className="lg:col-span-1">
            <div className="rr-panel top-24 lg:sticky">
              <h2 className="rr-display text-lg font-semibold rr-ink">
                Org team
              </h2>
              <p className="mt-1 text-xs leading-relaxed rr-ink-subtle">
                Coordinators assign legs to people with the <strong>driver</strong>{" "}
                or <strong>coordinator</strong> role in this organization.
              </p>
              {orgMembersQ.isLoading && (
                <p className="mt-4 text-sm rr-ink-subtle">Loading roster…</p>
              )}
              {orgMembersQ.data && (
                <ul className="mt-4 divide-y divide-stone-100">
                  {orgMembersQ.data.map((m) => (
                    <li
                      key={m.userId}
                      className="flex flex-col gap-0.5 py-3 first:pt-0"
                    >
                      <span className="font-medium rr-ink">
                        {m.name}
                      </span>
                      <span className="text-xs rr-ink-subtle">{m.email}</span>
                      <span className="mt-1 inline-flex w-fit rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rr-ink-muted">
                        {m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
      </div>

      {mapPick && (
        <LocationPickerMap
          suggestAddress={mapPick.suggestAddress}
          initialLat={mapPick.initialLat}
          initialLng={mapPick.initialLng}
          onClose={() => setMapPick(null)}
          onPick={async (p) => {
            if (mapPick.kind === "newLeg") {
              if (mapPick.end === "start") {
                setStartLoc(p.label);
                setNewStartLat(p.lat);
                setNewStartLng(p.lng);
              } else {
                setEndLoc(p.label);
                setNewEndLat(p.lat);
                setNewEndLng(p.lng);
              }
              setMapPick(null);
              return;
            }
            const body =
              mapPick.end === "start"
                ? {
                    startLocation: p.label,
                    startLat: p.lat,
                    startLng: p.lng,
                  }
                : {
                    endLocation: p.label,
                    endLat: p.lat,
                    endLng: p.lng,
                  };
            await apiJson(
              `/api/orgs/${orgId}/transports/${transportId}/legs/${mapPick.legId}`,
              {
                method: "PATCH",
                body: JSON.stringify(body),
              },
            );
            void qc.invalidateQueries({ queryKey: ["legs", transportId] });
            setMapPick(null);
          }}
        />
      )}
    </div>
  );
}

type MyLegRow = {
  id: string;
  startLocation: string;
  endLocation: string;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  transport: { title: string };
};

function MyLegsPage() {
  const q = useQuery({
    queryKey: ["myLegs"],
    queryFn: () => apiJson<MyLegRow[]>("/api/me/legs?upcoming=true"),
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My upcoming legs</h1>
      {q.isLoading && <p>Loading…</p>}
      {q.error && (
        <p className="rr-text-danger">{(q.error as Error).message}</p>
      )}
      <ul className="space-y-3">
        {(q.data ?? []).map((row) => (
          <li
            key={row.id}
            className="rr-list-item p-4"
          >
            <div className="font-medium">{row.transport.title}</div>
            <div className="text-sm rr-ink-muted">
              {row.startLocation} → {row.endLocation}
            </div>
            <a
              className="mt-2 inline-block text-sm text-orange-600"
              href={mapsDirUrl(
                row.startLocation,
                row.endLocation,
                row.startLat,
                row.startLng,
                row.endLat,
                row.endLng,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Directions
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const acceptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  component: AcceptInvitePage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const orgHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId",
  component: OrgHomePage,
});

const orgTeamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/team",
  component: OrgTeamPage,
});

const dogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/dogs",
  component: DogsPage,
});

const transportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/transports",
  component: TransportsPage,
});

const newTransportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/transports/new",
  validateSearch: (raw: Record<string, unknown>) => ({
    dogId:
      typeof raw.dogId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        raw.dogId,
      )
        ? raw.dogId
        : undefined,
  }),
  component: NewTransportPage,
});

const transportDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orgs/$orgId/transports/$transportId",
  component: TransportDetailPage,
});

const myLegsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-legs",
  component: MyLegsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  acceptRoute,
  dashboardRoute,
  orgHomeRoute,
  orgTeamRoute,
  dogsRoute,
  transportsRoute,
  newTransportRoute,
  transportDetailRoute,
  myLegsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
