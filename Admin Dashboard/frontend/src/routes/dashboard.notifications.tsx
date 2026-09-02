import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, ShoppingCart, Package, Sparkles, Megaphone, Check, Trash2 } from "lucide-react";
import { Breadcrumb, Header, GlassCard } from "@/components/dashboard/glass-form";
import { playNotificationSound } from "@/lib/notification-events";
import { toast } from "sonner";
import { API_BASE, markNotificationRead, clearNotifications, deleteNotification } from "@/lib/api";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — OxiGen Admin" }] }),
  component: NotificationsPage,
});

type Cat = "all" | "orders" | "inventory" | "ai" | "marketing";

type ApiNotification = {
  id: string;
  cat: Exclude<Cat, "all">;
  icon: string;
  tone: string;
  title: string;
  body: string;
  when: string;
  unread?: boolean;
  timestamp?: number;
};

type Item = {
  id: string;
  cat: Exclude<Cat, "all">;
  icon: any;
  tone: string;
  title: string;
  body: string;
  when: string;
  unread: boolean;
};

const CATS: { key: Cat; label: string }[] = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "inventory", label: "Inventory" },
  { key: "ai", label: "AI" },
  { key: "marketing", label: "Marketing" },
];

const iconMap: Record<string, any> = {
  ShoppingCart,
  Package,
  Sparkles,
  Megaphone,
};

function normalizeNotification(item: ApiNotification): Item {
  return {
    id: item.id,
    cat: item.cat ?? "orders",
    icon: iconMap[item.icon] ?? ShoppingCart,
    tone: item.tone || "from-emerald-500 to-teal-500",
    title: item.title,
    body: item.body,
    when: item.when || "Just now",
    unread: Boolean(item.unread),
  };
}

function formatRelativeWhen(ts?: number): string {
  if (!ts) return "Just now";
  const diffMs = Date.now() - ts;
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(ts).toLocaleDateString();
}

function NotificationsPage() {
  const [cat, setCat] = useState<Cat>("all");
  const [items, setItems] = useState<Item[]>([]);

  const markRead = async (id?: string) => {
    const prev = items;
    if (id) {
      setItems((prevItems) => prevItems.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    } else {
      setItems((prevItems) => prevItems.map((n) => ({ ...n, unread: false })));
    }
    try {
      await markNotificationRead(id);
    } catch {
      setItems(prev);
    }
  };

  const clearAll = async () => {
    const prev = items;
    setItems([]);
    try {
      await clearNotifications();
    } catch {
      setItems(prev);
    }
  };

  const deleteOne = async (id: string) => {
    const prev = items;
    setItems((prevItems) => prevItems.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      setItems(prev);
    }
  };

  useEffect(() => {

    let cancelled = false;

    const hydrate = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/notifications`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const next = (data.data ?? []).map((n: ApiNotification) => normalizeNotification({ ...n, when: formatRelativeWhen(n.timestamp) }));
        if (!cancelled) setItems(next);
      } catch {
        // Ignore fetch errors; the SSE stream will recover when backend is reachable.
      }
    };

    hydrate();

    const source = new EventSource(`${API_BASE}/admin/notifications/stream`);
    source.addEventListener("init", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      const next = (payload.notifications ?? []).map((n: ApiNotification) => normalizeNotification({ ...n, when: formatRelativeWhen(n.timestamp) }));
      setItems(next);
    });
    source.addEventListener("notification", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      const n = payload.notification as ApiNotification | undefined;
      if (!n) return;
      const normalized = normalizeNotification({ ...n, when: formatRelativeWhen(n.timestamp) });
      setItems((prev) => [normalized, ...prev.filter((it) => it.id !== n.id)]);

      // Show toast and play sound
      toast.success(n.title, {
        description: n.body,
        duration: 4000,
      });
      playNotificationSound();
    });
    source.addEventListener("change", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      const next = (payload.notifications ?? []).map((n: ApiNotification) => normalizeNotification({ ...n, when: formatRelativeWhen(n.timestamp) }));
      setItems(next);
    });

    source.onerror = () => {
      // EventSource will reconnect automatically; no extra UI handling needed.
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  const filtered = useMemo(() => items.filter((i) => cat === "all" || i.cat === cat), [cat, items]);
  const unread = useMemo(() => items.filter((i) => i.unread).length, [items]);

  return (
    <div className="space-y-6">
      <Breadcrumb label="Notifications" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header icon={Bell} title="Notifications" subtitle={`${unread} unread · Everything happening in your workspace`} />
        <div className="flex items-center gap-2">
          <button onClick={() => markRead()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
            <Check className="h-3.5 w-3.5" /> Mark all read
          </button>
          <button onClick={clearAll}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
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
              const isUnread = n.unread;
              return (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <div
                    className={`group w-full flex items-start gap-3 p-4 border-b border-white/[0.04] transition text-left ${
                      isUnread ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                    onClick={() => isUnread && markRead(n.id)}
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
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg opacity-0 transition group-hover:opacity-100 hover:bg-white/5 text-muted-foreground hover:text-rose-300"
                      aria-label="Delete notification" title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </GlassCard>
    </div>
  );
}
