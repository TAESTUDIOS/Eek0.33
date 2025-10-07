// components/ThemeClient.tsx
// Applies the Tailwind dark class to <html> based on Zustand theme and persists it.

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export default function ThemeClient() {
  const { theme, setTheme, loadSettings, compactMode, setCompactMode, density, setDensity } = useAppStore();

  // On mount, set initial theme from localStorage to avoid FOUC,
  // then load server settings (Neon) to override if available.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("psa_theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
      const compactStored = localStorage.getItem("psa_compact");
      if (compactStored === "1" || compactStored === "true") setCompactMode(true);
      const densStored = localStorage.getItem("psa_density");
      if (densStored === "comfortable" || densStored === "compact" || densStored === "ultra") setDensity(densStored as any);
    } catch {}
    // Also fetch saved settings from the server
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("psa_theme", theme);
    } catch {}
  }, [theme]);

  // Apply density classes (comfortable is default/no class)
  useEffect(() => {
    const root = document.documentElement;
    // Remove all density-related classes first
    root.classList.remove("compact", "density-comfortable", "density-compact", "density-ultra");
    // Back-compat: compactMode true implies at least compact density if density not ultra
    const effective = density || (compactMode ? "compact" : "comfortable");
    if (effective === "compact") {
      root.classList.add("compact", "density-compact");
    } else if (effective === "ultra") {
      root.classList.add("compact", "density-ultra");
    } else {
      root.classList.add("density-comfortable");
    }
    try {
      localStorage.setItem("psa_compact", compactMode ? "1" : "0");
      localStorage.setItem("psa_density", effective);
    } catch {}
  }, [compactMode, density]);

  return null; // no UI
}
