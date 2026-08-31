import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown,
  ArrowUpRight, Sparkles, Zap, Plus, ArrowRight, Activity, Bot,
  CheckCircle2, Clock, AlertCircle, Truck, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useCreate } from "@/components/dashboard/create-modal";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

/* ---------- Counter ---------- */
function useCountUp(target: number, dur = 1000) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, dur]);
  return { ref, value: v };
}

function Counter({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const { ref, value: v } = useCountUp(value);
  return <span ref={ref}>{prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/* ---------- Stat card ---------- */
type Stat = { label: string; value: number; prefix?: string; suffix?: string; change: number; icon: any; tint: string; spark: number[] };

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const validData = data.length > 1 ? data : [0, 0];
  const max = Math.max(...validData, 1);
  const min = Math.min(...validData, 0);
  const w = 100, h = 32;
  const pts = validData.map((d, i) => {
    const x = (i / (validData.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  const stroke = positive ? "oklch(0.72 0.14 210)" : "oklch(0.577 0.245 27.325)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8">
      <defs>
        <linearGradient id={`g-${positive}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        points={pts}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeOut" }}
      />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g-${positive})`} />
    </svg>
  );
}

function StatCard({ s, i }: { s: Stat; i: number }) {
  const positive = s.change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl glass-strong p-5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className={cn("absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-60 bg-gradient-to-br", s.tint)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{s.label}</div>
          <div className="mt-1.5 font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
          </div>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
          <s.icon className="h-5 w-5 text-primary" />
        </span>
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md",
          positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{s.change}%
        </span>
        <span className="text-xs text-muted-foreground font-medium">ERP sync</span>
      </div>
      <div className="relative mt-3"><Sparkline data={s.spark} positive={positive} /></div>
    </motion.div>
  );
}

/* ---------- Sales chart ---------- */
function SalesChart({ monthlyRevenue }: { monthlyRevenue?: number[] }) {
  const data = (monthlyRevenue && monthlyRevenue.some(v => v > 0))
    ? monthlyRevenue
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const max = Math.max(...data, 100);
  const w = 600, h = 220, pad = 24;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => [pad + i * step, h - pad - (d / max) * (h - pad * 2)] as const);
  const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const area = `${path} L ${pts[pts.length-1][0]} ${h - pad} L ${pad} ${h - pad} Z`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-base font-bold text-foreground">Sales Performance</div>
          <div className="text-xs text-muted-foreground mt-0.5">Live ERP Sales Orders across 12 months</div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {["12M"].map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">{t}</span>
          ))}
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
          <defs>
            <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.48 0.22 291)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="oklch(0.72 0.14 210)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="stroke-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="oklch(0.48 0.22 291)" />
              <stop offset="100%" stopColor="oklch(0.72 0.14 210)" />
            </linearGradient>
          </defs>
          {[0,1,2,3].map(i => (
            <line key={i} x1={pad} x2={w - pad} y1={pad + i * ((h - pad*2)/3)} y2={pad + i * ((h - pad*2)/3)}
              stroke="color-mix(in oklab, var(--border) 60%, transparent)" strokeDasharray="3 5" />
          ))}
          <motion.path d={area} fill="url(#area-fill)"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.8 }} />
          <motion.path d={path} fill="none" stroke="url(#stroke-grad)" strokeWidth="3" strokeLinecap="round"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: "easeOut" }} />
          {pts.map((p, i) => (
            <motion.circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--card)" stroke="url(#stroke-grad)" strokeWidth="2.5"
              initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 + i * 0.05 }} />
          ))}
        </svg>
        <div className="grid grid-cols-12 mt-1 px-6 text-[11px] font-medium text-muted-foreground">
          {labels.map(l => <div key={l} className="text-center">{l}</div>)}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- AI insights ---------- */
