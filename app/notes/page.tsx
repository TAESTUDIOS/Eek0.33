/**
 * app/notes/page.tsx
 * Notes page with Windows-style grid view
 * LOC: ~350
 */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useNotesStore } from "@/lib/notes-store";
import NoteEditor from "@/components/NoteEditor";
import Sidebar from "@/components/Sidebar";
import type { Note, Folder } from "@/lib/types";
import Logo from "@/images/logo/logo.png";

export default function NotesPage() {
  const {
    notes,
    folders,
    loadNotes,
    loadFolders,
    addNote,
    updateNote,
    deleteNote,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useNotesStore();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [contextMenu, setContextMenu] = useState<{ type: 'folder' | 'note'; id: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<{ type: 'folder' | 'note'; id: string; name: string } | null>(null);
  const longPressTimer = useState<NodeJS.Timeout | null>(null)[0];

  useEffect(() => {
    loadNotes();
    loadFolders();
  }, [loadNotes, loadFolders]);

  useEffect(() => {
    // Build breadcrumb trail
    const trail: Folder[] = [];
    let folderId = currentFolderId;
    while (folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        trail.unshift(folder);
        folderId = folder.parentId || null;
      } else {
        break;
      }
    }
    setBreadcrumbs(trail);
  }, [currentFolderId, folders]);

  const handleCreateNote = () => {
    addNote({
      title: "New Note",
      content: "",
      folderId: currentFolderId,
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder({
      name: newFolderName.trim(),
      parentId: currentFolderId,
    });
    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  const handleSaveNote = (title: string, content: string) => {
    if (currentNote) {
      updateNote(currentNote.id, { title, content });
    }
  };

  const handleOpenNote = (note: Note) => {
    setCurrentNote(note);
  };

  const handleCloseEditor = () => {
    setCurrentNote(null);
  };

  const handleOpenFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleGoBack = () => {
    const currentFolder = folders.find((f) => f.id === currentFolderId);
    setCurrentFolderId(currentFolder?.parentId || null);
  };

  const handleLongPressStart = (type: 'folder' | 'note', id: string, event: React.TouchEvent) => {
    const touch = event.touches[0];
    const timer = setTimeout(() => {
      setContextMenu({ type, id, x: touch.clientX, y: touch.clientY });
    }, 500);
    return timer;
  };

  const handleLongPressEnd = (timer: NodeJS.Timeout | null) => {
    if (timer) clearTimeout(timer);
  };

  const handleRenameFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id);
    if (folder) {
      setRenaming({ type: 'folder', id, name: folder.name });
      setContextMenu(null);
    }
  };

  const handleRenameNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      setRenaming({ type: 'note', id, name: note.title || 'Untitled' });
      setContextMenu(null);
    }
  };

  const handleSaveRename = () => {
    if (!renaming || !renaming.name.trim()) return;
    if (renaming.type === 'folder') {
      updateFolder(renaming.id, { name: renaming.name.trim() });
    } else {
      const note = notes.find((n) => n.id === renaming.id);
      if (note) {
        updateNote(renaming.id, { title: renaming.name.trim() });
      }
    }
    setRenaming(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [contextMenu]);

  // Get items in current folder
  const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
  const currentNotes = notes.filter((n) => n.folderId === currentFolderId);

  if (currentNote) {
    return (
      <div className="flex flex-col h-full">
        <NoteEditor note={currentNote} onSave={handleSaveNote} onClose={handleCloseEditor} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar with brand mark and controls */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border)] rounded-t-lg">
            <div className="flex items-center gap-2">
              <Image
                src={Logo}
                alt="Eeko logo"
                width={22}
                height={22}
                className="opacity-90 [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                priority
              />
              <span className="text-sm font-medium text-[var(--fg)]/85">Eeko</span>
              <span className="text-[10px] font-normal text-[var(--fg)]/35">v.25</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Back button */}
              {currentFolderId && (
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                  aria-label="Go back"
                  title="Go back"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M7.28 7.72a.75.75 0 0 1 0 1.06l-2.47 2.47H21a.75.75 0 0 1 0 1.5H4.81l2.47 2.47a.75.75 0 1 1-1.06 1.06l-3.75-3.75a.75.75 0 0 1 0-1.06l3.75-3.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              {/* New note button */}
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="New note"
                title="New note"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M5.625 3.75a2.625 2.625 0 0 0-2.625 2.625v11.25c0 1.45 1.175 2.625 2.625 2.625h12.75a2.625 2.625 0 0 0 2.625-2.625V6.375a2.625 2.625 0 0 0-2.625-2.625H5.625ZM12 9a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 12 9Z" />
                </svg>
              </button>
              {/* New folder button */}
              <button
                type="button"
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="New folder"
                title="New folder"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 0 0-3-3h-3.879a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H6a3 3 0 0 0-3 3v3.162A3.756 3.756 0 0 1 4.094 9h15.812ZM4.094 10.5a2.25 2.25 0 0 0-2.227 2.568l.857 6A2.25 2.25 0 0 0 4.951 21H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-2.227-2.568H4.094Z" />
                </svg>
              </button>
              {/* Hamburger menu */}
              <Sidebar variant="top" />
            </div>
          </div>

          {/* Breadcrumb navigation */}
          {(currentFolderId || breadcrumbs.length > 0) && (
            <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-1)]">
              <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto text-xs">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="font-medium text-[var(--fg)]/70 hover:text-[var(--fg)] whitespace-nowrap"
                >
                  Notes
                </button>
                {breadcrumbs.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[var(--fg)]/40">/</span>
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="font-medium text-[var(--fg)]/70 hover:text-[var(--fg)] whitespace-nowrap"
                    >
                      {folder.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* New folder input */}
      {showNewFolderInput && (
        <div className="px-3 sm:px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Folder name..."
              autoFocus
              className="flex-1 px-3 py-3 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 sm:flex-none px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName("");
                }}
                className="flex-1 sm:flex-none px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] text-sm font-medium hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Grid view */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentFolders.length === 0 && currentNotes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--fg)]/50">
                <div className="text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 opacity-30"
                  >
                    <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 0 0-3-3h-3.879a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H6a3 3 0 0 0-3 3v3.162A3.756 3.756 0 0 1 4.094 9h15.812ZM4.094 10.5a2.25 2.25 0 0 0-2.227 2.568l.857 6A2.25 2.25 0 0 0 4.951 21H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-2.227-2.568H4.094Z" />
                  </svg>
                  <p className="text-sm">This folder is empty</p>
                  <p className="text-xs mt-1 text-[var(--fg)]/40">Create a note or folder to get started</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {/* Folders */}
                {currentFolders.map((folder) => {
                  let timer: NodeJS.Timeout | null = null;
                  return (
                    <div
                      key={folder.id}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleOpenFolder(folder.id)}
                        onDoubleClick={() => handleOpenFolder(folder.id)}
                        onTouchStart={(e) => { timer = handleLongPressStart('folder', folder.id, e); }}
                        onTouchEnd={() => handleLongPressEnd(timer)}
                        onTouchCancel={() => handleLongPressEnd(timer)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ type: 'folder', id: folder.id, x: e.clientX, y: e.clientY });
                        }}
                        className="w-full flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-600"
                        >
                          <path d="M19.906 9c.382 0 .749.057 1.094.162V9a3 3 0 0 0-3-3h-3.879a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H6a3 3 0 0 0-3 3v3.162A3.756 3.756 0 0 1 4.094 9h15.812ZM4.094 10.5a2.25 2.25 0 0 0-2.227 2.568l.857 6A2.25 2.25 0 0 0 4.951 21H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-2.227-2.568H4.094Z" />
                        </svg>
                        <span className="text-xs sm:text-sm text-center text-[var(--fg)]/90 line-clamp-2 w-full px-1">
                          {folder.name}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({ type: 'folder', id: folder.id, x: e.clientX, y: e.clientY });
                        }}
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-[var(--surface-1)]/90 hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                        aria-label="Options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}

                {/* Notes */}
                {currentNotes.map((note) => {
                  let timer: NodeJS.Timeout | null = null;
                  return (
                    <div
                      key={note.id}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleOpenNote(note)}
                        onDoubleClick={() => handleOpenNote(note)}
                        onTouchStart={(e) => { timer = handleLongPressStart('note', note.id, e); }}
                        onTouchEnd={() => handleLongPressEnd(timer)}
                        onTouchCancel={() => handleLongPressEnd(timer)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ type: 'note', id: note.id, x: e.clientX, y: e.clientY });
                        }}
                        className="w-full flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500"
                        >
                          <path d="M5.625 3.75a2.625 2.625 0 0 0-2.625 2.625v11.25c0 1.45 1.175 2.625 2.625 2.625h12.75a2.625 2.625 0 0 0 2.625-2.625V6.375a2.625 2.625 0 0 0-2.625-2.625H5.625ZM7.5 8.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 8.25Zm.75 3.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" />
                        </svg>
                        <span className="text-xs sm:text-sm text-center text-[var(--fg)]/90 line-clamp-2 w-full px-1">
                          {note.title || "Untitled"}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({ type: 'note', id: note.id, x: e.clientX, y: e.clientY });
                        }}
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-[var(--surface-1)]/90 hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                        aria-label="Options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-elevated py-1 z-50 min-w-[160px]"
              style={{
                left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
                top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (contextMenu.type === 'folder') {
                    handleRenameFolder(contextMenu.id);
                  } else {
                    handleRenameNote(contextMenu.id);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-2)] flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.35 8.35a.75.75 0 0 0-.197.303l-1.5 4.5a.75.75 0 0 0 .948.948l4.5-1.5a.75.75 0 0 0 .303-.197l8.008-8.008Z" />
                </svg>
                Rename
              </button>
              <button
                onClick={() => {
                  const item = contextMenu.type === 'folder' 
                    ? folders.find((f) => f.id === contextMenu.id)
                    : notes.find((n) => n.id === contextMenu.id);
                  const name = contextMenu.type === 'folder' 
                    ? (item as Folder)?.name 
                    : (item as Note)?.title || 'Untitled';
                  
                  if (window.confirm(`Delete ${contextMenu.type} "${name}"${contextMenu.type === 'folder' ? ' and all its contents' : ''}?`)) {
                    if (contextMenu.type === 'folder') {
                      deleteFolder(contextMenu.id);
                    } else {
                      deleteNote(contextMenu.id);
                    }
                  }
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 text-red-500 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5H18.6l-1.02 12.24A2.75 2.75 0 0 1 14.84 21H9.16a2.75 2.75 0 0 1-2.74-2.26L5.4 6.5H4.75a.75.75 0 0 1 0-1.5H9V3.75Z" />
                </svg>
                Delete
              </button>
            </div>
          )}

          {/* Rename Modal */}
          {renaming && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setRenaming(null)} />
              <div className="relative w-full sm:w-[400px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--fg)]">
                    Rename {renaming.type === 'folder' ? 'Folder' : 'Note'}
                  </h3>
                  <button 
                    type="button" 
                    className="text-[var(--fg)]/70 text-sm hover:text-[var(--fg)]" 
                    onClick={() => setRenaming(null)} 
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  <input
                    type="text"
                    value={renaming.name}
                    onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    placeholder={renaming.type === 'folder' ? 'Folder name...' : 'Note title...'}
                    autoFocus
                    className="w-full px-3 py-3 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveRename}
                      disabled={!renaming.name.trim()}
                      className="flex-1 px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="flex-1 px-4 py-3 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] text-sm font-medium hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] touch-manipulation min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
