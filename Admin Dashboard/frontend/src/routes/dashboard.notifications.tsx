import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, ShoppingCart, Package, Sparkles, Megaphone, Check, Filter } from "lucide-react";
import { Breadcrumb, Header, GlassCard } from "@/components/dashboard/glass-form";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — OxiGen Admin" }] }),
  component: NotificationsPage,
});

type Cat = "all" | "orders" | "inventory" | "ai" | "marketing";

type Item = { cat: Exclude<Cat, "all">; icon: any; tone: string; title: string; body: string; when: string; unread?: boolean };
const ITEMS: Item[] = [
  { cat: "orders",    icon: ShoppingCart, tone: "from-emerald-500 to-teal-500", title: "New order #A-3021", body: "Priya Nair · $128.00", when: "2m", unread: true },
  { cat: "inventory", icon: Package,      tone: "from-amber-500 to-orange-500", title: "Runner Pro — low stock", body: "Only 6 units left across 2 warehouses", when: "1h", unread: true },
  { cat: "ai",        icon: Sparkles,     tone: "from-violet-500 to-fuchsia-500", title: "AI drafted 12 SEO titles", body: "Review in AI Studio → History", when: "3h" },
  { cat: "marketing", icon: Megaphone,    tone: "from-rose-500 to-pink-500",    title: "Autumn Drop email — 42% open", body: "Sent to 24,800 subscribers", when: "5h" },
  { cat: "orders",    icon: ShoppingCart, tone: "from-emerald-500 to-teal-500", title: "Order #A-3019 shipped", body: "Tracking #UPS1ZE84…", when: "Yesterday" },
  { cat: "ai",        icon: Sparkles,     tone: "from-violet-500 to-fuchsia-500", title: "Anomaly: refunds up 18%", body: "Investigate cohort from Nov 1–3", when: "Yesterday" },
];

const CATS: { key: Cat; label: string }[] = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "inventory", label: "Inventory" },
  { key: "ai", label: "AI" },
  { key: "marketing", label: "Marketing" },
];

function NotificationsPage() {
  const [cat, setCat] = useState<Cat>("all");
  const [read, setRead] = useState<Set<string>>(new Set());
  const filtered = ITEMS.filter(i => cat === "all" || i.cat === cat);
  const unread = ITEMS.filter(i => i.unread && !read.has(i.title)).length;

  return (
    <div className="space-y-6">
      <Breadcrumb label="Notifications" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header icon={Bell} title="Notifications" subtitle={`${unread} unread · Everything happening in your workspace`} />
        <div className="flex items-center gap-2">
          <button onClick={() => setRead(new Set(ITEMS.map(i => i.title)))}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
          <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
            <Filter className="h-3.5 w-3.5" /> Preferences
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATS.map(c => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`h-8 px-3 rounded-lg text-xs transition ${
              cat === c.key ? "bg-primary-gradient text-primary-foreground shadow-glow" : "glass border border-white/10 hover:bg-white/10"
            }`}>{c.label}</button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <ul>
          <AnimatePresence initial={false}>
            {filtered.map((n, i) => {
              const isUnread = n.unread && !read.has(n.title);
              return (
                <motion.li
                  key={n.title}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <button
                    onClick={() => setRead(r => new Set(r).add(n.title))}
                    className={`group w-full flex items-start gap-3 p-4 border-b border-white/[0.04] transition text-left ${
                      isUnread ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${n.tone} text-white shadow-glow`}>
                      <n.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isUnread ? "font-semibold" : ""}`}>{n.title}</span>
                        {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />}
                        <span className="ml-auto text-[11px] text-muted-foreground">{n.when}</span>
                      </div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5">{n.body}</div>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </GlassCard>
    </div>
  );
}
