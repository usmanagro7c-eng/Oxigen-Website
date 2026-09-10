import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getTemplate } from "@/lib/templates-data";
import { getThemeColor } from "@/lib/theme-colors";
import { buildDefaultsForTemplate, type SectionType } from "@/lib/template-kits";

export type NavItem = {
  id: string;
  label: string;
  pageId: string | null; // links to page.id, or null for external URL
  url?: string;
  visible: boolean;
};

export type Section = {
  id: string;
  type: SectionType;
  visible: boolean;
  props?: Record<string, any>;
};

export type Page = {
  id: string;
  slug: string;
  label: string;
  visible: boolean; // controls appearance in nav for auto-linked pages
  sections: Section[];
};

export type SiteState = {
  installed: boolean;
  templateId: string | null;
  themeColorId: string;
  accent: string;
  fontDisplay: string;
  fontBody: string;
  radius: number; // px
  density: number;
  mode: "dark" | "light";

  nav: NavItem[];
  pages: Page[];
  currentPageId: string | null;

  // meta
  lastSavedAt: number | null;

  // actions
  applyTemplate: (templateId: string, themeColorId?: string) => void;
  reset: () => void;
  setTheme: (patch: Partial<Pick<SiteState, "themeColorId" | "accent" | "fontDisplay" | "fontBody" | "radius" | "density" | "mode">>) => void;

  addNavItem: (init?: Partial<NavItem>) => string;
  updateNavItem: (id: string, patch: Partial<NavItem>) => void;
  removeNavItem: (id: string) => void;
  reorderNav: (fromIdx: number, toIdx: number) => void;
  toggleNavItem: (id: string) => void;

  addPage: (init?: Partial<Page>) => string;
  updatePage: (id: string, patch: Partial<Page>) => void;
  removePage: (id: string) => void;
  setCurrentPage: (id: string) => void;

  addSection: (pageId: string, type: SectionType) => string;
  duplicateSection: (pageId: string, sectionId: string) => void;
  removeSection: (pageId: string, sectionId: string) => void;
  toggleSection: (pageId: string, sectionId: string) => void;
  updateSection: (pageId: string, sectionId: string, patch: Partial<Section>) => void;
  reorderSection: (pageId: string, fromIdx: number, toIdx: number) => void;
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const EMPTY: Omit<SiteState, keyof ReturnType<typeof actions>> = {
  installed: false,
  templateId: null,
  themeColorId: "purple",
  accent: "#a855f7",
  fontDisplay: "Space Grotesk",
  fontBody: "Inter",
  radius: 14,
  density: 1,
  mode: "dark",
  nav: [],
  pages: [],
  currentPageId: null,
  lastSavedAt: null,
} as any;

function actions() { return {} as any; }

export const useSiteStore = create<SiteState>()(
  persist(
    (set, get) => ({
      ...(EMPTY as any),

      applyTemplate: (templateId, themeColorId) => {
        const tpl = getTemplate(templateId);
        const color = getThemeColor(themeColorId ?? "purple");
        const kit = buildDefaultsForTemplate(tpl);

        // build pages: kit.pages already contain default sections
        const pages: Page[] = kit.pages.map((p) => ({
          id: uid("page"),
          slug: p.slug,
          label: p.label,
          visible: true,
          sections: p.sections.map((s) => ({
            id: uid("sec"),
            type: s.type,
            visible: true,
            props: s.props ?? {},
          })),
        }));

        // build nav: keys reference labels; we'll match by slug to page ids
        const bySlug = new Map(pages.map((p) => [p.slug, p.id]));
        const nav: NavItem[] = kit.nav.map((n) => ({
          id: uid("nav"),
          label: n.label,
          pageId: n.slug ? bySlug.get(n.slug) ?? null : null,
          url: n.url,
          visible: n.visible ?? true,
        }));

        set({
          installed: true,
          templateId: tpl.id,
          themeColorId: color.id,
          accent: color.accent,
          fontDisplay: kit.fontDisplay ?? tpl.fontDisplay,
          fontBody: kit.fontBody ?? tpl.fontBody,
          radius: 14,
          density: 1,
          mode: color.id === "light" ? "light" : "dark",
          nav,
          pages,
          currentPageId: pages[0]?.id ?? null,
          lastSavedAt: Date.now(),
        });
      },

      reset: () => set({ ...EMPTY } as any),

      setTheme: (patch) => set((s) => ({ ...s, ...patch, lastSavedAt: Date.now() })),

      addNavItem: (init) => {
        const id = uid("nav");
        set((s) => ({
          nav: [...s.nav, { id, label: init?.label ?? "New link", pageId: init?.pageId ?? null, url: init?.url, visible: init?.visible ?? true }],
          lastSavedAt: Date.now(),
        }));
        return id;
      },
      updateNavItem: (id, patch) => set((s) => ({ nav: s.nav.map((n) => (n.id === id ? { ...n, ...patch } : n)), lastSavedAt: Date.now() })),
      removeNavItem: (id) => set((s) => ({ nav: s.nav.filter((n) => n.id !== id), lastSavedAt: Date.now() })),
      toggleNavItem: (id) => set((s) => ({ nav: s.nav.map((n) => (n.id === id ? { ...n, visible: !n.visible } : n)), lastSavedAt: Date.now() })),
      reorderNav: (from, to) => set((s) => ({ nav: arrMove(s.nav, from, to), lastSavedAt: Date.now() })),

      addPage: (init) => {
        const id = uid("page");
        const label = init?.label ?? "New page";
        const slug = init?.slug ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const page: Page = {
          id,
          slug,
          label,
          visible: init?.visible ?? true,
          sections: init?.sections ?? [
            { id: uid("sec"), type: "hero-simple", visible: true, props: { eyebrow: label, title: label, body: `Welcome to the ${label} page.` } },
          ],
        };
        set((s) => ({
          pages: [...s.pages, page],
          // auto-add to nav
          nav: [...s.nav, { id: uid("nav"), label, pageId: id, visible: true }],
          currentPageId: id,
          lastSavedAt: Date.now(),
        }));
        return id;
      },
      updatePage: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          nav: patch.label ? s.nav.map((n) => (n.pageId === id ? { ...n, label: patch.label! } : n)) : s.nav,
          lastSavedAt: Date.now(),
        })),
      removePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.id !== id),
          nav: s.nav.filter((n) => n.pageId !== id),
          currentPageId: s.currentPageId === id ? s.pages.find((p) => p.id !== id)?.id ?? null : s.currentPageId,
          lastSavedAt: Date.now(),
        })),
      setCurrentPage: (id) => set({ currentPageId: id }),

      addSection: (pageId, type) => {
        const id = uid("sec");
        set((s) => ({
          pages: s.pages.map((p) => (p.id === pageId ? { ...p, sections: [...p.sections, { id, type, visible: true, props: {} }] } : p)),
          lastSavedAt: Date.now(),
        }));
        return id;
      },
      duplicateSection: (pageId, sectionId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.id !== pageId) return p;
            const idx = p.sections.findIndex((x) => x.id === sectionId);
            if (idx < 0) return p;
            const clone: Section = { ...p.sections[idx], id: uid("sec") };
            const next = [...p.sections];
            next.splice(idx + 1, 0, clone);
            return { ...p, sections: next };
          }),
          lastSavedAt: Date.now(),
        })),
      removeSection: (pageId, sectionId) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === pageId ? { ...p, sections: p.sections.filter((x) => x.id !== sectionId) } : p)),
          lastSavedAt: Date.now(),
        })),
      toggleSection: (pageId, sectionId) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === pageId ? { ...p, sections: p.sections.map((x) => (x.id === sectionId ? { ...x, visible: !x.visible } : x)) } : p,
          ),
          lastSavedAt: Date.now(),
        })),
      updateSection: (pageId, sectionId, patch) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.id === pageId ? { ...p, sections: p.sections.map((x) => (x.id === sectionId ? { ...x, ...patch, props: { ...x.props, ...(patch.props ?? {}) } } : x)) } : p,
          ),
          lastSavedAt: Date.now(),
        })),
      reorderSection: (pageId, from, to) =>
        set((s) => ({
          pages: s.pages.map((p) => (p.id === pageId ? { ...p, sections: arrMove(p.sections, from, to) } : p)),
          lastSavedAt: Date.now(),
        })),
    }),
    {
      name: "aether.site.v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      partialize: (s) => ({
        installed: s.installed,
        templateId: s.templateId,
        themeColorId: s.themeColorId,
        accent: s.accent,
        fontDisplay: s.fontDisplay,
        fontBody: s.fontBody,
        radius: s.radius,
        density: s.density,
        mode: s.mode,
        nav: s.nav,
        pages: s.pages,
        currentPageId: s.currentPageId,
        lastSavedAt: s.lastSavedAt,
      }),
    },
  ),
);

function arrMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
