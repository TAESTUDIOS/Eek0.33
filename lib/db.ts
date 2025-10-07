/**
 * lib/db.ts
 * Neon Postgres client (server-only). Reads URL from env.
 * Set DATABASE_URL in .env.local (do not hardcode secrets).
 */

import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}
