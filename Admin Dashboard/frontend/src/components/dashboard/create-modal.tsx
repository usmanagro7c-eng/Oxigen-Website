import { motion, AnimatePresence } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X, FolderPlus, Store, Package, ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Ctx = { open: () => void; close: () => void };
const CreateCtx = createContext<Ctx | null>(null);

export function useCreate() {
  const c = useContext(CreateCtx);
  if (!c) throw new Error("useCreate must be used within CreateModalProvider");
  return c;
}

type Item = {
  key: "project" | "store" | "product";
  icon: any;
  title: string;
  desc: string;
  tint: string;
};

const ITEMS: Item[] = [
  { key: "project",    icon: FolderPlus,     title: "New Project",   desc: "Start from a blank workspace with AI scaffolding.", tint: "from-violet-500/30 to-fuchsia-500/10" },
  { key: "store",      icon: Store,          title: "Store",         desc: "Launch a full ecommerce storefront in minutes.",    tint: "from-emerald-500/30 to-teal-500/10" },
  { key: "product",    icon: Package,        title: "Product",       desc: "Add a product with AI-generated copy & images.",    tint: "from-rose-500/30 to-orange-500/10" },
];

export function CreateModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo<Ctx>(() => ({ open: () => setOpen(true), close: () => setOpen(false) }), []);
  return (
    <CreateCtx.Provider value={value}>
      {children}
      <CreateModal open={isOpen} onClose={() => setOpen(false)} />
    </CreateCtx.Provider>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const pick = (it: Item) => {
    onClose();
    navigate({ to: "/dashboard/new/$kind", params: { kind: it.key } });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog" aria-modal="true" aria-label="Create new"
        >
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Ambient orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-primary"
              animate={{ x: [0, 40, -20, 0], y: [0, 30, -20, 0] }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-accent"
              animate={{ x: [0, -30, 20, 0], y: [0, -30, 20, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full md:w-[min(880px,calc(100%-2rem))] max-h-[92vh] overflow-hidden
                       md:rounded-[28px] glass-strong shadow-elegant border border-border flex flex-col"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 sm:px-10 pt-10 pb-4">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Quick Create
              </div>
              <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                What would you like to create?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground font-medium">
                Pick a starting point to add records directly to your OxiGen ERP database.
              </p>
            </div>

            <div className="px-6 sm:px-10 pb-10 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ITEMS.map((it, i) => (
                  <motion.button
                    key={it.key}
                    onClick={() => pick(it)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative overflow-hidden text-left rounded-2xl bg-card border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                  >
                    <div className={cn("pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br", it.tint)} />
                    <div className="relative flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:text-white transition-all">
                        <it.icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-bold text-foreground">{it.title}</div>
                          <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                        <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground font-medium">{it.desc}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
