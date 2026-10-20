import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(here, "..", "..", ".env"), override: true });
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL is required for drizzle-kit (load from repo root .env)",
  );
}

const parsed = new URL(dbUrl);
console.log(
  `[drizzle-kit] DATABASE_URL target: ${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`,
);

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
