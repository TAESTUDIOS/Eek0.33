// components/LogsMenu.tsx
// Dropdown for quick access to log-related pages

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = { label?: string; up?: boolean; variant?: "button" | "menuitem"; align?: "left" | "right" };

export default function LogsMenu({ label = "Logs", up = false, variant = "button", align = "right" }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onCloseMenus() { setOpen(false); }
    if (typeof window !== 'undefined') {
      window.addEventListener('psa:close-menus', onCloseMenus as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('psa:close-menus', onCloseMenus as any);
      }
    };
  }, []);

  function closeAllMenus() {
    setOpen(false);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('psa:close-menus'));
      }
    } catch {}
  }

  const items = [
    { href: "/emotions", label: "Emotions" },
    { href: "/saved", label: "Saved" },
    { href: "/winddown", label: "Winddown" },
    { href: "/winddown-thoughts", label: "Winddown Thoughts" },
    { href: "/sleep", label: "Sleep" },
    { href: "/missions", label: "Missions" },
    { href: "/snapshot", label: "Snapshot" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className={
          variant === "menuitem"
            ? "w-full px-3 py-2 rounded-md transition-colors hover:bg-[var(--surface-2)] flex items-center justify-between text-orange-400"
            : "inline-flex h-9 items-center gap-2 rounded-md px-3 py-0 border border-[var(--border)] bg-[var(--surface-1)] text-sm leading-none text-[var(--fg)]/90 hover:bg-[var(--surface-2)] shadow-subtle"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={variant === "menuitem" ? "h-4 w-4 shrink-0 align-middle text-orange-400" : "h-4 w-4 shrink-0 align-middle"}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 0 1 1.08 1.04l-4.25 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Logs menu"
          className={
            `absolute ${align === "left" ? "left-0" : "right-0"} w-56 rounded-md border border-[var(--border)] bg-[var(--surface-1)] shadow-elevated p-1 z-20 ` +
            (up ? "bottom-full mb-2" : "mt-2")
          }
        >
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
              role="menuitem"
              onClick={closeAllMenus}
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
