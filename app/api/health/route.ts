// app/api/health/route.ts
// Simple health endpoint to verify env and DB connectivity without modifying data.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const hasDbUrl = !!(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
    if (!hasDbUrl) {
      return NextResponse.json({ ok: false, env: false, db: false, error: "DATABASE_URL not set" }, { status: 500 });
    }
    // light DB check
    const sql = getDb();
    await sql`select 1`;
    return NextResponse.json({ ok: true, env: true, db: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, env: true, db: false, error: e?.message || "db error" }, { status: 500 });
  }
}