function AIInsights({ stats }: { stats: DashboardStats | null }) {
  const count = stats?.ordersCount ?? 0;
  const products = stats?.productsCount ?? 0;
  const lowStock = stats?.inventory.lowStock ?? 0;

  const insights = [
    { icon: Zap, text: `ERP is connected live. ${count} Sales Orders recorded across your catalog.`, accent: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: TrendingUp, text: `${products} published product items active in ERPNext catalog.`, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: AlertCircle, text: lowStock > 0 ? `${lowStock} items currently low in stock.` : "All catalog warehouse inventory levels are healthy.", accent: lowStock > 0 ? "text-destructive" : "text-cyan-500", bg: lowStock > 0 ? "bg-destructive/10" : "bg-cyan-500/10" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative rounded-2xl p-5 md:p-6 overflow-hidden glass-strong shadow-sm border border-border">
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent shadow-sm">
            <Bot className="h-4.5 w-4.5 text-white" />
          </span>
          <div>
            <div className="text-base font-bold text-foreground">ERP Insights</div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Live synchronization</div>
          </div>
        </div>
        <ul className="space-y-2.5">
          {insights.map((i, idx) => (
            <motion.li key={idx}
              initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.08 }}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/60 border border-border/80 hover:bg-secondary transition-colors">
              <span className={cn("p-1 rounded-lg shrink-0 mt-0.5", i.bg)}>
                <i.icon className={cn("h-4 w-4", i.accent)} />
              </span>
              <span className="text-xs leading-relaxed font-medium text-foreground">{i.text}</span>
            </motion.li>
          ))}
        </ul>
        <Link to="/dashboard/$" params={{ _splat: "orders" }} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold transition-colors">
          Manage All Orders <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ---------- Recent orders ---------- */
function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (/paid|complete|deliver|fulfill|shipped/.test(s)) return "emerald";
  if (/processing|to deliver|draft|pending/.test(s)) return "amber";
  if (/refund|cancel/.test(s)) return "rose";
  return "cyan";
}

