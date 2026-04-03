import "../src/load-env.js";
import { eq } from "drizzle-orm";
import { demoSeed } from "@rescue-router/shared";
import {
  db,
  dogs,
  legs,
  organizationMembers,
  organizations,
  transportDogs,
  transports,
  user,
} from "@rescue-router/db";
import { auth } from "../src/auth.js";

const baseURL = process.env.AUTH_BASE_URL ?? "http://localhost:5173";

function requireDemoGate(): void {
  const ok =
    process.env.ALLOW_DEMO_SEED === "true" || process.env.DEMO_MODE === "true";
  if (!ok) {
    console.error(
      "Refusing to seed: set ALLOW_DEMO_SEED=true or DEMO_MODE=true in .env (never in production).",
    );
    process.exit(1);
  }
}

async function signUpOrGetUserId(
  name: string,
  email: string,
  password: string,
): Promise<string> {
  const req = new Request(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseURL,
    },
    body: JSON.stringify({ name, email, password }),
  });
  const res = await auth.handler(req);
  const text = await res.text();
  if (res.ok) {
    const json = JSON.parse(text) as { user: { id: string } };
    return json.user.id;
  }
  const lower = text.toLowerCase();
  const duplicate =
    res.status === 422 ||
    lower.includes("already") ||
    lower.includes("exists");
  if (duplicate) {
    const [row] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);
    if (row) {
      console.log(`User already exists, reusing: ${email}`);
      return row.id;
    }
  }
  throw new Error(`Sign-up failed for ${email} (${res.status}): ${text}`);
}

async function main(): Promise<void> {
  requireDemoGate();
  const force = process.argv.includes("--force");

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, demoSeed.orgSlug))
    .limit(1);

  if (existing && !force) {
    console.log(
      `Demo org "${demoSeed.orgSlug}" already exists. Use --force to delete it and re-seed.`,
    );
    process.exit(0);
  }

  if (existing && force) {
    await db.delete(organizations).where(eq(organizations.id, existing.id));
    console.log("Deleted existing demo organization and related rows.");
  }

  console.log("Creating demo users (via Better Auth)…");
  const coordinatorId = await signUpOrGetUserId(
    demoSeed.coordinatorName,
    demoSeed.coordinatorEmail,
    demoSeed.password,
  );
  const driverId = await signUpOrGetUserId(
    demoSeed.driverName,
    demoSeed.driverEmail,
    demoSeed.password,
  );

  console.log("Creating demo organization, dogs, transport, legs…");
  const [org] = await db
    .insert(organizations)
    .values({ name: demoSeed.orgName, slug: demoSeed.orgSlug })
    .returning();
  if (!org) throw new Error("Failed to create organization");

  await db.insert(organizationMembers).values([
    { organizationId: org.id, userId: coordinatorId, role: "admin" },
    { organizationId: org.id, userId: driverId, role: "driver" },
  ]);

  const [dogMilo] = await db
    .insert(dogs)
    .values({
      organizationId: org.id,
      name: "Milo",
      careNotes: "Nervous in cars; keep secured in a crate.",
    })
    .returning();
  const [dogBella] = await db
    .insert(dogs)
    .values({
      organizationId: org.id,
      name: "Bella",
      careNotes: "Friendly; offer water breaks about every two hours.",
    })
    .returning();
  if (!dogMilo || !dogBella) throw new Error("Failed to create dogs");

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() + 1);
  windowStart.setHours(8, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 2);
  windowEnd.setHours(18, 0, 0, 0);

  const [transport] = await db
    .insert(transports)
    .values({
      organizationId: org.id,
      title: "I-95 relay: Richmond → Philadelphia",
      notes: "Demo-only relay with three legs along the Mid-Atlantic corridor.",
      originText: "Richmond, VA — foster home pickup",
      destinationText: "Philadelphia, PA — adoptive home drop-off",
      windowStart,
      windowEnd,
      status: "scheduled",
    })
    .returning();
  if (!transport) throw new Error("Failed to create transport");

  await db.insert(transportDogs).values([
    { transportId: transport.id, dogId: dogMilo.id },
    { transportId: transport.id, dogId: dogBella.id },
  ]);

  const legPlan: {
    sequence: number;
    startLocation: string;
    endLocation: string;
    assignedUserId: string | null;
  }[] = [
    {
      sequence: 0,
      startLocation: "Richmond, VA",
      endLocation: "Fredericksburg, VA",
      assignedUserId: coordinatorId,
    },
    {
      sequence: 1,
      startLocation: "Fredericksburg, VA",
      endLocation: "Baltimore, MD",
      assignedUserId: driverId,
    },
    {
      sequence: 2,
      startLocation: "Baltimore, MD",
      endLocation: "Philadelphia, PA",
      assignedUserId: null,
    },
  ];

  let legTime = new Date(windowStart);
  for (const leg of legPlan) {
    const plannedStart = new Date(legTime);
    const plannedEnd = new Date(legTime);
    plannedEnd.setHours(plannedEnd.getHours() + 2);
    await db.insert(legs).values({
      transportId: transport.id,
      sequence: leg.sequence,
      startLocation: leg.startLocation,
      endLocation: leg.endLocation,
      plannedStart,
      plannedEnd,
      assignedUserId: leg.assignedUserId,
      status: "pending",
    });
    legTime = plannedEnd;
  }

  console.log("\nDemo seed complete.\n");
  console.log(`  Organization: ${demoSeed.orgName} (${demoSeed.orgSlug})`);
  console.log(
    `  Coordinator:  ${demoSeed.coordinatorEmail} / ${demoSeed.password}`,
  );
  console.log(`  Driver:       ${demoSeed.driverEmail} / ${demoSeed.password}`);
  console.log(`  Transport:    ${transport.title}`);
  console.log(`
To enable Try demo in the web menu: set DEMO_ENTER_ENABLED=true and DEMO_GUEST_PASSWORD
to the same value as the coordinator password above (unless you changed it). See README / SECURITY.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
