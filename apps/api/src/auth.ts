import "./load-env.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  account,
  db,
  session,
  user,
  verification,
} from "@rescue-router/db";

const baseURL = process.env.AUTH_BASE_URL ?? "http://localhost:5173";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET ?? "dev-change-me-in-production-min-32-chars!",
  baseURL,
  basePath: "/api/auth",
  trustedOrigins: [
    process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    baseURL,
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});
