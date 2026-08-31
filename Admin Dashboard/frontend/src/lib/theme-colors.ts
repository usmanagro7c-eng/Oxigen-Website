export type ThemeColor = {
  id: string;
  name: string;
  accent: string;      // primary/accent hex
  accentSoft: string;  // lighter variant for hovers/backgrounds
  ink: string;         // text color used on accent surfaces
  surface: string;     // canvas base for previews (dark tone)
  tint: string;        // tailwind gradient classes for hero surfaces
};

export const THEME_COLORS: ThemeColor[] = [
  { id: "blue",    name: "Ocean Blue",  accent: "#3b82f6", accentSoft: "#60a5fa", ink: "#0b1220", surface: "#0b1220", tint: "from-blue-500 via-slate-800 to-slate-950" },
  { id: "purple",  name: "Royal Purple",accent: "#a855f7", accentSoft: "#c084fc", ink: "#140820", surface: "#140820", tint: "from-violet-600 via-purple-900 to-slate-950" },
  { id: "green",   name: "Forest",      accent: "#22c55e", accentSoft: "#4ade80", ink: "#04140b", surface: "#04140b", tint: "from-emerald-500 via-emerald-900 to-slate-950" },
  { id: "orange",  name: "Sunset",      accent: "#f97316", accentSoft: "#fb923c", ink: "#1a0a02", surface: "#1a0a02", tint: "from-orange-500 via-rose-800 to-slate-950" },
  { id: "red",     name: "Crimson",     accent: "#ef4444", accentSoft: "#f87171", ink: "#160404", surface: "#160404", tint: "from-red-500 via-rose-900 to-slate-950" },
  { id: "rose",    name: "Rose",        accent: "#f43f5e", accentSoft: "#fb7185", ink: "#1a0510", surface: "#1a0510", tint: "from-rose-500 via-pink-800 to-slate-950" },
  { id: "gold",    name: "Luxury Gold", accent: "#eab308", accentSoft: "#facc15", ink: "#120a02", surface: "#120a02", tint: "from-yellow-500 via-stone-900 to-black" },
  { id: "emerald", name: "Emerald",     accent: "#10b981", accentSoft: "#34d399", ink: "#04160f", surface: "#04160f", tint: "from-teal-500 via-emerald-900 to-slate-950" },
  { id: "ocean",   name: "Ocean",       accent: "#06b6d4", accentSoft: "#22d3ee", ink: "#031218", surface: "#031218", tint: "from-cyan-500 via-sky-900 to-slate-950" },
  { id: "black",   name: "Onyx",        accent: "#111827", accentSoft: "#374151", ink: "#f8fafc", surface: "#0a0a0a", tint: "from-neutral-700 via-neutral-900 to-black" },
  { id: "light",   name: "Ivory",       accent: "#e5e7eb", accentSoft: "#f3f4f6", ink: "#0a0a0a", surface: "#f8fafc", tint: "from-neutral-100 via-neutral-300 to-neutral-500" },
  { id: "dark",    name: "Midnight",    accent: "#818cf8", accentSoft: "#a5b4fc", ink: "#0a0f1f", surface: "#050814", tint: "from-indigo-500 via-slate-900 to-black" },
];

export function getThemeColor(id?: string | null): ThemeColor {
  if (!id) return THEME_COLORS[0];
  return THEME_COLORS.find(c => c.id === id) ?? THEME_COLORS[0];
}
