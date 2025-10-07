// app/api/ping/route.ts
// Minimal route with zero dependencies to validate App Router API mounting.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, pong: true });
}
