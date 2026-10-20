import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}
const parsedDbUrl = new URL(databaseUrl);
console.log(
  `[db] connected target: ${parsedDbUrl.hostname}:${parsedDbUrl.port || "5432"}${parsedDbUrl.pathname}`,
);

const client = postgres(databaseUrl, { max: 10 });

export const db = drizzle(client, { schema });

export type Database = typeof db;
