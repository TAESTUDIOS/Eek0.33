/**
 * components/FolderTree.tsx
 * Hierarchical folder tree with expand/collapse, drag-and-drop support
 * LOC: ~280
 */

"use client";

import { useState } from "react";
import type { Folder, Note } from "@/lib/types";

type Props = {
  folders: Folder[];
  notes: Note[];
  selectedId: string | null;
  selectedType: "folder" | "note" | null;
  onSelectFolder: (id: string | null) => void;
  onSelectNote: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
};

export default function FolderTree({
  folders,
  notes,
  selectedId,
  selectedType,
  onSelectFolder,
  onSelectNote,
  onDeleteFolder,
  onDeleteNote,
  onRenameFolder,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameFolder(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const renderFolder = (folder: Folder, level: number) => {
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedType === "folder" && selectedId === folder.id;
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id);
    const hasChildren = childFolders.length > 0 || childNotes.length > 0;
    const isRenaming = renamingId === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center gap-2 px-2 py-2.5 sm:py-1.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation ${
            isSelected ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px`, minHeight: '44px' }}
        >
          {/* Expand/collapse icon */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="shrink-0 w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center text-[var(--fg)]/60 hover:text-[var(--fg)] active:text-[var(--fg)] rounded touch-manipulation"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`w-4 h-4 sm:w-3 sm:h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              >
                <path d="M9 6.75a.75.75 0 0 1 1.28-.53l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.28-.53V6.75Z" />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-6 sm:w-5 shrink-0" />}

          {/* Folder icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-yellow-600"
          >
            <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v14.5c0 .966.784 1.75 1.75 1.75h16.5A1.75 1.75 0 0 0 22 19.25V8.25A1.75 1.75 0 0 0 20.25 6.5h-8.19l-1.78-1.78A1.75 1.75 0 0 0 9.06 4.5H3.75Z" />
          </svg>

          {/* Folder name or rename input */}
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={finishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishRename();
                if (e.key === "Escape") {
                  setRenamingId(null);
                  setRenameValue("");
                }
              }}
              autoFocus
              className="flex-1 px-2 py-2 sm:py-1 text-sm bg-[var(--surface-1)] border border-[var(--border)] rounded text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px] touch-manipulation"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-sm sm:text-sm text-[var(--fg)]/90 truncate py-1"
              onClick={() => onSelectFolder(folder.id)}
            >
              {folder.name}
            </span>
          )}

          {/* Actions */}
          {!isRenaming && (
            <div className="flex items-center gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(folder.id, folder.name);
                }}
                className="p-2 sm:p-1 rounded hover:bg-[var(--surface-1)] active:bg-[var(--surface-1)] text-[var(--fg)]/60 hover:text-[var(--fg)] touch-manipulation"
                aria-label="Rename folder"
                title="Rename"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-3.5 sm:h-3.5">
                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.35 8.35a.75.75 0 0 0-.197.303l-1.5 4.5a.75.75 0 0 0 .948.948l4.5-1.5a.75.75 0 0 0 .303-.197l8.008-8.008Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                    onDeleteFolder(folder.id);
                  }
                }}
                className="p-2 sm:p-1 rounded hover:bg-red-500/10 active:bg-red-500/10 text-red-500/70 hover:text-red-500 touch-manipulation"
                aria-label="Delete folder"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-3.5 sm:h-3.5">
                  <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5H18.6l-1.02 12.24A2.75 2.75 0 0 1 14.84 21H9.16a2.75 2.75 0 0 1-2.74-2.26L5.4 6.5H4.75a.75.75 0 0 1 0-1.5H9V3.75Z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Render children if expanded */}
        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolder(child, level + 1))}
            {childNotes.map((note) => renderNote(note, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNote = (note: Note, level: number) => {
    const isSelected = selectedType === "note" && selectedId === note.id;

    return (
      <div
        key={note.id}
        className={`flex items-center gap-2 px-2 py-2.5 sm:py-1.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation ${
          isSelected ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px`, minHeight: '44px' }}
        onClick={() => onSelectNote(note.id)}
      >
        <div className="w-6 sm:w-5 shrink-0" />
        {/* Note icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-blue-500"
        >
          <path d="M5.625 3.75a2.625 2.625 0 0 0-2.625 2.625v11.25c0 1.45 1.175 2.625 2.625 2.625h12.75a2.625 2.625 0 0 0 2.625-2.625V6.375a2.625 2.625 0 0 0-2.625-2.625H5.625ZM7.5 8.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 8.25Zm.75 3.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" />
        </svg>

        <span className="flex-1 text-sm text-[var(--fg)]/85 truncate py-1">{note.title || "Untitled"}</span>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete note "${note.title || "Untitled"}"?`)) {
              onDeleteNote(note.id);
            }
          }}
          className="p-2 sm:p-1 rounded hover:bg-red-500/10 active:bg-red-500/10 text-red-500/70 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
          aria-label="Delete note"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-3.5 sm:h-3.5">
            <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5H18.6l-1.02 12.24A2.75 2.75 0 0 1 14.84 21H9.16a2.75 2.75 0 0 1-2.74-2.26L5.4 6.5H4.75a.75.75 0 0 1 0-1.5H9V3.75Z" />
          </svg>
        </button>
      </div>
    );
  };

  // Root level folders and notes
  const rootFolders = folders.filter((f) => !f.parentId);
  const rootNotes = notes.filter((n) => !n.folderId);

  return (
    <div className="flex flex-col gap-0.5 group">
      {/* Root level */}
      <div
        className={`flex items-center gap-2 px-2 py-2.5 sm:py-1.5 rounded-md cursor-pointer hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation ${
          selectedType === "folder" && selectedId === null ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : ""
        }`}
        style={{ minHeight: '44px' }}
        onClick={() => onSelectFolder(null)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-[var(--fg)]/60"
        >
          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
        </svg>
        <span className="flex-1 text-sm font-medium text-[var(--fg)]/90 py-1">All Notes</span>
      </div>

      {rootFolders.map((folder) => renderFolder(folder, 0))}
      {rootNotes.map((note) => renderNote(note, 0))}
    </div>
  );
}
