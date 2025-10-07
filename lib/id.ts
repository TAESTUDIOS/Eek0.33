/** lib/id.ts - tiny id helpers */
export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
