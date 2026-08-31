import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight, Search, SlidersHorizontal, Download, Plus, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronLeft, Sparkles, RefreshCw,
  Eye, Pencil, Copy, Trash2, X, Check, AlertCircle, Upload,
  type LucideIcon,
} from "lucide-react";
import { findItem, NAV } from "@/components/dashboard/nav-config";
import { cn } from "@/lib/utils";
import {
  getItems, createItem, updateItem, deleteItem,
  getItemGroups, createItemGroup, updateItemGroup, deleteItemGroup,
  getAdminOrders, getAdminOrderDetail, createAdminOrder, updateAdminOrder, deleteAdminOrder,
  getAdminCustomers, createAdminCustomer, updateAdminCustomer, deleteAdminCustomer,
  getAdminInventory, adjustAdminInventory,
  getAdminDiscounts, createAdminDiscount, deleteAdminDiscount,
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getAdminFiles, uploadAdminFile,
  getErpResource, createErpDoc, updateErpDoc, deleteErpDoc,
  getDashboardStats, type DashboardStats, type ItemGroup,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/dashboard/$")({
  component: DashboardCatchAll,
});

/* ============================================================
 * Toast system
 * ============================================================ */
type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
let toastId = 0;
const toastListeners = new Set<(t: Toast) => void>();
function pushToast(kind: Toast["kind"], text: string) {
  const t: Toast = { id: ++toastId, kind, text };
  toastListeners.forEach((l) => l(t));
}
function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    toastListeners.add(l);
    return () => { toastListeners.delete(l); };
  }, []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-2 rounded-xl glass-strong border border-white/10 px-4 py-2.5 text-xs shadow-glow">
            {t.kind === "success" && <Check className="h-3.5 w-3.5 text-emerald-300" />}
            {t.kind === "error" && <AlertCircle className="h-3.5 w-3.5 text-rose-300" />}
            {t.kind === "info" && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            <span>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 * Page Configuration Types
 * ============================================================ */
type Stat = { label: string; value: string; delta?: string; trend?: "up" | "down" };
type Column = { key: string; label: string; className?: string; type?: "text" | "number" | "select" | "textarea" };
type Row = Record<string, any>;
type PageMeta = {
  subtitle: string;
  primaryAction: string;
  filters: string[];
  columns: Column[];
  emptyTitle: string;
  emptyDesc: string;
};

const MODULE_META: Record<string, PageMeta> = {
  products: {
    subtitle: "Real-time product catalog and available stock in Oxigen Warehouse.",
    primaryAction: "Add product",
    filters: ["All", "Active", "Out of stock"],
    columns: [
      { key: "name", label: "Product Name" },
      { key: "sku", label: "Item Code / SKU" },
      { key: "item_group", label: "Category" },
      { key: "price", label: "Price" },
      { key: "stock", label: "Available Stock" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No products in ERPNext",
    emptyDesc: "Add your first product to sync it directly to the ERP catalog.",
  },

  orders: {
    subtitle: "Manage, fulfill and create Sales Orders in ERPNext.",
    primaryAction: "Create order",
    filters: ["All", "To Deliver and Bill", "Draft", "Completed", "Cancelled"],
    columns: [
      { key: "id", label: "Order ID" },
      { key: "customer", label: "Customer" },
      { key: "total", label: "Grand Total" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date", className: "text-right" },
    ],
    emptyTitle: "No orders in ERPNext",
    emptyDesc: "Create a new Sales Order to see it appear in real-time.",
  },

  categories: {
    subtitle: "Item Groups & product categories synced with ERPNext.",
    primaryAction: "New category",
    filters: ["All", "Parent Group", "Subcategory"],
    columns: [
      { key: "name", label: "Category Name" },
      { key: "item_count", label: "Products Count" },
      { key: "parent", label: "Parent Category" },
      { key: "is_group_label", label: "Type" },
      { key: "description", label: "Description" },
    ],
    emptyTitle: "No categories in ERPNext",
    emptyDesc: "Create an Item Group in ERPNext to organize your products.",
  },

  collections: {
    subtitle: "Product collections & item groups synced with ERPNext.",
    primaryAction: "New collection",
    filters: ["All", "Parent Group", "Subcategory"],
    columns: [
      { key: "name", label: "Collection / Category Name" },
      { key: "item_count", label: "Products Count" },
      { key: "parent", label: "Parent Category" },
      { key: "is_group_label", label: "Type" },
      { key: "description", label: "Description" },
    ],
    emptyTitle: "No collections in ERPNext",
    emptyDesc: "Create an Item Group in ERPNext to organize your products.",
  },

  customers: {
    subtitle: "Customer accounts and contacts stored in ERPNext.",
    primaryAction: "Add customer",
    filters: ["All", "Individual", "Commercial"],
    columns: [
      { key: "customer_name", label: "Customer Name" },
      { key: "email_id", label: "Email" },
      { key: "mobile_no", label: "Phone" },
      { key: "customer_group", label: "Group" },
      { key: "territory", label: "Territory", className: "text-right" },
    ],
    emptyTitle: "No customers in ERPNext",
    emptyDesc: "Add your first customer to start tracking orders and history.",
  },

  inventory: {
    subtitle: "Live Oxigen Warehouse inventory levels, reserved stock, and available units in ERPNext.",
    primaryAction: "Adjust stock",
    filters: ["All", "In stock", "Out of stock"],
    columns: [
      { key: "sku", label: "Item Code" },
      { key: "name", label: "Item Name" },
      { key: "item_group", label: "Category" },
      { key: "warehouse", label: "Warehouse" },
      { key: "actual_qty", label: "Actual Stock" },
      { key: "reserved_qty", label: "Reserved (Orders)" },
      { key: "available_qty", label: "Available Stock" },
      { key: "stock_uom", label: "UOM" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No inventory records in Oxigen Warehouse",
    emptyDesc: "Stock records will show up automatically when Items and Bins are active.",
  },

  discounts: {
    subtitle: "Item Price rules and discount lists in ERPNext.",
    primaryAction: "Add price rule",
    filters: ["All", "Standard Selling"],
    columns: [
      { key: "item_code", label: "Item Code" },
      { key: "price_list", label: "Price List" },
      { key: "price_list_rate", label: "Rate" },
      { key: "currency", label: "Currency", className: "text-right" },
    ],
    emptyTitle: "No price rules configured",
    emptyDesc: "Add custom selling prices and discounts for your catalog.",
  },

  team: {
    subtitle: "ERPNext users and team access control.",
    primaryAction: "Invite user",
    filters: ["All", "Enabled", "Disabled"],
    columns: [
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "user_type", label: "Role / Type" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No team members found",
    emptyDesc: "Invite users and system members directly into ERPNext.",
  },

  shipping: {
    subtitle: "Shipping rules and distribution warehouses.",
    primaryAction: "Add shipping rule",
    filters: ["All"],
    columns: [
      { key: "name", label: "Shipping Rule / Warehouse" },
      { key: "company", label: "Company" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No shipping rules found",
    emptyDesc: "Define shipping carriers and warehouse zones in ERPNext.",
  },
};

/* ============================================================
 * Route component: dispatch by slug
 * ============================================================ */
function DashboardCatchAll() {
  const { _splat } = Route.useParams();
  const slug = _splat ?? "";
  const item = findItem(slug);

  if (slug === "analytics") return <AnalyticsPage />;
  if (slug === "media")     return <MediaLibraryPage />;

  const meta = MODULE_META[slug] ?? {
    subtitle: `Manage ${slug} in ERPNext.`,
    primaryAction: `Create ${slug.replace(/s$/, "")}`,
    filters: ["All"],
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "modified", label: "Modified", className: "text-right" },
    ],
    emptyTitle: `No ${slug} found`,
    emptyDesc: `Create an entry to sync directly with ERPNext.`,
  };

  return <LiveTablePage slug={slug} icon={item?.icon ?? Sparkles} title={item?.label ?? slug} meta={meta} />;
}

/* ============================================================
 * Breadcrumb & Header
 * ============================================================ */
function Breadcrumb({ label }: { label: string }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground">{label}</span>
    </motion.nav>
  );
}

function PageHeader({
  icon: Icon, title, subtitle, primaryAction, onPrimary, onExport, onRefresh, loading,
}: {
  icon: LucideIcon; title: string; subtitle: string; primaryAction: string;
  onPrimary?: () => void; onExport?: () => void; onRefresh?: () => void; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 18 }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient shadow-glow">
          <Icon className="h-5 w-5" />
        </motion.span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight truncate text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRefresh}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition shadow-sm">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-primary")} /> Refresh
        </button>
        <button onClick={onExport}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition shadow-sm">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onPrimary}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25">
          <Plus className="h-3.5 w-3.5" /> {primaryAction}
        </motion.button>
      </div>
    </motion.div>
  );
}

function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.05, duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl glass-strong border border-border p-4 shadow-sm"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <div className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">{s.value}</div>
            {s.delta && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5",
                s.trend === "up" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive",
              )}>
                {s.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.delta}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Toolbar({
  filters, active, onActive, query, onQuery, onFiltersToggle, filtersOpen,
}: {
  filters: string[]; active: string; onActive: (f: string) => void;
  query: string; onQuery: (q: string) => void;
  onFiltersToggle?: () => void; filtersOpen?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search records…"
          className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-card border border-border p-1 shadow-sm">
        {filters.map((f) => (
          <button key={f} onClick={() => onActive(f)}
            className={cn(
              "h-7 px-3 rounded-lg text-xs font-semibold transition",
              active === f ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}>
            {f}
          </button>
        ))}
      </div>
      <button onClick={onFiltersToggle}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition shadow-sm",
          filtersOpen && "bg-secondary text-foreground",
        )}>
        <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
      </button>
    </div>
  );
}

