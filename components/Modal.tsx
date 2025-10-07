// components/Modal.tsx
// Lightweight modal with backdrop. Centers content. ESC and backdrop close supported.

"use client";

import React, { useEffect } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
  maxWidthClassName?: string; // e.g., "max-w-lg"
};

export default function Modal({ open, onClose, ariaLabel = "Dialog", children, maxWidthClassName = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className={`relative w-full ${maxWidthClassName} mx-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          ✕
        </button>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
