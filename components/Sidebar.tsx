// components/Sidebar.tsx
// Sidebar / TopNav with links to Chat, Schedule, Saved, Settings.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import DemoMenu from "@/components/DemoMenu";
import RitualsMenu from "@/components/RitualsMenu";
import LogsMenu from "@/components/LogsMenu";

type Props = {
  variant?: "side" | "top";
};

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/schedule", label: "Schedule" },
  { href: "/urgent", label: "Urgent" },
  { href: "/notes", label: "Notes" },
  { href: "/emotions", label: "Emotions" },
  { href: "/saved", label: "Saved" },
  { href: "/winddown", label: "Winddown" },
  { href: "/winddown-thoughts", label: "Winddown Thoughts" },
  { href: "/sleep", label: "Sleep" },
  { href: "/missions", label: "Missions" },
  { href: "/snapshot", label: "Snapshot" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar({ variant = "side" }: Props) {
  const pathname = usePathname();
  const isTop = variant === "top";

  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onClose() { setOpen(false); }
    if (typeof window !== 'undefined') {
      window.addEventListener('psa:close-menus', onClose as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('psa:close-menus', onClose as any);
      }
    };
  }, []);

  return (
    <nav
      className={clsx(
        "text-sm",
        isTop ? "relative" : "flex flex-col h-full py-3"
      )}
      aria-label="Primary navigation"
    >
      {isTop ? (
        <div className="flex items-center justify-end w-full">
          {/* Hamburger button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] shadow-subtle hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="topnav-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M3.75 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">Open navigation menu</span>
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              id="topnav-menu"
              role="menu"
              aria-label="Navigation menu"
              className="absolute right-0 top-12 z-40 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-elevated origin-top-right"
            >
              <div className="flex flex-col" role="none">
                {/* Primary links before grouped menus */}
                {[
                  "/chat",
                  "/schedule",
                  "/urgent",
                  "/notes",
                ].map((href) => {
                  const l = links.find((x) => x.href === href);
                  if (!l) return null;
                  const active = pathname?.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={clsx(
                        "w-full px-3 py-2 rounded-md text-left transition-colors",
                        active ? "bg-gray-700 text-white" : "text-[var(--fg)]/85 hover:bg-[var(--surface-2)]"
                      )}
                      aria-current={active ? "page" : undefined}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  );
                })}

                {/* Grouped menus inserted here */}
                <div role="none" className="px-0">
                  <DemoMenu label="Action" variant="menuitem" />
                </div>
                <div role="none" className="px-0">
                  <RitualsMenu variant="menuitem" />
                </div>
                <div role="none" className="px-0">
                  <LogsMenu variant="menuitem" />
                </div>

                {/* Remaining links after grouped menus */}
                {[
                  "/settings",
                ].map((href) => {
                  const l = links.find((x) => x.href === href);
                  if (!l) return null;
                  const active = pathname?.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={clsx(
                        "w-full px-3 py-2 rounded-md text-left transition-colors",
                        active ? "bg-gray-700 text-white" : "text-[var(--fg)]/85 hover:bg-[var(--surface-2)]"
                      )}
                      aria-current={active ? "page" : undefined}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Desktop/side navigation mirrors the hamburger dropdown structure
        <div className="flex flex-col gap-1">
          {/* Primary links before grouped menus */}
          {[
            "/chat",
            "/schedule",
            "/urgent",
            "/notes",
          ].map((href) => {
            const l = links.find((x) => x.href === href);
            if (!l) return null;
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "px-3 py-2 rounded-md transition-colors min-w-[72px] text-left",
                  active
                    ? "bg-gray-700 text-white"
                    : "text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
                )}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}

          {/* Grouped menus inserted here (same as hamburger dropdown) */}
          <div role="none" className="px-0">
            <DemoMenu label="Action" variant="menuitem" align="left" />
          </div>
          <div role="none" className="px-0">
            <RitualsMenu variant="menuitem" align="left" />
          </div>
          <div role="none" className="px-0">
            <LogsMenu variant="menuitem" align="left" />
          </div>

          {/* Remaining links after grouped menus */}
          {links
            .filter((l) => {
              const primary = ["/chat", "/schedule", "/urgent", "/notes"];
              const logsItems = [
                "/emotions",
                "/saved",
                "/winddown",
                "/winddown-thoughts",
                "/sleep",
                "/missions",
                "/snapshot",
              ];
              return !primary.includes(l.href) && !logsItems.includes(l.href);
            })
            .map((l) => {
              const active = pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={clsx(
                    "px-3 py-2 rounded-md transition-colors min-w-[72px] text-left",
                    active
                      ? "bg-gray-700 text-white"
                      : "text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
        </div>
      )}
    </nav>
  );
}