function RecentOrders({ orders }: { orders: DashboardStats["recentOrders"] }) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose:    "bg-destructive/10 text-destructive border-destructive/20",
    cyan:    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-base font-bold text-foreground">Recent Orders</div>
          <div className="text-xs text-muted-foreground mt-0.5">Live transactions from ERPNext</div>
        </div>
        <Link to="/dashboard/$" params={{ _splat: "orders" }} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 transition-colors">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground font-medium">
          No orders found in ERPNext. Create your first order to see it here!
        </div>
      ) : (
        <div className="divide-y divide-border">
          {orders.map((o, i) => {
            const tone = statusTone(o.status);
            return (
              <motion.div key={o.id}
                initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[140px_1fr_120px_120px] items-center gap-3 py-3 group hover:bg-secondary/40 px-2 rounded-xl transition-colors">
                <div className="text-xs font-mono font-medium text-muted-foreground truncate">{o.id}</div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white text-[11px] font-bold shadow-sm">
                    {o.customer.split(" ").map(n => n[0]).slice(0, 2).join("") || "C"}
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">{o.customer}</span>
                </div>
                <span className={cn("hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider", toneMap[tone])}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{o.status}
                </span>
                <div className="text-sm font-bold text-foreground text-right">{o.total}</div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Top products / inventory ---------- */
function TopProducts({ products }: { products: DashboardStats["topProducts"] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-bold text-foreground">Top Products</div>
        <Link to="/dashboard/$" params={{ _splat: "products" }} className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground font-medium">
          No products found in ERP catalog.
        </div>
      ) : (
        <ul className="space-y-3.5">
          {products.map((p, i) => (
            <li key={p.code}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="truncate max-w-[160px] font-semibold text-foreground">{p.name}</span>
                <span className="text-muted-foreground font-medium">{p.stock} in stock</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${p.soldPct}%` }} viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-gradient-to-r from-primary to-accent shadow-sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/* ---------- Inventory status ---------- */
function InventoryStatus({ inventory }: { inventory: DashboardStats["inventory"] }) {
  const total = inventory.total || 1;
  const inStockPct = Math.round((inventory.inStock / total) * 100);
  const lowStockPct = Math.round((inventory.lowStock / total) * 100);
  const outOfStockPct = Math.round((inventory.outOfStock / total) * 100);

  const items = [
    { label: "In stock", count: inventory.inStock, pct: inStockPct, tint: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
    { label: "Low stock", count: inventory.lowStock, pct: lowStockPct, tint: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
    { label: "Out of stock", count: inventory.outOfStock, pct: outOfStockPct, tint: "text-destructive", bar: "bg-destructive" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-bold text-foreground">Inventory Status</div>
        <span className="text-xs font-semibold text-muted-foreground">{inventory.total} total items</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-secondary">
        {items.map(i => (
          <motion.div key={i.label} initial={{ width: 0 }} whileInView={{ width: `${i.pct}%` }} viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className={i.bar} />
        ))}
      </div>
      <ul className="space-y-2.5">
        {items.map(i => (
          <li key={i.label} className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2 text-foreground"><span className={cn("h-2 w-2 rounded-full", i.bar)} /> {i.label}</span>
            <span className={cn("font-bold", i.tint)}>{i.count}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ---------- Quick actions ---------- */
function QuickActions() {
  const navigate = useNavigate();
  const create = useCreate();

  const actions = [
    { icon: Plus, label: "Add product", action: () => navigate({ to: "/dashboard/$", params: { _splat: "products" } }) },
    { icon: ShoppingCart, label: "New order", action: () => navigate({ to: "/dashboard/$", params: { _splat: "orders" } }) },
    { icon: Users, label: "Add customer", action: () => navigate({ to: "/dashboard/$", params: { _splat: "customers" } }) },
    { icon: Sparkles, label: "Create wizard", action: () => create.open() },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm">
      <div className="text-base font-bold text-foreground mb-4">Quick Actions</div>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a, i) => (
          <motion.button key={a.label}
            whileHover={{ y: -2 }}
            onClick={a.action}
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="group flex flex-col items-start gap-2 rounded-xl p-3 bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-foreground">{a.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Activity feed ---------- */
function ActivityFeed({ activity }: { activity: DashboardStats["activity"] }) {
  const getIcon = (type: string) => {
    if (type === "order") return CheckCircle2;
    if (type === "customer") return Users;
    return Activity;
  };

  const getTone = (type: string) => {
    if (type === "order") return "text-emerald-500 bg-emerald-500/10";
    if (type === "customer") return "text-cyan-500 bg-cyan-500/10";
    return "text-primary bg-primary/10";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl glass-strong p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Live Activity
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span> Connected
        </span>
      </div>
      {activity.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground font-medium">
          No recent activity logs.
        </div>
      ) : (
        <ul className="space-y-3">
          {activity.slice(0, 5).map((it, i) => {
            const Icon = getIcon(it.type);
            const tone = getTone(it.type);
            return (
              <motion.li key={it.id || i}
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3">
                <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border", tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{it.text}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{it.time}</div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

/* ---------- Main Dashboard Home ---------- */
function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const create = useCreate();
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getDashboardStats()
      .then((data) => {
        setStatsData(data);
      })
      .catch((err) => {
        console.error("Failed to load ERP stats:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats: Stat[] = [
    {
      label: "Revenue",
      value: statsData?.revenue ?? 0,
      prefix: "PKR ",
      change: statsData?.revenue ? 10.5 : 0,
      icon: DollarSign,
      tint: "from-primary/20 to-accent/10",
      spark: statsData?.monthlyRevenue?.length ? statsData.monthlyRevenue : [0, 0, 0, 0],
    },
    {
      label: "Orders",
      value: statsData?.ordersCount ?? 0,
      change: statsData?.ordersCount ? 5.2 : 0,
      icon: ShoppingCart,
      tint: "from-cyan-500/20 to-sky-500/10",
      spark: statsData?.monthlyOrders?.length ? statsData.monthlyOrders : [0, 0, 0, 0],
    },
    {
      label: "Customers",
      value: statsData?.customersCount ?? 0,
      change: statsData?.customersCount ? 8.4 : 0,
      icon: Users,
      tint: "from-emerald-500/20 to-teal-500/10",
      spark: [1, 2, 3, statsData?.customersCount ?? 1],
    },
    {
      label: "Products",
      value: statsData?.productsCount ?? 0,
      change: 0,
      icon: Package,
      tint: "from-purple-500/20 to-pink-500/10",
      spark: [1, 2, 2, statsData?.productsCount ?? 1],
    },
  ];

  const firstName = user?.full_name?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, <span className="text-gradient">{firstName}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Live data from OxiGen ERPNext connected server.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-colors shadow-sm">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-primary")} /> Refresh
          </button>
          <button onClick={() => create.open()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25 hover:-translate-y-0.5 transition-all">
            <Plus className="h-3.5 w-3.5" /> Create
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} s={s} i={i} />)}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalesChart monthlyRevenue={statsData?.monthlyRevenue} />
        <AIInsights stats={statsData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentOrders orders={statsData?.recentOrders ?? []} />
        <TopProducts products={statsData?.topProducts ?? []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InventoryStatus inventory={statsData?.inventory ?? { inStock: 0, lowStock: 0, outOfStock: 0, total: 0 }} />
        <QuickActions />
        <ActivityFeed activity={statsData?.activity ?? []} />
      </div>
    </div>
  );
}
