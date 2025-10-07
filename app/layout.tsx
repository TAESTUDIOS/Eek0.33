// app/layout.tsx
// Root layout for the Personal Stability Assistant (PSA)
// Purpose: App shell with left sidebar navigation and main content area.

import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LayoutClient from "@/components/LayoutClient";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Personal Stability Assistant",
  description: "Rituals + chat for a single user",
};

// Ensure proper mobile scaling
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden antialiased bg-[var(--surface-0)] text-[var(--fg)]`}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
