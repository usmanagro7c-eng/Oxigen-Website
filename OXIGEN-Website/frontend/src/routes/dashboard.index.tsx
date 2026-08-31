import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Clock,
  CheckCircle2,
  Heart,
  MapPin,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Bell,
} from "lucide-react";
import { motion } from "motion/react";
import {
  DashCard,
  SectionHeader,
  StatusBadge,
  orderTone,
} from "@/components/dashboard/DashboardShell";
import { mockNotifications } from "@/lib/dashboard-mock";
import { slugify, formatPKR } from "@/lib/site-data";
import { useStore } from "@/lib/store";
import { API_BASE, getProductImage } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — OxiGen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { wishlistItems, user, profile, orders, addresses } = useStore();
  const nameToUse = profile?.name || user?.name || "User";
  const statusToUse = profile?.status || "Member";
  const memberSinceToUse = profile?.memberSince || "Joined recently";

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status !== "Completed" && o.status !== "Cancelled" && o.status !== "Delivered").length;
  const completedOrders = orders.filter((o) => o.status === "Completed" || o.status === "Delivered").length;

  const recent = orders.slice(0, 3);
  const notifs = mockNotifications.slice(0, 4);

  const [recommended, setRecommended] = useState<any[]>([]);
  const [viewed, setViewed] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/items?limit=8`)
      .then((res) => res.json())
      .then((json) => {
        const items = json.data || [];
        setRecommended(items.slice(0, 4));
        setViewed(items.slice(4, 8));
      })
      .catch(() => {});
  }, []);

  const kpis = [
    { label: "Total Orders", value: totalOrders, icon: Package, tone: "from-primary to-accent" },
    { label: "Pending", value: pendingOrders, icon: Clock, tone: "from-amber-400 to-orange-500" },
    { label: "Completed", value: completedOrders, icon: CheckCircle2, tone: "from-emerald to-cyan" },
    { label: "Wishlist", value: wishlistItems.length, icon: Heart, tone: "from-pink-500 to-rose-500" },
    { label: "Addresses", value: addresses.length, icon: MapPin, tone: "from-cyan to-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-cyan/25 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {statusToUse}
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              Welcome back, {nameToUse.split(" ")[0]} 👋
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/85">
              Member since {memberSinceToUse}. Here's what's happening with your wellness journey today.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:bg-white"
              >
                <ShoppingBag className="h-4 w-4" /> Continue shopping
              </Link>
              <Link
                to="/dashboard/orders"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                View orders <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-white/15 text-3xl font-black backdrop-blur">
              {nameToUse.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <DashCard className="p-4">
                <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${k.tone} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black text-ink">{k.value}</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">{k.label}</p>
              </DashCard>
            </motion.div>
          );
        })}
      </div>

      {/* Recent orders + Notifications */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashCard className="lg:col-span-2">
          <SectionHeader
            title="Recent Orders"
            action={
              <Link to="/dashboard/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent orders found.</p>
            ) : (
              recent.map((o) => (
                <Link
                  key={o.id}
                  to="/dashboard/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-white/60 p-3 transition hover:border-primary/50 hover:bg-white"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{o.id}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(o.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-ink">{formatPKR(o.total)}</p>
                  <StatusBadge status={o.status} tone={orderTone(o.status)} />
                </Link>
              ))
            )}
          </div>
        </DashCard>

        <DashCard>
          <SectionHeader
            title="Notifications"
            action={
              <Link to="/dashboard/notifications" className="text-sm font-semibold text-primary hover:underline">
                All
              </Link>
            }
          />
          {notifs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No new notifications.</p>
          ) : (
            <ul className="space-y-3">
              {notifs.map((n) => (
                <li key={n.id} className="flex gap-3 rounded-xl bg-white/60 p-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${n.read ? "bg-secondary text-muted-foreground" : "bg-gradient-to-br from-primary to-accent text-white"}`}>
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      </div>

      {/* Recently viewed / recommended */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProductStrip title="Recently Viewed" items={viewed} />
        <ProductStrip title="Recommended For You" items={recommended} />
      </div>
    </div>
  );
}

function ProductStrip({ title, items }: { title: string; items: any[] }) {
  return (
    <DashCard>
      <SectionHeader
        title={title}
        action={
          <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Shop <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {items.map((p) => {
          const slug = p.route?.split("/").pop() || slugify(p.item_name);
          const price = p.standard_rate || 0;
          const available = p.custom_stock_qty !== 0;
          const img = getProductImage(p.image);

          return (
            <Link
              key={p.item_code}
              to="/product/$slug"
              params={{ slug }}
              className="group rounded-xl border border-border/60 bg-white/60 p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-secondary">
                <img src={img} alt={p.item_name} loading="lazy" className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
              </div>
              <p className="line-clamp-2 text-xs font-semibold text-ink">{p.item_name}</p>
              <p className="mt-1 text-sm font-extrabold text-primary">
                {available ? formatPKR(price) : "Soon"}
              </p>
            </Link>
          );
        })}
      </div>
    </DashCard>
  );
}
