/**
 * lib/notes-store.ts
 * Zustand store for notes and folders with Neon database persistence
 * LOC: ~220
 */

import { create } from "zustand";
import { uid } from "@/lib/id";
import type { Note, Folder } from "@/lib/types";

// API helper functions
async function fetchNotes(): Promise<Note[]> {
  try {
    const res = await fetch("/api/notes", { cache: "no-store" });
    const data = await res.json();
    return data.notes || [];
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
}

async function fetchFolders(): Promise<Folder[]> {
  try {
    const res = await fetch("/api/folders", { cache: "no-store" });
    const data = await res.json();
    return data.folders || [];
  } catch (error) {
    console.error("Error fetching folders:", error);
    return [];
  }
}

async function createNote(note: Note): Promise<boolean> {
  try {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    return res.ok;
  } catch (error) {
    console.error("Error creating note:", error);
    return false;
  }
}

async function updateNoteAPI(id: string, patch: Partial<Note>): Promise<boolean> {
  try {
    const res = await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating note:", error);
    return false;
  }
}

async function deleteNoteAPI(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    return res.ok;
  } catch (error) {
    console.error("Error deleting note:", error);
    return false;
  }
}

async function createFolder(folder: Folder): Promise<boolean> {
  try {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(folder),
    });
    return res.ok;
  } catch (error) {
    console.error("Error creating folder:", error);
    return false;
  }
}

async function updateFolderAPI(id: string, patch: Partial<Folder>): Promise<boolean> {
  try {
    const res = await fetch("/api/folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating folder:", error);
    return false;
  }
}

async function deleteFolderAPI(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/folders?id=${id}`, { method: "DELETE" });
    return res.ok;
  } catch (error) {
    console.error("Error deleting folder:", error);
    return false;
  }
}

export type NotesState = {
  notes: Note[];
  folders: Folder[];
  loadNotes: () => void;
  loadFolders: () => void;
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) => void;
  deleteNote: (id: string) => void;
  addFolder: (folder: Omit<Folder, "id" | "createdAt" | "updatedAt">) => void;
  updateFolder: (id: string, patch: Partial<Omit<Folder, "id" | "createdAt">>) => void;
  deleteFolder: (id: string) => void;
  moveNote: (noteId: string, targetFolderId: string | null) => void;
  moveFolder: (folderId: string, targetParentId: string | null) => void;
};

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  folders: [],

  loadNotes: async () => {
    const items = await fetchNotes();
    set({ notes: items });
  },

  loadFolders: async () => {
    const items = await fetchFolders();
    set({ folders: items });
  },

  addNote: async (note) => {
    const newNote: Note = {
      ...note,
      id: uid("note"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Optimistic update
    const next = [newNote, ...get().notes];
    set({ notes: next });
    // Persist to database
    await createNote(newNote);
  },

  updateNote: async (id, patch) => {
    const updatedAt = Date.now();
    // Optimistic update
    const next = get().notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt } : n
    );
    set({ notes: next });
    // Persist to database
    await updateNoteAPI(id, { ...patch, updatedAt });
  },

  deleteNote: async (id) => {
    // Optimistic update
    const next = get().notes.filter((n) => n.id !== id);
    set({ notes: next });
    // Persist to database
    await deleteNoteAPI(id);
  },

  addFolder: async (folder) => {
    const newFolder: Folder = {
      ...folder,
      id: uid("folder"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Optimistic update
    const next = [newFolder, ...get().folders];
    set({ folders: next });
    // Persist to database
    await createFolder(newFolder);
  },

  updateFolder: async (id, patch) => {
    const updatedAt = Date.now();
    // Optimistic update
    const next = get().folders.map((f) =>
      f.id === id ? { ...f, ...patch, updatedAt } : f
    );
    set({ folders: next });
    // Persist to database
    await updateFolderAPI(id, { ...patch, updatedAt });
  },

  deleteFolder: async (id) => {
    // Delete folder and all its subfolders recursively (client-side for optimistic update)
    const getAllDescendantIds = (parentId: string): string[] => {
      const children = get().folders.filter((f) => f.parentId === parentId);
      const childIds = children.map((c) => c.id);
      const grandchildIds = childIds.flatMap((cid) => getAllDescendantIds(cid));
      return [parentId, ...childIds, ...grandchildIds];
    };

    const idsToDelete = getAllDescendantIds(id);
    // Optimistic update
    const nextFolders = get().folders.filter((f) => !idsToDelete.includes(f.id));
    const nextNotes = get().notes.filter((n) => !n.folderId || !idsToDelete.includes(n.folderId));
    set({ folders: nextFolders, notes: nextNotes });
    
    // Persist to database (cascade will handle children)
    await deleteFolderAPI(id);
  },

  moveNote: async (noteId, targetFolderId) => {
    const updatedAt = Date.now();
    // Optimistic update
    const next = get().notes.map((n) =>
      n.id === noteId ? { ...n, folderId: targetFolderId, updatedAt } : n
    );
    set({ notes: next });
    // Persist to database
    await updateNoteAPI(noteId, { folderId: targetFolderId, updatedAt });
  },

  moveFolder: async (folderId, targetParentId) => {
    // Prevent circular references
    const isDescendant = (checkId: string, ancestorId: string): boolean => {
      const folder = get().folders.find((f) => f.id === checkId);
      if (!folder || !folder.parentId) return false;
      if (folder.parentId === ancestorId) return true;
      return isDescendant(folder.parentId, ancestorId);
    };

    if (targetParentId && isDescendant(targetParentId, folderId)) {
      return; // Prevent circular reference
    }

    const updatedAt = Date.now();
    // Optimistic update
    const next = get().folders.map((f) =>
      f.id === folderId ? { ...f, parentId: targetParentId, updatedAt } : f
    );
    set({ folders: next });
    // Persist to database
    await updateFolderAPI(folderId, { parentId: targetParentId, updatedAt });
  },
}));