type RowAction = "view" | "edit" | "duplicate" | "delete";
function DataTable({
  columns, rows, onRowClick, onAction,
}: {
  columns: Column[]; rows: Row[];
  onRowClick?: (r: Row, index: number) => void;
  onAction?: (a: RowAction, r: Row, index: number) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="rounded-2xl glass-strong border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {columns.map((c) => (
                <th key={c.key}
                  className={cn("px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-bold", c.className)}>
                  {c.label}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <motion.tr key={r.rawKey || r.name || r.id || i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                onClick={() => onRowClick?.(r, i)}
                className="border-b border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 text-[13px] font-medium text-foreground", c.className)}>
                    {c.key === "status" || c.key === "visible" || c.key === "is_group_label" ? (
                      <StatusPill label={String(r[c.key] ?? "Active")} />
                    ) : (
                      String(r[c.key] ?? "—")
                    )}
                  </td>
                ))}
                <td className="px-2 text-right">
                  <RowMenu onAction={(a) => onAction?.(a, r, i)} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowMenu({ onAction }: { onAction: (a: RowAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const items: { key: RowAction; label: string; icon: LucideIcon; danger?: boolean }[] = [
    { key: "view", label: "View details", icon: Eye },
    { key: "edit", label: "Edit in ERP", icon: Pencil },
    { key: "duplicate", label: "Duplicate", icon: Copy },
    { key: "delete", label: "Delete", icon: Trash2, danger: true },
  ];
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl glass-strong border border-border p-1 shadow-elegant text-left">
            {items.map((it) => (
              <button key={it.key}
                onClick={() => { setOpen(false); onAction(it.key); }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition",
                  it.danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}>
                <it.icon className="h-3.5 w-3.5" />
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const l = label.toLowerCase();
  const tone =
    /paid|active|completed|success|in stock|enabled|parent group/.test(l) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
    /to deliver|draft|pending|processing|subcategory/.test(l)            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" :
    /refund|low/.test(l)                                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
    /fail|cancel|out|disabled|closed/.test(l)                             ? "bg-destructive/10 text-destructive border-destructive/20" :
                                                                            "bg-secondary text-muted-foreground border-border";
  return <span className={cn("inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider border", tone)}>{label}</span>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="text-muted-foreground font-medium">Page {page} of {pages}</div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-secondary disabled:opacity-40 transition">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {Array.from({ length: pages }).map((_, i) => (
          <button key={i} onClick={() => onPage(i + 1)}
            className={cn("h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition",
              page === i + 1 ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "bg-card border border-border hover:bg-secondary")}>
            {i + 1}
          </button>
        ))}
        <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-secondary disabled:opacity-40 transition">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, desc, action, onAction }: { title: string; desc: string; action: string; onAction?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass-strong border border-border p-10 text-center shadow-sm">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-sm mb-3">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="font-display text-lg font-bold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto font-medium">{desc}</p>
      <button onClick={onAction}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25">
        <Plus className="h-3.5 w-3.5" /> {action}
      </button>
    </motion.div>
  );
}

/* ============================================================
 * Drawer & Dynamic Modal
 * ============================================================ */
function DetailDrawer({
  open, onClose, row, columns, title, onEdit, onDuplicate, onDelete,
}: {
  open: boolean; onClose: () => void; row: Row | null; columns: Column[]; title: string;
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <AnimatePresence>
      {open && row && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-md" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="fixed top-0 right-0 z-50 h-screen w-full max-w-md glass-strong border-l border-border flex flex-col shadow-elegant">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{title} details</div>
                <div className="font-display text-lg font-bold mt-0.5 truncate text-foreground">{String(row[columns[0]?.key] || row.name || row.id)}</div>
              </div>
              <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {columns.map((c) => (
                <div key={c.key} className="rounded-xl bg-card border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{c.label}</div>
                  <div className="text-sm mt-1 break-words font-medium text-foreground">
                    {c.key === "status" || c.key === "visible" || c.key === "is_group_label"
                      ? <StatusPill label={String(row[c.key] ?? "Active")} />
                      : String(row[c.key] ?? "—")}
                  </div>
                </div>
              ))}
              <div className="rounded-xl bg-card border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ERP Metadata</div>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground font-medium">
                  <li className="flex items-center justify-between">
                    <span>Record ID:</span>
                    <span className="font-mono text-[11px] text-foreground font-semibold">{row.name || row.rawKey || row.rawId || row.id || "—"}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>ERP Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Synced with Frappe</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-border flex items-center gap-2">
              <button onClick={onDelete}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold transition">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button onClick={onDuplicate}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button onClick={onEdit}
                className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const SELECT_OPTIONS_MAP: Record<string, { label: string; value: string }[]> = {
  warehouse: [
    { label: "Oxigen Warehouse - O (Default)", value: "Oxigen Warehouse - O" },
    { label: "Finished Goods - O", value: "Finished Goods - O" },
    { label: "Stores - O", value: "Stores - O" },
    { label: "All Warehouses - O", value: "All Warehouses - O" },
  ],
  stock_uom: [
    { label: "Nos (Units / Pieces)", value: "Nos" },
    { label: "Box", value: "Box" },
    { label: "Bottle", value: "Bottle" },
    { label: "Unit", value: "Unit" },
    { label: "Pack", value: "Pack" },
    { label: "Kg", value: "Kg" },
    { label: "Gram", value: "Gram" },
    { label: "Liter", value: "Liter" },
  ],
  uom: [
    { label: "Nos (Units / Pieces)", value: "Nos" },
    { label: "Box", value: "Box" },
    { label: "Bottle", value: "Bottle" },
    { label: "Unit", value: "Unit" },
    { label: "Pack", value: "Pack" },
    { label: "Kg", value: "Kg" },
  ],
  status: [
    { label: "Active", value: "Active" },
    { label: "Draft", value: "Draft" },
    { label: "To Deliver and Bill", value: "To Deliver and Bill" },
    { label: "Completed", value: "Completed" },
    { label: "In stock", value: "In stock" },
    { label: "Out of stock", value: "Out of stock" },
    { label: "Enabled", value: "Enabled" },
    { label: "Disabled", value: "Disabled" },
    { label: "Open", value: "Open" },
    { label: "Cancelled", value: "Cancelled" },
  ],
  customer_group: [
    { label: "Individual", value: "Individual" },
    { label: "Commercial", value: "Commercial" },
    { label: "Non Profit", value: "Non Profit" },
    { label: "Government", value: "Government" },
  ],
  territory: [
    { label: "Pakistan", value: "Pakistan" },
    { label: "All Territories", value: "All Territories" },
    { label: "International", value: "International" },
  ],
  user_type: [
    { label: "System User", value: "System User" },
    { label: "Website User", value: "Website User" },
  ],
  entry_type: [
    { label: "Material Receipt (Add Stock via Purchase Invoice)", value: "Material Receipt" },
    { label: "Material Issue (Deduct Stock)", value: "Material Issue" },
    { label: "Stock Adjustment", value: "Stock Adjustment" },
  ],
  currency: [
    { label: "PKR (Pakistani Rupee)", value: "PKR" },
    { label: "USD (US Dollar)", value: "USD" },
    { label: "EUR (Euro)", value: "EUR" },
    { label: "GBP (British Pound)", value: "GBP" },
    { label: "AED (UAE Dirham)", value: "AED" },
    { label: "SAR (Saudi Riyal)", value: "SAR" },
  ],
  price_list: [
    { label: "Standard Selling", value: "Standard Selling" },
    { label: "Standard Buying", value: "Standard Buying" },
  ],
  payment_method: [
    { label: "Cash on Delivery", value: "Cash on Delivery" },
    { label: "Bank Transfer", value: "Bank Transfer" },
    { label: "Credit / Debit Card", value: "Credit Card" },
    { label: "Online Payment", value: "Online" },
  ],
  is_group: [
    { label: "No (Leaf / Subcategory)", value: "0" },
    { label: "Yes (Parent Category Group)", value: "1" },
  ],
};

function RecordModal({
  open, onClose, mode, title, columns, initial, onSave, itemGroups,
}: {
  open: boolean; onClose: () => void; mode: "create" | "edit"; title: string;
  columns: Column[]; initial?: Row | null; onSave: (r: Row) => void;
  itemGroups?: ItemGroup[];
}) {
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const seed: Row = {};
      columns.forEach((c) => { seed[c.key] = initial?.[c.key] ?? ""; });
      setForm(seed);
      setSaving(false);
    }
  }, [open, initial, columns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg glass-strong border border-border rounded-2xl shadow-elegant overflow-hidden bg-card text-foreground">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {mode === "create" ? "Create new in ERPNext" : "Edit in ERPNext"}
                  </div>
                  <div className="font-display text-lg font-bold mt-0.5 text-foreground">{title}</div>
                </div>
                <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
                {columns.map((c) => {
                  if (c.key === "item_count" || c.key === "is_group_label") return null;

                  if (mode === "edit" && (c.key === "id" || c.key === "rawKey" || c.key === "sku")) {
                    return (
                      <label key={c.key} className="block opacity-70">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label} (Read-only)</span>
                        <input
                          disabled
                          value={String(form[c.key] ?? "")}
                          className="w-full h-10 px-3.5 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground outline-none"
                        />
                      </label>
                    );
                  }

                  // Dynamic select for category / item_group
                  if (c.key === "item_group" && itemGroups && itemGroups.length > 0) {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <select
                          value={String(form[c.key] || itemGroups[0]?.name || "General")}
                          onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          {itemGroups.map((g) => (
                            <option key={g.name} value={g.item_group_name || g.name} className="bg-card text-foreground py-1.5">
                              {g.item_group_name || g.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  // Dynamic select for parent category
                  if (c.key === "parent" && itemGroups && itemGroups.length > 0) {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <select
                          value={String(form[c.key] || "All Item Groups")}
                          onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="All Item Groups" className="bg-card text-foreground py-1.5">All Item Groups</option>
                          {itemGroups.map((g) => (
                            <option key={g.name} value={g.item_group_name || g.name} className="bg-card text-foreground py-1.5">
                              {g.item_group_name || g.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  // Predefined Select Dropdowns
                  const fieldKey = c.key.toLowerCase();
                  const predefined = SELECT_OPTIONS_MAP[fieldKey] || SELECT_OPTIONS_MAP[c.key];
                  if (predefined) {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <select
                          value={String(form[c.key] || predefined[0]?.value || "")}
                          onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          {predefined.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-card text-foreground py-1.5">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label key={c.key} className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                      <input
                        value={String(form[c.key] ?? "")}
                        onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        placeholder={`Enter ${c.label.toLowerCase()}`}
                      />
                    </label>
                  );
                })}
              </form>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/30">
                <button onClick={onClose}
                  className="h-9 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition">Cancel</button>
                <button onClick={handleSubmit} disabled={saving}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-50 transition hover:opacity-95">
                  <Check className="h-3.5 w-3.5" /> {mode === "create" ? "Create Record" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function downloadCSV(name: string, columns: Column[], rows: Row[]) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    columns.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-erp.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
 * Live Interactive Table Page Connected to ERP
 * ============================================================ */
function LiveTablePage({
  slug, icon, title, meta,
}: { slug: string; icon: LucideIcon; title: string; meta: PageMeta }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(meta.filters[0] || "All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const perPage = 10;

  const [drawer, setDrawer] = useState<{ open: boolean; row: Row | null; index: number }>({ open: false, row: null, index: -1 });
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; row: Row | null; index: number }>({
    open: false, mode: "create", row: null, index: -1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Pre-fetch Item Groups for category selectors and references
      const groupsRes = await getItemGroups().catch(() => ({ data: [] }));
      setItemGroups(groupsRes.data || []);

      if (slug === "products") {
        const res = await getItems({ limit: 200, _t: String(Date.now()) });
        const mapped = (res.data || []).map((it) => ({
          rawKey: it.item_code || it.name,
          name: it.item_name || it.item_code,
          sku: it.item_code || it.name,
          item_group: it.item_group || "General",
          price: `PKR ${(it.standard_rate || it.valuation_rate || 0).toLocaleString()}`,
          rawPrice: it.standard_rate || it.valuation_rate || 0,
          stock: it.custom_stock_qty ?? it.stock_qty ?? 0,
          status: (it.custom_stock_qty ?? it.stock_qty ?? 0) > 0 ? "Active" : "Out of stock",
          description: it.description || "",
        }));
        setRows(mapped);
      } else if (slug === "orders") {
        const res = await getAdminOrders();
        const mapped = (res.data || []).map((o) => ({
          rawKey: o.name,
          id: `#${o.name}`,
          rawId: o.name,
          customer: o.customer_name || o.customer || o.owner || "Customer",
          total: `PKR ${(Number(o.grand_total) || 0).toLocaleString()}`,
          rawTotal: Number(o.grand_total) || 0,
          status: o.status || "Draft",
          date: o.transaction_date || "—",
        }));
        setRows(mapped);
      } else if (slug === "categories" || slug === "collections") {
        const [groupsListRes, itemsRes] = await Promise.all([
          getItemGroups(),
          getItems({ limit: 500 }).catch(() => ({ data: [] })),
        ]);
        const items = itemsRes.data || [];
        const groupCounts = new Map<string, number>();
        for (const it of items) {
          if (it.item_group) {
            groupCounts.set(it.item_group, (groupCounts.get(it.item_group) || 0) + 1);
          }
        }
        const mapped = (groupsListRes.data || []).map((g) => ({
          rawKey: g.name,
          name: g.item_group_name || g.name,
          item_count: `${groupCounts.get(g.item_group_name || g.name) || 0} products`,
          parent: g.parent_item_group || "All Item Groups",
          is_group: g.is_group ? "1" : "0",
          is_group_label: g.is_group ? "Parent Group" : "Subcategory",
          description: g.description || "—",
          image: g.image || null,
        }));
        setRows(mapped);
      } else if (slug === "customers") {
        const res = await getAdminCustomers();
        const mapped = (res.data || []).map((c) => ({
          rawKey: c.name,
          customer_name: c.customer_name || c.name,
          email_id: c.email_id || "—",
          mobile_no: c.mobile_no || "—",
          customer_group: c.customer_group || "Individual",
          territory: c.territory || "Pakistan",
        }));
        setRows(mapped);
      } else if (slug === "inventory") {
        const res = await getAdminInventory();
        const mapped = (res.data || []).map((inv: any) => ({
          rawKey: `${inv.item_code}-${inv.warehouse}`,
          sku: inv.item_code,
          name: inv.item_name || inv.item_code,
          item_group: inv.item_group || "General",
          warehouse: inv.warehouse || "Oxigen Warehouse - O",
          actual_qty: inv.actual_qty ?? 0,
          reserved_qty: inv.reserved_qty ?? 0,
          available_qty: inv.available_qty ?? 0,
          stock_uom: inv.stock_uom || "Nos",
          status: inv.in_stock ? "In stock" : "Out of stock",
        }));
        setRows(mapped);
      } else if (slug === "discounts") {
        const res = await getAdminDiscounts();
        const mapped = (res.data || []).map((d) => ({
          rawKey: d.name,
          item_code: d.item_code || d.name,
          price_list: d.price_list || "Standard Selling",
          price_list_rate: `PKR ${(d.price_list_rate || 0).toLocaleString()}`,
          rawRate: d.price_list_rate || 0,
          currency: d.currency || "PKR",
        }));
        setRows(mapped);
      } else if (slug === "team") {
        const res = await getAdminUsers();
        const mapped = (res.data || []).map((u) => ({
          rawKey: u.name,
          full_name: u.full_name || u.email,
          email: u.email,
          user_type: u.user_type || "System User",
          status: u.enabled ? "Enabled" : "Disabled",
        }));
        setRows(mapped);
      } else if (slug === "shipping") {
        const res = await getErpResource("Warehouse");
        const mapped = (res.data || []).map((w: any) => ({
          rawKey: w.name,
          name: w.warehouse_name || w.name,
          company: w.company || "Oxigen",
          status: w.disabled ? "Disabled" : "Active",
        }));
        setRows(mapped);
      } else {
        // Generic ERP doctype
        const doctype = title.replace(/s$/, "");
        const res = await getErpResource(doctype).catch(() => ({ data: [] }));
        setRows((res.data || []).map((d: any) => ({ ...d, rawKey: d.name })));
      }
    } catch (err) {
      console.error(`Failed to load ${slug}:`, err);
      pushToast("error", `Failed to load ${title} from ERPNext`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  // Derived statistics for the StatsRow
  const stats: Stat[] = useMemo(() => {
    const total = rows.length;
    const activeCount = rows.filter((r) => {
      const s = String(r.status ?? r.is_group_label ?? "").toLowerCase();
      return s.includes("active") || s.includes("enabled") || s.includes("deliver") || s.includes("in stock") || s.includes("parent");
    }).length;

    return [
      { label: `Total ${title}`, value: String(total) },
      { label: "Active in ERP", value: String(activeCount || total) },
      { label: "Sync status", value: "Real-time", delta: "Live", trend: "up" },
      { label: "Source", value: "ERPNext API" },
    ];
  }, [rows, title]);

  const filtered = useMemo(() => {
    let out = rows;
    if (active && active !== "All") {
      out = out.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(active.toLowerCase())));
    }
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    for (const [k, v] of Object.entries(colFilters)) {
      if (!v) continue;
      const lv = v.toLowerCase();
      out = out.filter((r) => String(r[k] ?? "").toLowerCase().includes(lv));
    }
    return out;
  }, [rows, active, query, colFilters]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const singular = (typeof title === "string" ? title : String(title)).replace(/s$/, "");

  const handleAction = async (a: RowAction, r: Row, idx: number) => {
    if (a === "view") {
      setDrawer({ open: true, row: r, index: idx });
      return;
    }
    if (a === "edit") {
      setModal({ open: true, mode: "edit", row: r, index: idx });
      return;
    }
    if (a === "duplicate") {
      try {
        const copyPayload = { ...r };
        delete copyPayload.rawKey;
        delete copyPayload.name;
        delete copyPayload.id;

        if (slug === "products") {
          await createItem({
            item_name: `${r.name} (Copy)`,
            item_group: r.item_group || "General",
            standard_rate: Number(String(r.price).replace(/[^0-9.]/g, "")) || 0,
            stock_uom: "Nos",
          });
        } else if (slug === "categories" || slug === "collections") {
          await createItemGroup({
            item_group_name: `${r.name} Copy`,
            parent_item_group: r.parent || "All Item Groups",
            is_group: r.is_group === "1" ? 1 : 0,
          });
        } else if (slug === "customers") {
          await createAdminCustomer({
            customer_name: `${r.customer_name} (Copy)`,
            email_id: `copy-${Date.now()}@example.com`,
          });
        } else if (slug === "inventory") {
          pushToast("info", "Inventory records are synced from ERPNext Bin doctype");
          return;
        } else {
          await createErpDoc(singular, copyPayload);
        }
        pushToast("success", `${singular} duplicated in ERPNext`);
        loadData();
      } catch (err: any) {
        pushToast("error", err.message || `Failed to duplicate ${singular}`);
      }
      return;
    }
    if (a === "delete") {
      const recordName = r.rawKey || r.name || r.id || r.rawId;
      try {
        if (slug === "products") {
          await deleteItem(recordName);
        } else if (slug === "orders") {
          await deleteAdminOrder(r.rawId || recordName.replace(/^#/, ""));
        } else if (slug === "categories" || slug === "collections") {
          await deleteItemGroup(recordName);
        } else if (slug === "customers") {
          await deleteAdminCustomer(recordName);
        } else if (slug === "discounts") {
          await deleteAdminDiscount(recordName);
        } else if (slug === "team") {
          await deleteAdminUser(recordName);
        } else if (slug === "inventory") {
          pushToast("info", "Adjust stock quantity via Material Issue/Receipt instead of deletion");
          return;
        } else {
          await deleteErpDoc(singular, recordName);
        }
        pushToast("success", `${singular} deleted from ERPNext`);
        loadData();
      } catch (err: any) {
        pushToast("error", err.message || `Failed to delete ${singular}`);
      }
    }
  };

  const handleSave = async (formData: Row) => {
    try {
      if (modal.mode === "create") {
        if (slug === "products") {
          await createItem({
            item_name: formData.name || formData.sku,
            item_group: formData.item_group || "General",
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")) || 0,
            stock_qty: Number(formData.stock) || 0,
            stock_uom: "Nos",
            description: formData.description || "",
            publish: true,
          });
        } else if (slug === "orders") {
          await createAdminOrder({
            customer: formData.customer,
            delivery_date: formData.date || new Date().toISOString().split("T")[0],
            items: [
              {
                item_code: formData.sku || formData.name || "Nutri-Cept — Women's Wellness",
                qty: Number(formData.qty) || 1,
                rate: Number(String(formData.total || "").replace(/[^0-9.]/g, "")) || 1000,
              },
            ],
          });
        } else if (slug === "categories" || slug === "collections") {
          await createItemGroup({
            item_group_name: formData.name,
            parent_item_group: formData.parent || "All Item Groups",
            is_group: formData.is_group === "1" || formData.is_group_label?.includes("Parent") ? 1 : 0,
            description: formData.description || "",
          });
        } else if (slug === "customers") {
          await createAdminCustomer({
            customer_name: formData.customer_name || formData.name,
            email_id: formData.email_id || "",
            mobile_no: formData.mobile_no || "",
            customer_group: formData.customer_group || "Individual",
            territory: formData.territory || "Pakistan",
          });
        } else if (slug === "inventory") {
          await adjustAdminInventory({
            item_code: formData.sku || formData.name,
            warehouse: formData.warehouse || "Oxigen Warehouse - O",
            qty: Number(formData.actual_qty ?? formData.qty ?? formData.stock) || 0,
            entry_type: "Stock Reconciliation",
            mode: "set",
          });
        } else if (slug === "discounts") {
          await createAdminDiscount({
            item_code: formData.item_code || formData.name,
            price_list_rate: Number(String(formData.price_list_rate || "").replace(/[^0-9.]/g, "")) || 0,
            price_list: formData.price_list || "Standard Selling",
          });
        } else if (slug === "team") {
          await createAdminUser({
            email: formData.email,
            first_name: formData.full_name || formData.email.split("@")[0],
            user_type: formData.user_type || "System User",
          });
        } else {
          await createErpDoc(singular, formData);
        }
        pushToast("success", `${singular} created in ERPNext`);
      } else {
        // Edit mode
        const recordName = modal.row?.rawKey || modal.row?.name || modal.row?.id || modal.row?.rawId;
        if (slug === "products") {
          await updateItem(recordName, {
            item_name: formData.name,
            item_group: formData.item_group,
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")),
            description: formData.description,
          });
          if (formData.stock !== undefined && formData.stock !== null && formData.stock !== "") {
            await adjustAdminInventory({
              item_code: recordName,
              warehouse: "Oxigen Warehouse - O",
              qty: Number(formData.stock) || 0,
              entry_type: "Stock Reconciliation",
              mode: "set",
            }).catch(() => {});
          }
        } else if (slug === "orders") {
          await updateAdminOrder(modal.row?.rawId || recordName.replace(/^#/, ""), {
            status: formData.status,
            delivery_date: formData.date,
          });
        } else if (slug === "categories" || slug === "collections") {
          await updateItemGroup(recordName, {
            item_group_name: formData.name,
            parent_item_group: formData.parent,
            description: formData.description,
          });
        } else if (slug === "customers") {
          await updateAdminCustomer(recordName, {
            customer_name: formData.customer_name,
            email_id: formData.email_id,
            mobile_no: formData.mobile_no,
            territory: formData.territory,
          });
        } else if (slug === "inventory") {
          await adjustAdminInventory({
            item_code: modal.row?.sku || modal.row?.name || formData.sku || formData.name,
            warehouse: formData.warehouse || modal.row?.warehouse || "Oxigen Warehouse - O",
            qty: Number(formData.actual_qty ?? formData.qty ?? formData.stock) || 0,
            entry_type: "Stock Reconciliation",
            mode: "set",
          });
        } else if (slug === "team") {
          await updateAdminUser(recordName, {
            full_name: formData.full_name,
            user_type: formData.user_type,
          });
        } else {
          await updateErpDoc(singular, recordName, formData);
        }
        pushToast("success", `${singular} updated in ERPNext`);
      }
      setModal({ open: false, mode: "create", row: null, index: -1 });
      loadData();
    } catch (err: any) {
      pushToast("error", err.message || `Failed to save ${singular}`);
    }
  };

  return (
    <div className="space-y-6" key={slug}>
      <ToastHost />
      <Breadcrumb label={title} />
      <PageHeader
        icon={icon} title={title} subtitle={meta.subtitle} primaryAction={meta.primaryAction}
        onPrimary={() => setModal({ open: true, mode: "create", row: null, index: -1 })}
        onRefresh={loadData} loading={loading}
        onExport={() => { downloadCSV(slug, meta.columns, filtered); pushToast("info", `Exported ${filtered.length} rows`); }}
      />
      <StatsRow stats={stats} />
      <Toolbar
        filters={meta.filters} active={active} onActive={(f) => { setActive(f); setPage(1); }}
        query={query} onQuery={(q) => { setQuery(q); setPage(1); }}
        filtersOpen={filtersOpen} onFiltersToggle={() => setFiltersOpen((o) => !o)}
      />

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Fetching live data from ERPNext...</span>
        </div>
      ) : paged.length ? (
        <>
          <DataTable
            columns={meta.columns} rows={paged}
            onRowClick={(r) => setDrawer({ open: true, row: r, index: rows.indexOf(r) })}
            onAction={handleAction}
          />
          <Pagination page={page} pages={pages} onPage={setPage} />
        </>
      ) : (
        <EmptyState
          title={meta.emptyTitle}
          desc={meta.emptyDesc}
          action={meta.primaryAction}
          onAction={() => setModal({ open: true, mode: "create", row: null, index: -1 })}
        />
      )}

      <DetailDrawer
        open={drawer.open} onClose={() => setDrawer({ open: false, row: null, index: -1 })}
        row={drawer.row} columns={meta.columns} title={singular}
        onEdit={() => {
          const r = drawer.row; const i = drawer.index;
          setDrawer({ open: false, row: null, index: -1 });
          setModal({ open: true, mode: "edit", row: r, index: i });
        }}
        onDuplicate={() => { if (drawer.row) { handleAction("duplicate", drawer.row, drawer.index); setDrawer({ open: false, row: null, index: -1 }); } }}
        onDelete={() => { if (drawer.row) { handleAction("delete", drawer.row, drawer.index); setDrawer({ open: false, row: null, index: -1 }); } }}
      />

      <RecordModal
        open={modal.open} mode={modal.mode}
        onClose={() => setModal({ open: false, mode: "create", row: null, index: -1 })}
        title={singular} columns={meta.columns} initial={modal.row}
        onSave={handleSave}
        itemGroups={itemGroups}
      />
    </div>
  );
}

/* ============================================================
 * Analytics Page (Live ERP Computation)
 * ============================================================ */
function AnalyticsPage() {
  const item = findItem("analytics")!;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setStats(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const spark = stats?.monthlyRevenue?.length ? stats.monthlyRevenue : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...spark, 1);

  const channels = [
    { name: "Direct ERP Sales", pct: 54, color: "bg-primary" },
    { name: "Website Orders", pct: 32, color: "bg-emerald-400" },
    { name: "Customer Portal", pct: 14, color: "bg-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb label="Analytics" />
      <PageHeader icon={item.icon} title="Analytics" subtitle="Real-time revenue and sales order metrics from ERPNext." primaryAction="Export report"
        onPrimary={() => pushToast("info", "Generating ERP analytics report…")}
        onExport={() => pushToast("success", "Analytics snapshot exported")} />
      
      <StatsRow stats={[
        { label: "Gross Revenue", value: `PKR ${(stats?.revenue || 0).toLocaleString()}`, delta: "Live", trend: "up" },
        { label: "Total Orders", value: String(stats?.ordersCount || 0), delta: "+100%", trend: "up" },
        { label: "Customers", value: String(stats?.customersCount || 0) },
        { label: "Catalog Products", value: String(stats?.productsCount || 0) },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl glass-strong border border-white/[0.08] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">12-Month Revenue</div>
              <div className="font-display text-2xl font-semibold tracking-tight mt-1">
                PKR {(stats?.revenue || 0).toLocaleString()}
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">ERP Sales Order Sync</span>
          </div>
          <div className="mt-5 h-48 flex items-end gap-1.5">
            {spark.map((v, i) => (
              <motion.div key={i}
                initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: [0.22,1,0.36,1] }}
                className="flex-1 rounded-t-md bg-primary-gradient/70 hover:bg-primary-gradient shadow-glow"
                title={`${stats?.monthLabels?.[i] || i}: PKR ${v.toLocaleString()}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-12 mt-2 text-[10px] text-muted-foreground text-center">
            {(stats?.monthLabels || ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]).map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl glass-strong border border-white/[0.08] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">Sales by Channel</div>
          <div className="mt-4 space-y-3">
            {channels.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                    className={cn("h-full rounded-full", c.color)} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="rounded-2xl glass-strong border border-white/[0.08] p-5">
        <div className="text-sm font-medium mb-3">Top selling catalog items in ERP</div>
        <div className="divide-y divide-white/[0.05]">
          {(stats?.topProducts || []).map((p) => (
            <div key={p.code} className="flex items-center justify-between py-2.5 text-xs">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">{p.stock} units available</span>
              <span className="text-foreground font-semibold">PKR {p.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Media Library (Live ERP Next Files)
 * ============================================================ */
function MediaLibraryPage() {
  const item = findItem("media")!;
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFiles = () => {
    setLoading(true);
    getAdminFiles()
      .then((res) => setFiles(res.data || []))
      .catch(() => pushToast("error", "Failed to load files from ERPNext"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const triggerUpload = () => fileRef.current?.click();
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      try {
        await uploadAdminFile(fileList[i]);
        pushToast("success", `${fileList[i].name} uploaded to ERPNext`);
      } catch (err: any) {
        pushToast("error", err.message || "Failed to upload file");
      }
    }
    loadFiles();
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <ToastHost />
      <Breadcrumb label="Media Library" />
      <PageHeader icon={item.icon} title="Media Library" subtitle="Files, images and attachments stored in ERPNext." primaryAction="Upload file"
        onPrimary={triggerUpload}
        onRefresh={loadFiles} loading={loading}
        onExport={() => pushToast("info", "Media manifest exported")} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />

      <StatsRow stats={[
        { label: "ERP Assets", value: String(files.length) },
        { label: "Storage", value: "ERPNext Attachments" },
        { label: "Status", value: "Synced", delta: "Active", trend: "up" },
        { label: "Upload Mode", value: "Direct Frappe API" },
      ]} />

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Loading files from ERPNext...</span>
        </div>
      ) : files.length === 0 ? (
        <EmptyState title="No files uploaded yet" desc="Upload images and documents directly to ERPNext file storage." action="Upload first file" onAction={triggerUpload} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((f, i) => (
            <motion.div key={f.name || i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ y: -3 }}
              onClick={() => {
                if (f.file_url) window.open(f.file_url, "_blank");
                else pushToast("info", `File: ${f.file_name || f.name}`);
              }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 glass cursor-pointer p-3 flex flex-col justify-between"
            >
              <div className="h-full w-full flex items-center justify-center rounded-xl bg-white/[0.04] overflow-hidden">
                {f.file_url && (f.file_url.endsWith(".jpg") || f.file_url.endsWith(".jpeg") || f.file_url.endsWith(".png") || f.file_url.endsWith(".webp")) ? (
                  <img src={f.file_url} alt={f.file_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-mono text-muted-foreground">📄</span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-white/90 truncate font-medium">
                {f.file_name || f.name}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
