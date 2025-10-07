// lib/api.ts
// Helper to construct API URLs that respect basePath in Next.js.
// If NEXT_PUBLIC_BASE_PATH is defined (e.g., "/project-planner"),
// API endpoints become `${BASE}/api/...`. Otherwise, they are `/api/...`.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const API_BASE = `${BASE_PATH}/api`;

export function api(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}
