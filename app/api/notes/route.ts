/**
 * app/api/notes/route.ts
 * API routes for notes CRUD using Neon database
 * LOC: ~120
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/notes - fetch all notes from database
export async function GET() {
  try {
    const sql = getDb();
    const notes = await sql`
      SELECT id, title, content, folder_id as "folderId", created_at as "createdAt", updated_at as "updatedAt"
      FROM notes
      ORDER BY updated_at DESC
    `;
    return NextResponse.json({ ok: true, notes });
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST /api/notes - create a new note
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, content, folderId, createdAt, updatedAt } = body;

    if (!id || !title || content === undefined) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      INSERT INTO notes (id, title, content, folder_id, created_at, updated_at)
      VALUES (${id}, ${title}, ${content}, ${folderId || null}, ${createdAt}, ${updatedAt})
    `;

    return NextResponse.json({ ok: true, note: body });
  } catch (error: any) {
    console.error("Error creating note:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/notes - update an existing note
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, content, folderId, updatedAt } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing note id" }, { status: 400 });
    }

    const sql = getDb();
    
    // Build update object with only provided fields
    const updates: any = { updated_at: updatedAt || Date.now() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (folderId !== undefined) updates.folder_id = folderId;
    
    // Perform update
    if (title !== undefined && content !== undefined && folderId !== undefined) {
      await sql`
        UPDATE notes
        SET title = ${title}, content = ${content}, folder_id = ${folderId}, updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    } else if (title !== undefined && content !== undefined) {
      await sql`
        UPDATE notes
        SET title = ${title}, content = ${content}, updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    } else if (title !== undefined) {
      await sql`
        UPDATE notes
        SET title = ${title}, updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    } else if (content !== undefined) {
      await sql`
        UPDATE notes
        SET content = ${content}, updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    } else if (folderId !== undefined) {
      await sql`
        UPDATE notes
        SET folder_id = ${folderId}, updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE notes
        SET updated_at = ${updates.updated_at}
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true, note: body });
  } catch (error: any) {
    console.error("Error updating note:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/notes?id=... - delete a note
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const sql = getDb();
    await sql`DELETE FROM notes WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
