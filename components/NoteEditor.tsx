/**
 * components/NoteEditor.tsx
 * Note editor with title and content textarea
 * LOC: ~120
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import type { Note } from "@/lib/types";
import Logo from "@/images/logo/logo.png";

type Props = {
  note: Note | null;
  onSave: (title: string, content: string) => void;
  onClose: () => void;
};

export default function NoteEditor({ note, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setHasChanges(false);
    } else {
      setTitle("");
      setContent("");
      setHasChanges(false);
    }
  }, [note]);

  const handleSave = () => {
    if (title.trim() || content.trim()) {
      onSave(title.trim() || "Untitled", content);
      setHasChanges(false);
    }
  };

  const handleClose = () => {
    if (hasChanges && (title.trim() || content.trim())) {
      const shouldClose = window.confirm("You have unsaved changes. Discard them?");
      if (shouldClose) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const insertAtCursor = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // If text is selected, wrap it
    if (selectedText) {
      const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
      setContent(newText);
      setHasChanges(true);
      
      // Select the wrapped text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      }, 0);
    } else {
      // No selection, insert markers and place cursor between them
      const newText = content.substring(0, start) + before + after + content.substring(end);
      setContent(newText);
      setHasChanges(true);
      
      // Place cursor between the markers
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length);
      }, 0);
    }
  };

  const insertList = (type: 'bullet' | 'number' | 'checkbox') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Get the current line
    const beforeCursor = content.substring(0, start);
    const lines = beforeCursor.split('\n');
    const currentLineStart = beforeCursor.length - lines[lines.length - 1].length;
    
    // Determine list prefix
    let prefix = '';
    if (type === 'bullet') prefix = '• ';
    else if (type === 'number') prefix = '1. ';
    else if (type === 'checkbox') prefix = '☐ ';
    
    // If at start of line or line is empty, just add prefix
    if (start === currentLineStart || lines[lines.length - 1].trim() === '') {
      const newText = content.substring(0, start) + prefix + content.substring(end);
      setContent(newText);
      setHasChanges(true);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      // Add new line with list item
      const newText = content.substring(0, end) + '\n' + prefix + content.substring(end);
      setContent(newText);
      setHasChanges(true);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(end + 1 + prefix.length, end + 1 + prefix.length);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Handle Enter key for list continuation
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const beforeCursor = content.substring(0, start);
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check for bullet list
      const bulletMatch = currentLine.match(/^(\s*)(•\s+)(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const [, indent, bullet, text] = bulletMatch;
        
        // If line has content, continue the list
        if (text.trim()) {
          const newText = content.substring(0, start) + '\n' + indent + bullet + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(start + 1 + indent.length + bullet.length, start + 1 + indent.length + bullet.length);
          }, 0);
        } else {
          // Empty list item - remove it and exit list
          const lineStart = beforeCursor.length - currentLine.length;
          const newText = content.substring(0, lineStart) + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        }
        return;
      }

      // Check for numbered list
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        e.preventDefault();
        const [, indent, num, text] = numberMatch;
        
        if (text.trim()) {
          const nextNum = parseInt(num) + 1;
          const newText = content.substring(0, start) + '\n' + indent + nextNum + '. ' + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(start + 1 + indent.length + (nextNum + '. ').length, start + 1 + indent.length + (nextNum + '. ').length);
          }, 0);
        } else {
          const lineStart = beforeCursor.length - currentLine.length;
          const newText = content.substring(0, lineStart) + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        }
        return;
      }

      // Check for checkbox list
      const checkboxMatch = currentLine.match(/^(\s*)([☐☑]\s+)(.*)$/);
      if (checkboxMatch) {
        e.preventDefault();
        const [, indent, checkbox, text] = checkboxMatch;
        
        if (text.trim()) {
          const newText = content.substring(0, start) + '\n' + indent + '☐ ' + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(start + 1 + indent.length + 2, start + 1 + indent.length + 2);
          }, 0);
        } else {
          const lineStart = beforeCursor.length - currentLine.length;
          const newText = content.substring(0, lineStart) + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
        }
        return;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const beforeCursor = content.substring(0, start);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        if (currentLine.startsWith('  ')) {
          const lineStart = beforeCursor.length - currentLine.length;
          const newText = content.substring(0, lineStart) + currentLine.substring(2) + content.substring(start);
          setContent(newText);
          setHasChanges(true);
          setTimeout(() => {
            textarea.setSelectionRange(start - 2, start - 2);
          }, 0);
        }
      } else {
        // Tab: Indent
        const newText = content.substring(0, start) + '  ' + content.substring(end);
        setContent(newText);
        setHasChanges(true);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  const toggleCheckbox = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = content.substring(0, start);
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    const lineStart = beforeCursor.length - currentLine.length;

    // Toggle checkbox on current line
    if (currentLine.includes('☐')) {
      const newLine = currentLine.replace('☐', '☑');
      const newText = content.substring(0, lineStart) + newLine + content.substring(lineStart + currentLine.length);
      setContent(newText);
      setHasChanges(true);
    } else if (currentLine.includes('☑')) {
      const newLine = currentLine.replace('☑', '☐');
      const newText = content.substring(0, lineStart) + newLine + content.substring(lineStart + currentLine.length);
      setContent(newText);
      setHasChanges(true);
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--fg)]/50 p-4">
        <div className="text-center max-w-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-30"
          >
            <path d="M5.625 3.75a2.625 2.625 0 0 0-2.625 2.625v11.25c0 1.45 1.175 2.625 2.625 2.625h12.75a2.625 2.625 0 0 0 2.625-2.625V6.375a2.625 2.625 0 0 0-2.625-2.625H5.625ZM7.5 8.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 8.25Zm.75 3.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" />
          </svg>
          <p className="text-sm sm:text-base">Select a note to edit or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar with brand mark and controls */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border)] rounded-t-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Image
                src={Logo}
                alt="Eeko logo"
                width={22}
                height={22}
                className="opacity-90 [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                priority
              />
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Note title..."
                className="flex-1 text-sm font-medium bg-transparent border-none text-[var(--fg)]/85 placeholder:text-[var(--fg)]/40 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Save note"
                title="Save note"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Close editor"
                title="Close editor"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Hamburger menu */}
              <Sidebar variant="top" />
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center gap-1 overflow-x-auto">
            {/* Font Size Selector */}
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
              className="px-2 py-1 text-xs rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Font size"
            >
              <option value="sm">Small</option>
              <option value="base">Medium</option>
              <option value="lg">Large</option>
            </select>
            <div className="w-px h-6 bg-[var(--border)] mx-1" />
            <button
              type="button"
              onClick={() => insertList('bullet')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] touch-manipulation"
              aria-label="Bullet list"
              title="Bullet list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75ZM2.625 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 12Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertList('number')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] touch-manipulation"
              aria-label="Numbered list"
              title="Numbered list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75ZM2.625 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 12Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertList('checkbox')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] touch-manipulation"
              aria-label="Checkbox list"
              title="Checkbox list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm18 3H3.75v9a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V9Zm-15-3.75A.75.75 0 0 0 4.5 6v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H5.25Zm1.5.75a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="w-px h-6 bg-[var(--border)] mx-1" />
            <button
              type="button"
              onClick={() => insertAtCursor('**', '**')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] font-bold touch-manipulation"
              aria-label="Bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor('*', '*')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] italic touch-manipulation"
              aria-label="Italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertAtCursor('`', '`')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] font-mono text-xs touch-manipulation"
              aria-label="Code"
              title="Code"
            >
              {'<>'}
            </button>
            <div className="w-px h-6 bg-[var(--border)] mx-1" />
            <button
              type="button"
              onClick={toggleCheckbox}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--surface-2)] text-[var(--fg)]/70 hover:text-[var(--fg)] touch-manipulation"
              aria-label="Toggle checkbox"
              title="Toggle checkbox (☐/☑)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Content editor */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setHasChanges(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Start writing..."
              className={`w-full h-full min-h-[300px] sm:min-h-[400px] bg-transparent border-none text-[var(--fg)] placeholder:text-[var(--fg)]/40 focus:outline-none resize-none leading-relaxed touch-manipulation ${
                fontSize === 'sm' ? 'text-xs sm:text-sm' : 
                fontSize === 'lg' ? 'text-base sm:text-lg' : 
                'text-sm sm:text-base'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          </div>

          {/* Footer info */}
          <div className="px-3 sm:px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--fg)]/50">
            {hasChanges && <span className="text-yellow-600 font-medium">• Unsaved changes</span>}
            {!hasChanges && note.updatedAt && (
              <span className="hidden sm:inline">Last updated: {new Date(note.updatedAt).toLocaleString()}</span>
            )}
            {!hasChanges && note.updatedAt && (
              <span className="sm:hidden">Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
