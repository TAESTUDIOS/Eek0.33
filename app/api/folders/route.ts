/**
 * app/api/folders/route.ts
 * API routes for folders CRUD using Neon database
 * LOC: ~120
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/folders - fetch all folders from database
export async function GET() {
  try {
    const sql = getDb();
    const folders = await sql`
      SELECT id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
      FROM folders
      ORDER BY updated_at DESC
    `;
    return NextResponse.json({ ok: true, folders });
  } catch (error: any) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST /api/folders - create a new folder
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, parentId, createdAt, updatedAt } = body;

    if (!id || !name) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (${id}, ${name}, ${parentId || null}, ${createdAt}, ${updatedAt})
    `;

    return NextResponse.json({ ok: true, folder: body });
  } catch (error: any) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/folders - update an existing folder
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, parentId, updatedAt } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing folder id" }, { status: 400 });
    }

    const sql = getDb();
    const timestamp = updatedAt || Date.now();
    
    // Perform update based on what fields are provided
    if (name !== undefined && parentId !== undefined) {
      await sql`
        UPDATE folders
        SET name = ${name}, parent_id = ${parentId}, updated_at = ${timestamp}
        WHERE id = ${id}
      `;
    } else if (name !== undefined) {
      await sql`
        UPDATE folders
        SET name = ${name}, updated_at = ${timestamp}
        WHERE id = ${id}
      `;
    } else if (parentId !== undefined) {
      await sql`
        UPDATE folders
        SET parent_id = ${parentId}, updated_at = ${timestamp}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE folders
        SET updated_at = ${timestamp}
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true, folder: body });
  } catch (error: any) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/folders?id=... - delete a folder (cascade handled by DB)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const sql = getDb();
    // Delete folder (cascade will handle children and notes)
    await sql`DELETE FROM folders WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
