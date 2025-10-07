"use client";

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

/**
 * MobileHamburger
 * Purpose: Render a single global hamburger button on mobile for all pages
 * except the Chat page (which renders its own header hamburger).
 */
export default function MobileHamburger() {
  const pathname = usePathname();
  const isChat = pathname?.startsWith("/chat");
  if (isChat) return null;

  return (
    <div className="md:hidden fixed top-3 right-3 z-0 bg-transparent">
      <Sidebar variant="top" />
    </div>
  );
}
