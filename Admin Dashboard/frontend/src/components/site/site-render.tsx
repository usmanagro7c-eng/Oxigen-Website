import { useSiteStore } from "@/lib/site-store";
import { renderSection } from "@/components/site/sections";
import { cn } from "@/lib/utils";

type Props = {
  pageId?: string; // defaults to currentPageId
  onSelectSection?: (id: string) => void;
  selectedSectionId?: string | null;
  onNavigatePage?: (pageId: string) => void;
};

export function SiteRender({ pageId, onSelectSection, selectedSectionId, onNavigatePage }: Props) {
  const s = useSiteStore();
  const activePageId = pageId ?? s.currentPageId;
  const page = s.pages.find((p) => p.id === activePageId);

  if (!s.installed || !page) {
    return (
      <div className="min-h-[400px] grid place-items-center text-muted-foreground text-sm">
        No template installed yet.
      </div>
    );
  }

  const ctx = {
    accent: s.accent,
    fontDisplay: s.fontDisplay,
    fontBody: s.fontBody,
    mode: s.mode,
    radius: s.radius,
  };

  return (
    <div className={cn(s.mode === "light" ? "bg-white text-black" : "bg-[#0a0a0a] text-white")}
      style={{ fontFamily: s.fontBody, ["--radius" as any]: `${s.radius}px` }}
    >
      <SiteHeader onNavigatePage={onNavigatePage} />

      <main>
        {page.sections.filter((sec) => sec.visible).map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={(e) => { e.preventDefault(); onSelectSection?.(sec.id); }}
            className={cn(
              "block w-full text-left relative outline-none transition",
              selectedSectionId === sec.id ? "ring-2 ring-inset ring-primary/60" : "hover:ring-1 hover:ring-inset hover:ring-white/15",
            )}
          >
            {selectedSectionId === sec.id && (
              <span className="absolute top-2 left-2 z-20 h-6 px-2 rounded-md text-[10px] font-semibold inline-flex items-center"
                style={{ background: s.accent, color: "#000" }}>
                {sec.type}
              </span>
            )}
            {renderSection(sec, ctx)}
          </button>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader({ onNavigatePage }: { onNavigatePage?: (pageId: string) => void }) {
  const s = useSiteStore();
  const visibleNav = s.nav.filter((n) => n.visible);
  const home = s.pages.find((p) => p.slug === "home");
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: s.mode === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)", background: s.mode === "light" ? "rgba(255,255,255,0.7)" : "rgba(10,10,10,0.65)" }}>
      <div className="mx-auto max-w-6xl px-6 md:px-10 h-14 flex items-center gap-6">
        <button onClick={() => home && onNavigatePage?.(home.id)} className="text-base font-semibold tracking-tight" style={{ fontFamily: s.fontDisplay }}>
          Brand
        </button>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {visibleNav.map((n) => (
            <button key={n.id} onClick={() => n.pageId && onNavigatePage?.(n.pageId)}
              className="text-muted-foreground hover:text-foreground transition">
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="h-8 px-3 rounded-full text-xs font-medium" style={{ background: s.accent, color: "#000" }}>Get started</button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const s = useSiteStore();
  const nav = s.nav.filter((n) => n.visible);
  return (
    <footer className="border-t mt-6" style={{ borderColor: s.mode === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground" style={{ fontFamily: s.fontDisplay }}>Brand</div>
        <nav className="flex flex-wrap gap-4">
          {nav.map((n) => <span key={n.id}>{n.label}</span>)}
        </nav>
        <div className="ml-auto">© {new Date().getFullYear()} · Made with Aether</div>
      </div>
    </footer>
  );
}
