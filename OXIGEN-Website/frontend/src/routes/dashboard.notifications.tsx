import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Package, Truck, Tag, User as UserIcon, Check } from "lucide-react";
import { DashCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { mockNotifications } from "@/lib/dashboard-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({ meta: [{ title: "Notifications — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

const TABS = ["All", "Orders", "Shipping", "Promotions", "Account"] as const;
const iconFor: Record<string, any> = { order: Package, shipping: Truck, promo: Tag, account: UserIcon };

function NotificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [items, setItems] = useState(mockNotifications);

  const filtered = items.filter((n) => {
    if (tab === "All") return true;
    if (tab === "Orders") return n.type === "order";
    if (tab === "Shipping") return n.type === "shipping";
    if (tab === "Promotions") return n.type === "promo";
    return n.type === "account";
  });

  const markAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };
  const markOne = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className="space-y-5">
      <DashCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-white/70 text-ink hover:bg-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={markAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
          >
            <Check className="h-3.5 w-3.5" /> Mark all as read
          </button>
        </div>
      </DashCard>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" desc="You're all caught up." />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const Icon = iconFor[n.type] ?? Bell;
            return (
              <DashCard key={n.id} className={`flex items-start gap-4 p-4 transition ${!n.read ? "ring-1 ring-primary/25" : ""}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${!n.read ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{n.title}</p>
                    {!n.read && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">New</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{n.time}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markOne(n.id)}
                    className="shrink-0 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                  >
                    Mark read
                  </button>
                )}
              </DashCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
