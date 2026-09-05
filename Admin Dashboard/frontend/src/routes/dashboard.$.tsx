import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight, Search, SlidersHorizontal, Download, Plus, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronLeft, Sparkles, RefreshCw,
  Eye, Pencil, Trash2, X, Check, AlertCircle, ImagePlus, AlertTriangle,
  CreditCard, RotateCcw, Banknote,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { findItem, NAV } from "@/components/dashboard/nav-config";
import { cn } from "@/lib/utils";
import {
  getItems, getItemDetail, createItem, updateItem, deleteItem,
  getItemGroups, createItemGroup, updateItemGroup, deleteItemGroup,
  getAdminOrders, getAdminOrderDetail, createAdminOrder, updateAdminOrder, deleteAdminOrder,
  getPaymentModes, paymentAdminOrder, returnAdminOrder, type PaymentMode,
  getAdminCustomers, createAdminCustomer, updateAdminCustomer, deleteAdminCustomer,
  getAdminInventory, adjustAdminInventory,
  getAdminDiscounts, createAdminDiscount, updateAdminDiscount, deleteAdminDiscount,
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getAdminFiles, uploadAdminFile, deleteAdminFile,
  getErpResource, createErpDoc, updateErpDoc, deleteErpDoc,
  getAdminBanners, createAdminBanner, updateAdminBanner, deleteAdminBanner,
  getDashboardStats, getItemImageUrl, type DashboardStats, type ItemGroup, type Item, type Banner, type BannerProduct,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/dashboard/$")({
  component: DashboardCatchAll,
});

/* ============================================================
 * Toast system
 * ============================================================ */
type Toast = { id: number; kind: "success" | "error" | "info" | "warning"; text: string };
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

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const custom = event as CustomEvent<{ title?: string; body?: string; category?: string }>; 
      const detail = custom.detail ?? {};
      const text = detail.title ? `${detail.title}: ${detail.body ?? ""}`.trim() : detail.body ?? "New update";
      pushToast("info", text);
    };

    window.addEventListener("oxigen:new-notification", handleCustom);
    return () => window.removeEventListener("oxigen:new-notification", handleCustom);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4 pb-safe">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-xl glass-strong border border-white/10 px-4 py-2.5 text-xs shadow-glow">
            {t.kind === "success" && <Check className="h-3.5 w-3.5 text-emerald-300" />}
            {t.kind === "error" && <AlertCircle className="h-3.5 w-3.5 text-rose-300" />}
            {t.kind === "info" && <Sparkles className="h-3.5 w-3.5 text-primary" />}
            {t.kind === "warning" && <AlertCircle className="h-3.5 w-3.5 text-amber-300" />}
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
type Column = { key: string; label: string; className?: string; type?: "text" | "number" | "select" | "textarea" | "date" | "toggle"; hidden?: boolean };
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
    subtitle: "Real-time product catalog and online publishing status.",
    primaryAction: "Add product",
    filters: ["All", "Enable", "Disable"],
    columns: [
      { key: "name", label: "Product Name" },
      { key: "sku", label: "Item Code / SKU" },
      { key: "item_group", label: "Category" },
      { key: "price", label: "Price" },
      { key: "stock", label: "Website Stock" },
      { key: "status", label: "Status", type: "toggle", className: "text-right" },
      { key: "image", label: "Image", hidden: true },
      // { key: "imageUrl", label: "Image URL", hidden: true },
      { key: "short_description", label: "Short Description", type: "textarea", hidden: true },
      { key: "web_long_description", label: "Long Description (Website)", type: "textarea", hidden: true },
    ],
    emptyTitle: "No products found",
    emptyDesc: "Add your first product to sync it directly to the catalog.",
  },

  orders: {
    subtitle: "Manage and fulfill sales orders.",
    primaryAction: "",
    filters: ["All", "To Deliver and Bill", "Unpaid", "Draft", "Completed", "Cancelled"],
    columns: [
      { key: "id", label: "Order ID" },
      { key: "customer", label: "Customer" },
      { key: "total", label: "Grand Total" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date", className: "text-right" },
    ],
    emptyTitle: "No orders found",
    emptyDesc: "No sales order records are available right now.",
  },

  categories: {
    subtitle: "Item Groups & product categories synced live.",
    primaryAction: "New category",
    filters: ["All", "Parent Group", "Subcategory"],
    columns: [
      { key: "name", label: "Category Name" },
      { key: "item_count", label: "Products Count" },
      { key: "parent", label: "Parent Category" },
      { key: "is_group_label", label: "Type" },
      { key: "description", label: "Description" },
    ],
    emptyTitle: "No categories found",
    emptyDesc: "Create an Item Group to organize your products.",
  },

  collections: {
    subtitle: "Product collections & item groups synced live.",
    primaryAction: "New collection",
    filters: ["All", "Parent Group", "Subcategory"],
    columns: [
      { key: "name", label: "Collection / Category Name" },
      { key: "item_count", label: "Products Count" },
      { key: "parent", label: "Parent Category" },
      { key: "is_group_label", label: "Type" },
      { key: "description", label: "Description" },
    ],
    emptyTitle: "No collections found",
    emptyDesc: "Create an Item Group to organize your products.",
  },

  customers: {
    subtitle: "Customer accounts and contacts stored securely.",
    primaryAction: "",
    filters: ["All", "Individual", "Commercial"],
    columns: [
      { key: "customer_name", label: "Customer Name" },
      { key: "email_id", label: "Email" },
      { key: "mobile_no", label: "Phone" },
      { key: "customer_group", label: "Group" },
      { key: "territory", label: "Territory", className: "text-right" },
    ],
    emptyTitle: "No customers found",
    emptyDesc: "Add your first customer to start tracking orders and history.",
  },

  inventory: {
    subtitle: "Main Stores & Oxigen Warehouse inventory levels, reserved stock, and available units.",
    primaryAction: "Add product",
    filters: ["All", "In stock", "Out of stock"],
    columns: [
      { key: "sku", label: "Item Code" },
      { key: "name", label: "Item Name" },
      { key: "item_group", label: "Category" },
      { key: "warehouse", label: "Warehouse" },
      { key: "actual_qty", label: "Actual Stock" },
      { key: "reserved_qty", label: "Reserved (Orders)" },
      { key: "available_qty", label: "Website Stock" },
      { key: "stock_uom", label: "UOM" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No inventory records in Oxigen Warehouse",
    emptyDesc: "Stock records will show up automatically when Items and Bins are active.",
  },

  discounts: {
    subtitle: "Pricing rules for website discounts.",
    primaryAction: "Add pricing rule",
    filters: ["All", "Active", "Expired", "Archived"],
    columns: [
      { key: "title", label: "Title" },
      { key: "item_code", label: "Item Code" },
      { key: "type", label: "Type" },
      { key: "value", label: "Value" },
      { key: "priority", label: "Priority" },
      { key: "valid_from", label: "Valid From" },
      { key: "valid_upto", label: "Valid To" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No pricing rules configured",
    emptyDesc: "Add pricing rules to show discounts on your website products.",
  },

  team: {
    subtitle: "Users and team access control.",
    primaryAction: "Invite user",
    filters: ["All", "Enabled", "Disabled"],
    columns: [
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "user_type", label: "Role / Type" },
      { key: "status", label: "Status", className: "text-right" },
    ],
    emptyTitle: "No team members found",
    emptyDesc: "Invite users and system members directly.",
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
    emptyDesc: "Define shipping carriers and warehouse zones.",
  },
};

/* ============================================================
 * Filter Configuration - Maps filter buttons to actual field values
 * ============================================================ */
type FilterConfig = {
  field: string;
  mapping: Record<string, string>;
};

const FILTER_CONFIG: Record<string, FilterConfig> = {
  products: {
    field: "status",
    mapping: {
      "Enable": "Enable",
      "Disable": "Disable",
    }
  },
  orders: {
    field: "status",
    mapping: {
      "To Deliver and Bill": "To Deliver and Bill",
      "Unpaid": "Unpaid",
      "Draft": "Draft",
      "Completed": "Completed",
      "Cancelled": "Cancelled",
    }
  },
  categories: {
    field: "is_group_label",
    mapping: {
      "Parent Group": "Parent Group",
      "Subcategory": "Subcategory",
    }
  },
  collections: {
    field: "is_group_label",
    mapping: {
      "Parent Group": "Parent Group",
      "Subcategory": "Subcategory",
    }
  },
  customers: {
    field: "customer_group",
    mapping: {
      "Individual": "Individual",
      "Commercial": "Commercial",
    }
  },
  inventory: {
    field: "status",
    mapping: {
      "In stock": "In stock",
      "Out of stock": "Out of stock",
    }
  },
  discounts: {
    field: "status",
    mapping: {
      "Active": "Active",
      "Expired": "Expired",
      "Archived": "Archived",
    }
  },
  team: {
    field: "status",
    mapping: {
      "Enabled": "Enabled",
      "Disabled": "Disabled",
    }
  },
};

/* ============================================================
 * Advanced Filter System - Types & Configurations
 * ============================================================ */
type FilterFieldType = 
  | "text"           // Text input (contains/equals)
  | "select"         // Dropdown (single select)
  | "number"         // Number input
  | "range"          // Min/Max number range
  | "daterange";     // Date range (from/to)

type FilterOperator = 
  | "equals" 
  | "contains" 
  | "startsWith" 
  | "gt" | "gte" 
  | "lt" | "lte" 
  | "between";

interface AdvancedFilterConfig {
  field: string;
  label: string;
  type: FilterFieldType;
  operator: FilterOperator;
  options?: string[];      // For select fields
  placeholder?: string;
  hidden?: boolean;        // Don't show in advanced filters
}

interface FilterValue {
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any;           // For range filters (max value)
}

const ADVANCED_FILTER_CONFIGS: Record<string, AdvancedFilterConfig[]> = {
  products: [
    { field: "name", label: "Product Name", type: "text", operator: "contains", placeholder: "Search products..." },
    { field: "sku", label: "Item Code / SKU", type: "text", operator: "contains", placeholder: "Search SKU..." },
    { field: "item_group", label: "Category", type: "select", operator: "equals", options: [] }, // Dynamic from data
    { field: "price", label: "Price Range", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "stock", label: "Stock Range", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "status", label: "Status", type: "select", operator: "equals", options: ["Enable", "Disable"] },
  ],
  
  orders: [
    { field: "id", label: "Order ID", type: "text", operator: "contains", placeholder: "Search order ID..." },
    { field: "customer", label: "Customer", type: "text", operator: "contains", placeholder: "Search customer..." },
    { field: "total", label: "Grand Total Range", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "status", label: "Status", type: "select", operator: "equals", 
      options: ["Unpaid", "To Deliver and Bill", "Draft", "Completed", "Cancelled"] },
    { field: "date", label: "Date Range", type: "daterange", operator: "between" },
  ],
  
  categories: [
    { field: "name", label: "Category Name", type: "text", operator: "contains", placeholder: "Search categories..." },
    { field: "item_count", label: "Products Count", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "parent", label: "Parent Category", type: "text", operator: "contains", placeholder: "Search parent..." },
    { field: "is_group_label", label: "Type", type: "select", operator: "equals", options: ["Parent Group", "Subcategory"] },
  ],
  
  collections: [
    { field: "name", label: "Collection Name", type: "text", operator: "contains", placeholder: "Search collections..." },
    { field: "item_count", label: "Products Count", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "parent", label: "Parent Category", type: "text", operator: "contains", placeholder: "Search parent..." },
    { field: "is_group_label", label: "Type", type: "select", operator: "equals", options: ["Parent Group", "Subcategory"] },
  ],
  
  customers: [
    { field: "customer_name", label: "Customer Name", type: "text", operator: "contains", placeholder: "Search customers..." },
    { field: "email_id", label: "Email", type: "text", operator: "contains", placeholder: "Search email..." },
    { field: "mobile_no", label: "Phone", type: "text", operator: "contains", placeholder: "Search phone..." },
    { field: "customer_group", label: "Group", type: "select", operator: "equals", options: ["Individual", "Commercial"] },
    { field: "territory", label: "Territory", type: "text", operator: "contains", placeholder: "Search territory..." },
  ],
  
  inventory: [
    { field: "sku", label: "Item Code", type: "text", operator: "contains", placeholder: "Search SKU..." },
    { field: "name", label: "Item Name", type: "text", operator: "contains", placeholder: "Search items..." },
    { field: "item_group", label: "Category", type: "select", operator: "equals", options: [] }, // Dynamic
    { field: "warehouse", label: "Warehouse", type: "text", operator: "contains", placeholder: "Search warehouse..." },
    { field: "actual_qty", label: "Actual Stock", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "reserved_qty", label: "Reserved", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "available_qty", label: "Available Stock", type: "range", operator: "between", placeholder: "Min-Max" },
    { field: "status", label: "Status", type: "select", operator: "equals", options: ["In stock", "Out of stock"] },
  ],
  
  discounts: [
    { field: "title", label: "Title", type: "text", operator: "contains", placeholder: "Search titles..." },
    { field: "item_code", label: "Item Code", type: "text", operator: "contains", placeholder: "Search item code..." },
    { field: "type", label: "Type", type: "select", operator: "equals",
      options: ["Discount Percentage", "Discount Amount", "Rate"] },
    { field: "priority", label: "Priority", type: "number", operator: "equals", placeholder: "Priority number" },
    { field: "valid_from", label: "Valid From", type: "daterange", operator: "between" },
    { field: "valid_upto", label: "Valid To", type: "daterange", operator: "between" },
    { field: "status", label: "Status", type: "select", operator: "equals",
      options: ["Active", "Expired", "Archived"] },
  ],
  
  team: [
    { field: "full_name", label: "Full Name", type: "text", operator: "contains", placeholder: "Search names..." },
    { field: "email", label: "Email", type: "text", operator: "contains", placeholder: "Search email..." },
    { field: "user_type", label: "Role / Type", type: "text", operator: "contains", placeholder: "Search role..." },
    { field: "status", label: "Status", type: "select", operator: "equals", options: ["Enabled", "Disabled"] },
  ],
  
  shipping: [
    { field: "name", label: "Name", type: "text", operator: "contains", placeholder: "Search shipping..." },
    { field: "company", label: "Company", type: "text", operator: "contains", placeholder: "Search company..." },
    { field: "status", label: "Status", type: "select", operator: "equals", options: ["Active", "Disabled"] },
  ],
};

// Filter application utility function
function applyFilter(data: Row[], filter: FilterValue): Row[] {
  const { field, operator, value, value2 } = filter;
  
  // Skip if no value provided
  if (value === undefined || value === null || value === "") return data;
  
  return data.filter((row) => {
    const fieldValue = row[field];
    
    switch (operator) {
      case "equals":
        return String(fieldValue) === String(value);
      
      case "contains":
        return String(fieldValue || "").toLowerCase().includes(String(value).toLowerCase());
      
      case "startsWith":
        return String(fieldValue || "").toLowerCase().startsWith(String(value).toLowerCase());
      
      case "gt":
        return Number(fieldValue) > Number(value);
      
      case "gte":
        return Number(fieldValue) >= Number(value);
      
      case "lt":
        return Number(fieldValue) < Number(value);
      
      case "lte":
        return Number(fieldValue) <= Number(value);
      
      case "between": {
        // For numeric ranges
        if (typeof fieldValue === "number" || !isNaN(Number(fieldValue))) {
          const num = Number(fieldValue);
          const min = value !== "" && value !== undefined ? Number(value) : -Infinity;
          const max = value2 !== "" && value2 !== undefined ? Number(value2) : Infinity;
          return num >= min && num <= max;
        }
        // For date ranges
        if (fieldValue && typeof fieldValue === "string") {
          const date = fieldValue.slice(0, 10); // Get YYYY-MM-DD part
          const min = value || "";
          const max = value2 || "9999-12-31";
          return date >= min && date <= max;
        }
        return true;
      }
      
      default:
        return true;
    }
  });
}

// Get unique values from data for dynamic select options
function getUniqueValues(rows: Row[], field: string): string[] {
  const values = new Set<string>();
  rows.forEach(row => {
    const val = row[field];
    if (val !== undefined && val !== null && val !== "") {
      values.add(String(val));
    }
  });
  return Array.from(values).sort();
}

function orderDisplayName(o: { customer_name?: string; customer?: string; owner?: string; shipping?: { title?: string } | null }): string {
  const fallback = o.customer_name || o.customer || o.owner || "Customer";
  const title = o.shipping?.title?.trim();
  if (!title) return fallback;
  const autoMatch = title.match(/^(.*)-\d{10,}$/);
  const isAutoGenerated = !!(autoMatch && o.customer_name && (autoMatch[1].replace(/-/g, " ") === o.customer_name.replace(/\s+/g, " ").trim()));
  return isAutoGenerated ? fallback : title;
}

/* ============================================================
 * Route component: dispatch by slug
 * ============================================================ */
function DashboardCatchAll() {
  const { _splat } = Route.useParams();
  const slug = _splat ?? "";
  const item = findItem(slug);

  if (slug === "analytics") return <AnalyticsPage />;
  if (slug === "media")     return <MediaLibraryPage />;
  if (slug === "banners")   return <BannersPage />;

  const meta = MODULE_META[slug] ?? {
    subtitle: `Manage ${slug}.`,
    primaryAction: `Create ${slug.replace(/s$/, "")}`,
    filters: ["All"],
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "modified", label: "Modified", className: "text-right" },
    ],
    emptyTitle: `No ${slug} found`,
    emptyDesc: `Create an entry to sync directly.`,
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
      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
        <button onClick={onRefresh}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition shadow-sm">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-primary")} /> Refresh
        </button>
        <button onClick={onExport}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-10 sm:h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition shadow-sm">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        {primaryAction && onPrimary && (
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onPrimary}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25">
            <Plus className="h-3.5 w-3.5" /> {primaryAction}
          </motion.button>
        )}
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

function FilterField({
  config, value, onChange, dynamicOptions,
}: {
  config: AdvancedFilterConfig;
  value?: FilterValue;
  onChange: (v: FilterValue | undefined) => void;
  dynamicOptions?: string[];
}) {
  const options = config.options?.length ? config.options : dynamicOptions || [];
  const currentValue = value?.value ?? "";
  const currentValue2 = value?.value2 ?? "";

  if (config.type === "text") {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{config.label}</label>
        <input
          type="text"
          value={currentValue}
          onChange={(e) => {
            if (!e.target.value) { onChange(undefined); return; }
            onChange({ field: config.field, operator: config.operator, value: e.target.value });
          }}
          placeholder={config.placeholder || `Filter by ${config.label.toLowerCase()}...`}
          className="w-full h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>
    );
  }

  if (config.type === "select" && options.length) {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{config.label}</label>
        <select
          value={currentValue}
          onChange={(e) => {
            if (!e.target.value) { onChange(undefined); return; }
            onChange({ field: config.field, operator: config.operator, value: e.target.value });
          }}
          className="w-full h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
        >
          <option value="" className="bg-card text-foreground">All</option>
          {options.map((o) => (
            <option key={o} value={o} className="bg-card text-foreground">{o}</option>
          ))}
        </select>
      </div>
    );
  }

  if (config.type === "number") {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{config.label}</label>
        <input
          type="number"
          value={currentValue}
          onChange={(e) => {
            if (!e.target.value) { onChange(undefined); return; }
            onChange({ field: config.field, operator: config.operator, value: e.target.value });
          }}
          placeholder={config.placeholder || "Enter number..."}
          className="w-full h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>
    );
  }

  if (config.type === "range") {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{config.label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentValue}
            onChange={(e) => {
              if (!e.target.value && !currentValue2) { onChange(undefined); return; }
              onChange({ field: config.field, operator: "between", value: e.target.value, value2: currentValue2 });
            }}
            placeholder="Min"
            className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            value={currentValue2}
            onChange={(e) => {
              if (!currentValue && !e.target.value) { onChange(undefined); return; }
              onChange({ field: config.field, operator: "between", value: currentValue, value2: e.target.value });
            }}
            placeholder="Max"
            className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
      </div>
    );
  }

  if (config.type === "daterange") {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{config.label}</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={currentValue}
            onChange={(e) => {
              if (!e.target.value && !currentValue2) { onChange(undefined); return; }
              onChange({ field: config.field, operator: "between", value: e.target.value, value2: currentValue2 });
            }}
            className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={currentValue2}
            onChange={(e) => {
              if (!currentValue && !e.target.value) { onChange(undefined); return; }
              onChange({ field: config.field, operator: "between", value: currentValue, value2: e.target.value });
            }}
            className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
      </div>
    );
  }

  return null;
}

function ActiveFilterChips({
  filters, config, onRemove,
}: {
  filters: FilterValue[];
  config: AdvancedFilterConfig[];
  onRemove: (field: string) => void;
}) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => {
        const cfg = config.find((c) => c.field === f.field);
        const label = cfg?.label || f.field;
        let display = "";
        if (f.operator === "between" && f.value2 !== undefined && f.value2 !== "") {
          display = `${f.value || "…"} – ${f.value2}`;
        } else {
          display = String(f.value);
        }
        return (
          <span key={f.field}
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
            <span className="text-muted-foreground">{label}:</span> {display}
            <button onClick={() => onRemove(f.field)} className="ml-0.5 hover:text-foreground transition">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}

function AdvancedFilterPanel({
  open, onClose, config, filters, onChange, dynamicData,
}: {
  open: boolean;
  onClose: () => void;
  config: AdvancedFilterConfig[];
  filters: FilterValue[];
  onChange: (f: FilterValue[]) => void;
  dynamicData?: Row[];
}) {
  const [temp, setTemp] = useState<FilterValue[]>(filters);

  const handleFieldChange = (field: string, val: FilterValue | undefined) => {
    setTemp((prev) => {
      if (!val) return prev.filter((f) => f.field !== field);
      const existing = prev.findIndex((f) => f.field === field);
      if (existing >= 0) { const n = [...prev]; n[existing] = val; return n; }
      return [...prev, val];
    });
  };

  const handleApply = () => { onChange(temp); onClose(); };
  const handleClear = () => { setTemp([]); };
  const activeCount = temp.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-elegant p-5 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Advanced Filters</h3>
            <button onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {config.map((cfg) => {
              if (cfg.type === "select" && (!cfg.options || cfg.options.length === 0) && dynamicData) {
                const dynamicOpts = getUniqueValues(dynamicData, cfg.field);
                return (
                  <FilterField
                    key={cfg.field}
                    config={cfg}
                    value={temp.find((f) => f.field === cfg.field)}
                    onChange={(v) => handleFieldChange(cfg.field, v)}
                    dynamicOptions={dynamicOpts}
                  />
  );
}
              return (
                <FilterField
                  key={cfg.field}
                  config={cfg}
                  value={temp.find((f) => f.field === cfg.field)}
                  onChange={(v) => handleFieldChange(cfg.field, v)}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <button onClick={handleClear}
              className="h-9 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition">
              Clear All
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="h-9 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition">
                Cancel
              </button>
              <button onClick={handleApply}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25 transition hover:opacity-95">
                Apply{activeCount ? ` (${activeCount})` : ""}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toolbar({
  filters, active, onActive, query, onQuery, onFiltersToggle, filtersOpen,
  advFilterCount = 0,
}: {
  filters: string[]; active: string; onActive: (f: string) => void;
  query: string; onQuery: (q: string) => void;
  onFiltersToggle?: () => void; filtersOpen?: boolean;
  advFilterCount?: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2 flex-wrap">
      <div className="relative flex-1 min-w-0 sm:min-w-[220px] sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search records…"
          className="w-full h-10 sm:h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <div className="hide-scrollbar flex items-center gap-1 rounded-xl bg-card border border-border p-1 overflow-x-auto max-w-[64vw] sm:max-w-none">
          {filters.map((f) => (
            <button key={f} onClick={() => onActive(f)}
              className={cn(
                "h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition",
                active === f ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={onFiltersToggle}
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center gap-1.5 h-10 sm:h-9 px-3 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition shadow-sm",
            filtersOpen && "bg-secondary text-foreground",
          )}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {advFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              {advFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

type RowAction = "view" | "edit" | "delete" | "payment" | "return";
function renderCellValue(c: Column, r: Row, onToggle?: (key: string, row: Row, checked: boolean) => void) {
  if (c.type === "toggle") {
    const checked = String(r[c.key] ?? "") === "Enable";
    return (
      <span onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={checked}
          onCheckedChange={(newChecked) => onToggle?.(c.key, r, newChecked)}
          className="data-[state=checked]:bg-green-500"
        />
      </span>
    );
  }
  if (c.key === "status" || c.key === "visible" || c.key === "is_group_label") {
    return <StatusPill label={String(r[c.key] ?? "Active")} />;
  }
  return String(r[c.key] ?? "—");
}
function DataTable({
  columns, rows, onRowClick, onAction, onToggle, slug,
}: {
  columns: Column[]; rows: Row[];
  onRowClick?: (r: Row, index: number) => void;
  onAction?: (a: RowAction, r: Row, index: number) => void;
  onToggle?: (key: string, row: Row, checked: boolean) => void;
  slug?: string;
}) {
  if (!rows.length) return null;
  const visibleColumns = columns.filter(c => !c.hidden);
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden md:block rounded-2xl glass-strong border border-border overflow-visible shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {visibleColumns.map((c) => (
                  <th key={c.key}
                    className={cn("px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-bold whitespace-nowrap", c.className)}>
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
                  {visibleColumns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3 text-[13px] font-medium text-foreground align-top", c.className)}>
                      {renderCellValue(c, r, onToggle)}
                    </td>
                  ))}
                  <td className="px-2 text-right align-top">
                    <RowMenu onAction={(a) => onAction?.(a, r, i)} row={r} slug={slug} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {rows.map((r, i) => {
          const titleCol = visibleColumns[0];
          const detailCols = visibleColumns.slice(1);
          const titleValue = r[titleCol?.key] ?? "—";
          const titleImg = r.image || r.imageUrl;
          return (
            <motion.div
              key={r.rawKey || r.name || r.id || i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              onClick={() => onRowClick?.(r, i)}
              className="rounded-2xl bg-card border border-border shadow-sm p-4 cursor-pointer active:bg-secondary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                {titleImg && (
                  <img src={titleImg} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  {titleCol && (
                    <div className="text-sm font-bold text-foreground truncate">{renderCellValue(titleCol, { ...r, [titleCol.key]: titleValue })}</div>
                  )}
                  <div className="mt-1.5 space-y-1.5">
                    {detailCols.map((c) => (
                      <div key={c.key} className="flex items-start justify-between gap-3 text-xs">
                        <span className="shrink-0 text-muted-foreground font-semibold">{c.label}</span>
                        <span className="text-right font-medium text-foreground break-words min-w-0">
                          {renderCellValue(c, r, onToggle)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <span onClick={(e) => e.stopPropagation()}>
                  <RowMenu onAction={(a) => onAction?.(a, r, i)} row={r} slug={slug} />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function RowMenu({ onAction, row, slug }: { onAction: (a: RowAction) => void; row?: Row | null; slug?: string }) {
  const isUnpaidOrder = slug === "orders" && String(row?.status ?? "") === "Unpaid";
  const items: { key: RowAction; label: string; icon: LucideIcon; danger?: boolean }[] = [
    { key: "view", label: "View details", icon: Eye },
    { key: "edit", label: "Edit", icon: Pencil },
    ...(isUnpaidOrder
      ? [
          { key: "payment" as RowAction, label: "Payment", icon: CreditCard },
          { key: "return" as RowAction, label: "Return / Cancel", icon: RotateCcw, danger: true },
        ]
      : []),
    { key: "delete", label: "Delete", icon: Trash2, danger: true },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-44 rounded-xl glass-strong border border-border p-1 shadow-elegant text-left z-50 bg-card text-foreground"
        >
          {items.map((it) => (
            <DropdownMenuItem
              key={it.key}
              onClick={(e) => {
                e.stopPropagation();
                onAction(it.key);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition",
                it.danger
                  ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                  : "text-muted-foreground focus:text-foreground focus:bg-secondary"
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const PRODUCT_STATUS_OPTIONS = [
  { label: "Enable", value: "Enable" },
  { label: "Disable", value: "Disable" },
];

const INVENTORY_STATUS_OPTIONS = [
  { label: "In stock", value: "In stock" },
  { label: "Out of stock", value: "Out of stock" },
];

function StatusPill({ label }: { label: string }) {
  const l = label.toLowerCase();
  const tone =
    /paid|active|completed|success|in stock|enabled|enable|parent group/.test(l) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
    /to deliver|draft|pending|processing|unpaid|subcategory/.test(l)   ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" :
    /refund|low/.test(l)                                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
    /fail|cancel|out|disabled|disable|closed/.test(l)                     ? "bg-destructive/10 text-destructive border-destructive/20" :
                                                                            "bg-secondary text-muted-foreground border-border";
  return <span className={cn("inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider border", tone)}>{label}</span>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="text-muted-foreground font-medium">Page {page} of {pages}</div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page"
          className="inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-secondary disabled:opacity-40 transition touch-target">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {/* Compact page indicator on mobile */}
        <span className="md:hidden text-xs font-bold text-foreground px-2">{page}</span>
        {/* Full page numbers on desktop */}
        <div className="hidden md:flex items-center gap-1">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} onClick={() => onPage(i + 1)}
              className={cn("h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition",
                page === i + 1 ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "bg-card border border-border hover:bg-secondary")}>
              {i + 1}
            </button>
          ))}
        </div>
        <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} aria-label="Next page"
          className="inline-flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-secondary disabled:opacity-40 transition touch-target">
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
      className="rounded-2xl glass-strong border border-border p-6 md:p-10 text-center shadow-sm">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-sm mb-3">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="font-display text-lg font-bold text-foreground">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto font-medium">{desc}</p>
      {action && onAction && (
        <button onClick={onAction}
          className="mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25">
          <Plus className="h-3.5 w-3.5" /> {action}
        </button>
      )}
    </motion.div>
  );
}

/* ============================================================
 * Drawer & Dynamic Modal
 * ============================================================ */
function DetailDrawer({
  open, onClose, row, columns, title, slug, onEdit, onDelete,
}: {
  open: boolean; onClose: () => void; row: Row | null; columns: Column[]; title: string; slug?: string;
  onEdit: () => void; onDelete: () => void;
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
              {slug === "discounts" && row.disabled && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold">This discount is archived and cannot be applied to new orders.</span>
                  </div>
                </div>
              )}
              {slug === "orders" && (
                <div className="rounded-xl bg-card border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Shipping Details</div>
                  <ul className="mt-2 space-y-2 text-xs text-muted-foreground font-medium">
                    <li className="flex items-start justify-between gap-3">
                      <span>Recipient</span>
                      <span className="text-right font-semibold text-foreground">{row.customer || "—"}</span>
                    </li>
                    <li className="flex items-start justify-between gap-3">
                      <span>Phone</span>
                      <span className="text-right font-semibold text-foreground">
                        {row.shipping?.phone
                          ? <a className="text-primary hover:underline" href={`tel:${row.shipping.phone}`}>{row.shipping.phone}</a>
                          : "—"}
                      </span>
                    </li>
                    <li className="flex items-start justify-between gap-3">
                      <span>Email</span>
                      <span className="text-right font-semibold text-foreground">
                        {row.shipping?.email
                          ? <a className="text-primary hover:underline" href={`mailto:${row.shipping.email}`}>{row.shipping.email}</a>
                          : "—"}
                      </span>
                    </li>
                    <li className="flex items-start justify-between gap-3">
                      <span>Address</span>
                      <span className="text-right font-semibold text-foreground">
                        {[row.shipping?.line1, row.shipping?.line2, [row.shipping?.city, row.shipping?.state].filter(Boolean).join(", "), row.shipping?.pincode, row.shipping?.country].filter(Boolean).join(", ") || "—"}
                      </span>
                    </li>
                  </ul>
                </div>
              )}
              <div className="rounded-xl bg-card border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Record Details</div>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground font-medium">
                  <li className="flex items-center justify-between">
                    <span>Record ID:</span>
                    <span className="font-mono text-[11px] text-foreground font-semibold">{row.name || row.rawKey || row.rawId || row.id || "—"}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Synced</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-border flex items-center gap-2">
              <button onClick={onDelete}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold transition">
                <Trash2 className="h-3.5 w-3.5" /> Delete
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
  open, onClose, mode, title, columns: rawColumns, initial, onSave, itemGroups, slug, itemCodes,
}: {
  open: boolean; onClose: () => void; mode: "create" | "edit"; title: string;
  columns: Column[]; initial?: Row | null; onSave: (r: Row) => void;
  itemGroups?: ItemGroup[];
  itemCodes?: { itemCode: string; name: string; code: string }[];
  slug?: string;
}) {
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [manualSku, setManualSku] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const columns = useMemo(() => {
    if (slug === "inventory") {
      if (mode === "create") {
        return [
          { key: "name", label: "Product Name" },
          { key: "sku", label: "Item Code / SKU" },
          { key: "item_group", label: "Category" },
          { key: "price", label: "Price" },
          { key: "stock", label: "Website Stock" },
          { key: "status", label: "Status" },
          { key: "image", label: "Image", hidden: true },
          { key: "short_description", label: "Short Description", type: "textarea", hidden: true },
          { key: "web_long_description", label: "Long Description (Website)", type: "textarea", hidden: true },
        ];
      } else {
        return [
          { key: "sku", label: "Item Code" },
          { key: "name", label: "Item Name" },
          { key: "item_group", label: "Category" },
          { key: "warehouse", label: "Warehouse" },
          { key: "actual_qty", label: "Actual Stock" },
          { key: "status", label: "Status" },
        ];
      }
    }
    if (slug === "discounts") {
      return [
        { key: "item_code", label: "Item Code" },
        { key: "title", label: "Title" },
        { key: "rate_or_discount", label: "Rule Type" },
        { key: "discount_percentage", label: "Discount %", type: "number" },
        { key: "rate", label: "Rate (PKR)", type: "number" },
        { key: "discount_amount", label: "Discount Amount (PKR)", type: "number" },
        { key: "valid_from", label: "Valid From", type: "date" },
        { key: "valid_upto", label: "Valid To", type: "date" },
        { key: "priority", label: "Priority", type: "number" },
        { key: "disable", label: "Disabled" },
      ];
    }
    return rawColumns;
  }, [slug, mode, rawColumns]);

  useEffect(() => {
    if (open) {
      const seed: Row = {};
      columns.forEach((c) => { seed[c.key] = initial?.[c.key] ?? ""; });
      if (slug === "products") {
        seed.images = Array.isArray(initial?.slideshow_images)
          ? initial.slideshow_images
          : (initial?.image ? [initial.image] : []);
        if (!seed.image && Array.isArray(seed.images) && seed.images.length) seed.image = seed.images[0];
        if (mode === "create" && !seed.status) seed.status = "Enable";
      } else if (slug === "inventory") {
        if (mode === "create" && !seed.status) seed.status = "In stock";
        seed.warehouse = "Stores - O";
      } else if (slug === "discounts") {
        if (mode === "create" && !seed.rate_or_discount) seed.rate_or_discount = "Discount Percentage";
        if (mode === "create" && !seed.title) seed.title = "Discount " + (seed.item_code || "");
        if (mode === "edit") {
          seed.rate_or_discount = initial?.type || "Discount Percentage";
          seed.title = initial?.title || "";
          seed.discount_percentage = initial?.type === "Discount Percentage" ? (initial?.value || "").replace(/[^0-9]/g, "") : "";
          seed.rate = initial?.type === "Rate" ? (initial?.value || "").replace(/[^0-9]/g, "") : "";
          seed.discount_amount = initial?.type === "Discount Amount" ? (initial?.value || "").replace(/[^0-9]/g, "") : "";
        }
      }
      setForm(seed);
      setSaving(false);
      setManualSku(Boolean(initial?.sku));
    }
  }, [open, initial, columns, slug, mode]);

  const handleNameChange = (val: string) => {
    setForm((prev) => {
      const next: Row = { ...prev, name: val };
      if ((slug === "products" || slug === "inventory") && mode === "create" && !manualSku) {
        next.sku = val
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
      return next;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    try {
      const additions: string[] = [];
      for (const file of files) {
        const res = await uploadAdminFile(file);
        additions.push(res.data.file_url);
      }
      setForm((f) => {
        const current = Array.isArray(f.images) ? f.images : [];
        return { ...f, images: [...current, ...additions], image: f.image || additions[0] || "" };
      });
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    try {
      const additions: string[] = [];
      for (const file of files) {
        const res = await uploadAdminFile(file);
        additions.push(res.data.file_url);
      }
      setForm((f) => {
        const current = Array.isArray(f.images) ? f.images : [];
        return { ...f, images: [...current, ...additions], image: f.image || additions[0] || "" };
      });
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const addMediaImage = (fileUrl: string) => {
    setForm((f) => {
      const current = Array.isArray(f.images) ? f.images : [];
      if (current.includes(fileUrl)) return f;
      return { ...f, images: [...current, fileUrl], image: f.image || fileUrl || "" };
    });
  };

  const removeImage = (idx: number) => {
    setForm((f) => {
      const current = Array.isArray(f.images) ? f.images.slice() : [];
      current.splice(idx, 1);
      return {
        ...f,
        images: current,
        image: current[0] ?? "",
      };
    });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setForm((f) => {
      const current = Array.isArray(f.images) ? f.images.slice() : [];
      const target = idx + dir;
      if (target < 0 || target >= current.length) return f;
      const [item] = current.splice(idx, 1);
      current.splice(target, 0, item);
      return { ...f, images: current, image: current[0] ?? f.image ?? "" };
    });
  };

  const openMedia = async () => {
    setMediaOpen(true);
    setMediaLoading(true);
    try {
      const res = await getAdminFiles();
      setMediaFiles((res.data || []).filter((f) => f.file_url));
    } catch {
      setMediaFiles([]);
    } finally {
      setMediaLoading(false);
    }
  };

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
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg glass-strong border border-border rounded-t-2xl sm:rounded-2xl shadow-elegant overflow-hidden bg-card text-foreground max-h-[92vh] sm:max-h-[85vh] sm:overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {mode === "create" ? "Create new" : "Edit"}
                  </div>
                  <div className="font-display text-lg font-bold mt-0.5 text-foreground">{title}</div>
                </div>
                <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-3.5 flex-1 overflow-y-auto min-h-0">
                {slug === "discounts" ? (
                  <>
                    {/* Title */}
                    <label className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Title</span>
                      <input
                        value={String(form.title ?? "")}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        placeholder={`Discount ${String(form.item_code ?? "")}`}
                      />
                    </label>

                    {/* Item Code */}
                    <label className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Item</span>
                      {(itemCodes && itemCodes.length > 0) ? (
                        <select
                          value={String(form.item_code ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, item_code: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="" className="bg-card text-foreground py-1.5">— Select product —</option>
                          {itemCodes.map((opt) => (
                            <option key={opt.itemCode} value={opt.itemCode} className="bg-card text-foreground py-1.5">
                              {opt.name}{opt.name && opt.itemCode !== opt.name ? ` (${opt.itemCode})` : ` ${opt.itemCode}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={String(form.item_code ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, item_code: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          placeholder="e.g. Nutri-Cept"
                        />
                      )}
                    </label>

                    {/* Rule Type */}
                    <label className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Rule Type</span>
                      <select
                        value={String(form.rate_or_discount || "Discount Percentage")}
                        onChange={(e) => setForm((f) => ({ ...f, rate_or_discount: e.target.value }))}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                      >
                        <option value="Discount Percentage">Discount Percentage (%)</option>
                        <option value="Rate">Fixed Rate (new price)</option>
                        <option value="Discount Amount">Discount Amount (Rs. off)</option>
                      </select>
                    </label>

                    {/* Conditional value field */}
                    {form.rate_or_discount === "Rate" ? (
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Rate (PKR)</span>
                        <input
                          type="number"
                          value={String(form.rate ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          placeholder="New selling price"
                        />
                      </label>
                    ) : form.rate_or_discount === "Discount Amount" ? (
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Discount Amount (PKR)</span>
                        <input
                          type="number"
                          value={String(form.discount_amount ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, discount_amount: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          placeholder="Amount to subtract"
                        />
                      </label>
                    ) : (
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Discount %</span>
                        <input
                          type="number"
                          value={String(form.discount_percentage ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          placeholder="e.g. 10"
                        />
                      </label>
                    )}

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Valid From</span>
                        <input
                          type="date"
                          value={String(form.valid_from ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Valid To</span>
                        <input
                          type="date"
                          value={String(form.valid_upto ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, valid_upto: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        />
                      </label>
                    </div>

                    {/* Priority + Disabled */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Priority</span>
                        <input
                          type="number"
                          value={String(form.priority ?? "0")}
                          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Disabled</span>
                        <select
                          value={String(form.disable || "0")}
                          onChange={(e) => setForm((f) => ({ ...f, disable: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="0" className="bg-card text-foreground py-1.5">No (Active)</option>
                          <option value="1" className="bg-card text-foreground py-1.5">Yes (Disabled)</option>
                        </select>
                      </label>
                    </div>
                  </>
                ) : (
                columns.map((c) => {
                  // Skip columns not meant for form
                  if (c.key === "item_count" || c.key === "is_group_label") return null;

                  // Image upload for products / inventory
                  if ((slug === "products" || slug === "inventory") && c.key === "image") {
                    const galleryImages: string[] = Array.isArray(form.images)
                      ? form.images.filter(Boolean)
                      : (form.image ? [form.image] : []);
                    const isProduct = slug === "products";
                    return (
                      <div key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                          {isProduct ? "Product Images (Slideshow)" : c.label}
                        </span>

                        {galleryImages.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-2.5">
                            {galleryImages.map((src, i) => (
                              <div
                                key={src + i}
                                className="group relative overflow-hidden rounded-xl border border-border bg-secondary/30 aspect-square"
                              >
                                {isProduct && i === 0 && (
                                  <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                                    Main
                                  </span>
                                )}
                                <img src={getItemImageUrl(src)} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
                                {/* Reorder controls */}
                                {isProduct && (
                                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => moveImage(i, -1)}
                                      disabled={i === 0}
                                      className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-black transition hover:bg-white disabled:opacity-30"
                                      aria-label="Move earlier"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeImage(i)}
                                      className="grid h-6 w-6 place-items-center rounded-md bg-red-500 text-white transition hover:bg-red-600"
                                      aria-label="Remove image"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveImage(i, 1)}
                                      disabled={i === galleryImages.length - 1}
                                      className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-black transition hover:bg-white disabled:opacity-30"
                                      aria-label="Move later"
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                                {!isProduct && (
                                  <button
                                    type="button"
                                    onClick={() => removeImage(i)}
                                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                                    aria-label="Remove image"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {isProduct && (
                          <p className="mb-2 text-[11px] text-muted-foreground">
                            First image is the main / listing image. Add multiple images to create the website slideshow.
                          </p>
                        )}

                        <label
                          className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 px-4 py-5 text-center transition hover:border-primary/60 hover:bg-secondary/40"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleImageDrop}
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:scale-110">
                            <Plus className="h-5 w-5" />
                          </span>
                          <span className="text-sm font-semibold text-foreground">Add image{galleryImages.length ? "s" : ""}</span>
                          <span className="text-xs text-muted-foreground">click or drag &amp; drop · multiple allowed · PNG, JPG, WebP</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                        </label>

                        <button
                          type="button"
                          onClick={openMedia}
                          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                        >
                          <ImagePlus className="h-4 w-4" /> Pick from Media Library
                        </button>
    </div>
  );
}

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

                  // Auto-generating SKU / Item Code input for products & inventory
                  if ((slug === "products" || slug === "inventory") && c.key === "sku") {
                    return (
                      <label key={c.key} className="block">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{c.label}</span>
                          <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            {manualSku ? "Custom SKU" : "Auto-generated"}
                          </span>
                        </div>
                        <input
                          value={String(form.sku ?? "")}
                          onChange={(e) => {
                            setManualSku(true);
                            setForm((f) => ({ ...f, sku: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "-") }));
                          }}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          placeholder="Auto-generated from Product Name"
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

                  // Product status dropdown with 2 exact options (Enable / Disable)
                  if (slug === "products" && c.key === "status") {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <select
                          value={String(form.status || "Enable")}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          {PRODUCT_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-card text-foreground py-1.5">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  // Inventory status dropdown with 2 exact options (In stock / Out of stock)
                  if (slug === "inventory" && c.key === "status") {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <select
                          value={String(form.status || "In stock")}
                          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                        >
                          {INVENTORY_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-card text-foreground py-1.5">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  // Inventory warehouse input locked strictly to Stores - O
                  if (slug === "inventory" && c.key === "warehouse") {
                    return (
                      <label key={c.key} className="block opacity-80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{c.label}</span>
                          <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-secondary border border-border">
                            Locked (Main Warehouse)
                          </span>
                        </div>
                        <input
                          disabled
                          value="Stores - O"
                          className="w-full h-10 px-3.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold text-foreground outline-none cursor-not-allowed"
                        />
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

                  if (c.type === "textarea") {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <textarea
                          value={String(form[c.key] ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                          rows={4}
                          placeholder={`Enter ${c.label.toLowerCase()}`}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-y"
                        />
                      </label>
                    );
                  }

                  if (c.type === "date") {
                    return (
                      <label key={c.key} className="block">
                        <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                        <input
                          type="date"
                          value={String(form[c.key] ?? "")}
                          onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                          className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        />
                      </label>
                    );
                  }

                  return (
                    <label key={c.key} className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{c.label}</span>
                      <input
                        value={String(form[c.key] ?? "")}
                        onChange={(e) => {
                          if (c.key === "name") {
                            handleNameChange(e.target.value);
                          } else {
                            setForm((f) => ({ ...f, [c.key]: e.target.value }));
                          }
                        }}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        placeholder={`Enter ${c.label.toLowerCase()}`}
                      />
                    </label>
                  );
                }))}
              </form>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/30 shrink-0">
                <button onClick={onClose}
                  className="flex-1 sm:flex-none h-10 sm:h-9 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition">Cancel</button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-50 transition hover:opacity-95">
                  <Check className="h-3.5 w-3.5" /> {mode === "create" ? "Create Record" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>

          {mediaOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMediaOpen(false)}
                className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-lg glass-strong border border-border rounded-t-2xl sm:rounded-2xl shadow-elegant overflow-hidden bg-card text-foreground max-h-[92vh] sm:max-h-[85vh] sm:overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Media Library</div>
                      <div className="font-display text-lg font-bold mt-0.5 text-foreground">Pick an image</div>
                    </div>
                    <button onClick={() => setMediaOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto min-h-0">
                    {mediaLoading ? (
                      <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading media...</span>
                      </div>
                    ) : mediaFiles.length === 0 ? (
                      <div className="py-16 text-center text-xs text-muted-foreground">No media available. Upload images first.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {mediaFiles.map((f) => {
                          const isImage = /\.(jpg|jpeg|png|webp)$/i.test(f.file_url);
                          return (
                            <button
                              key={f.name || f.file_url}
                              type="button"
                              onClick={() => {
                                if ((slug === "products" || slug === "inventory") ? true : false) {
                                  addMediaImage(f.file_url);
                                } else {
                                  setForm((s) => ({ ...s, image: f.file_url }));
                                }
                                setMediaOpen(false);
                              }}
                              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/20 transition hover:border-primary/60"
                              title={f.file_name || f.name}
                            >
                              {isImage ? (
                                <img src={getItemImageUrl(f.file_url)} alt={f.file_name} className="h-full w-full object-cover transition group-hover:scale-105" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl">📄</div>
                              )}
                              {((slug === "products" || slug === "inventory")
                                ? (Array.isArray(form.images) ? form.images : [form.image]).includes(f.file_url)
                                : form.image === f.file_url) && (
                                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
 * Order Payment / Return Modal
 * ============================================================ */
function OrderActionModal({
  open, mode, row, onClose, onDone,
}: {
  open: boolean;
  mode: "payment" | "return";
  row: Row | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [form, setForm] = useState<{ mode_of_payment: string; amount: string; reference_no: string; posting_date: string }>({
    mode_of_payment: "Cash",
    amount: "",
    reference_no: "",
    posting_date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setError("");
    setSaving(false);
    const defaultAmount = String(row.outstandingAmount || row.rawTotal || "");
    getPaymentModes()
      .then((res) => {
        const list = res.data || [];
        setModes(list);
        setForm((f) => ({
          ...f,
          mode_of_payment: list.find((m) => m.name === "Cash")?.name || list[0]?.name || f.mode_of_payment,
          amount: defaultAmount,
          posting_date: new Date().toISOString().slice(0, 10),
        }));
      })
      .catch(() => setModes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  const orderId = row?.rawId || String(row?.rawKey || "").replace(/^#/, "");

  const handleSubmit = async () => {
    if (!row || !orderId) return;
    setSaving(true);
    setError("");
    try {
      if (mode === "payment") {
        await paymentAdminOrder(orderId, {
          mode_of_payment: form.mode_of_payment || "Cash",
          amount: Number(form.amount) > 0 ? Number(form.amount) : undefined,
          reference_no: form.reference_no || undefined,
          posting_date: form.posting_date || undefined,
        });
        pushToast("success", "Payment recorded — order completed");
      } else {
        await returnAdminOrder(orderId);
        pushToast("warning", "Order cancelled — stock restored");
      }
      onDone();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : (err?.message || "Action failed");
      setError(msg);
      pushToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && row && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg glass-strong border border-border rounded-t-2xl sm:rounded-2xl shadow-elegant overflow-hidden bg-card text-foreground max-h-[92vh] sm:max-h-[85vh] sm:overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Order action</div>
                  <div className="font-display text-lg font-bold mt-0.5 text-foreground">
                    {mode === "payment" ? "Record Payment" : "Return / Cancel Order"}
                  </div>
                </div>
                <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 pt-4">
                <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-mono text-foreground">{String(row.id || orderId)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="text-foreground">{String(row.customer || "—")}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground">{String(row.total || "—")}</span>
                  </div>
                </div>
              </div>

              {mode === "payment" ? (
                <div className="p-5 space-y-3.5 flex-1 overflow-y-auto min-h-0">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Mode of Payment</span>
                    <select
                      value={form.mode_of_payment}
                      onChange={(e) => setForm((f) => ({ ...f, mode_of_payment: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                    >
                      {modes.map((m) => (
                        <option key={m.name} value={m.name} className="bg-card text-foreground py-1.5">{m.name}</option>
                      ))}
                      {modes.length === 0 && (
                        <option value="Cash" className="bg-card text-foreground py-1.5">Cash</option>
                      )}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Amount (PKR)</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                        placeholder="Outstanding amount"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Posting Date</span>
                      <input
                        type="date"
                        value={form.posting_date}
                        onChange={(e) => setForm((f) => ({ ...f, posting_date: e.target.value }))}
                        className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Reference No (optional)</span>
                    <input
                      value={form.reference_no}
                      onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                      placeholder="Transaction ID / Cheque / Voucher No"
                    />
                  </label>
                </div>
              ) : (
                <div className="p-5 flex-1 overflow-y-auto min-h-0">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
                    <div className="text-sm font-bold text-foreground">Cancel this order?</div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      This will cancel the Sales Invoice and the Sales Order for{" "}
                      <span className="font-semibold text-foreground">{String(row.id || orderId)}</span>.
                      All deducted stock will be restored automatically.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="px-5 pb-1">
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive font-semibold">{error}</div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/30 shrink-0">
                <button onClick={onClose}
                  className="flex-1 sm:flex-none h-10 sm:h-9 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition">Cancel</button>
                <button onClick={handleSubmit} disabled={saving}
                  className={cn(
                    "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 rounded-xl text-white text-xs font-bold shadow-md transition hover:opacity-95 disabled:opacity-50",
                    mode === "payment" ? "bg-gradient-to-r from-primary to-accent shadow-primary/25" : "bg-gradient-to-r from-destructive to-red-600 shadow-destructive/25"
                  )}
                >
                  {saving ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : mode === "payment" ? (
                    <CreditCard className="h-3.5 w-3.5" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Processing…" : mode === "payment" ? "Confirm Payment" : "Yes, Cancel & Restore Stock"}
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
  a.href = url; a.download = `${name}-export.csv`; a.click();
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
  const [itemCodes, setItemCodes] = useState<{ itemCode: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(meta.filters[0] || "All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [advancedFilters, setAdvancedFilters] = useState<FilterValue[]>([]);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const perPage = 10;

  const [drawer, setDrawer] = useState<{ open: boolean; row: Row | null; index: number }>({ open: false, row: null, index: -1 });
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit" | "payment" | "return"; row: Row | null; index: number }>({
    open: false, mode: "create", row: null, index: -1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Pre-fetch Item Groups for category selectors and references
      const groupsRes = await getItemGroups().catch(() => ({ data: [] }));
      setItemGroups(groupsRes.data || []);

      // Pre-fetch product item codes for the pricing rule item picker
      const itemsRes = await getItems({ limit: 500 }).catch(() => ({ data: [] }));
      setItemCodes(
        (itemsRes.data || [])
          .map((it) => {
            const itemCode = it.item_code || "";
            const displayName = it.item_name || it.item_code || it.name || "";
            return {
              itemCode,
              name: displayName,
              code: itemCode,
            };
          })
          .filter((x) => x.itemCode),
      );

      if (slug === "products") {
        const res = await getItems({ limit: 200, _t: String(Date.now()) });
        const mapped = (res.data || []).map((it) => {
          const rawPublished = it.is_published ?? (it as any).published ?? 1;
          const rawDisabled = (it as any).disabled ?? 0;
          const qty = it.custom_stock_qty ?? it.stock_qty ?? 0;

          const statusVal = rawPublished === 0 || rawDisabled === 1 ? "Disable" : "Enable";

      return {
        rawKey: it.item_code || it.name,
        name: it.item_name || it.item_code,
        sku: it.item_code || it.name,
        item_group: it.item_group || "General",
        price: `PKR ${(it.standard_rate || it.valuation_rate || 0).toLocaleString()}`,
        rawPrice: it.standard_rate || it.valuation_rate || 0,
        stock: qty,
        status: statusVal,
        short_description: (it as any).short_description || "",
        web_long_description: (it as any).web_long_description || "",
        image: it.image || it.website_image || "",
        slideshow_images: (it as any).slideshow_images || [],
      };
        });
        setRows(mapped);
      } else if (slug === "orders") {
        const res = await getAdminOrders();
        const mapped = (res.data || []).map((o) => ({
          rawKey: o.name,
          id: `#${o.name}`,
          rawId: o.name,
          customer: orderDisplayName(o),
          total: `PKR ${(Number(o.grand_total) || 0).toLocaleString()}`,
          rawTotal: Number(o.grand_total) || 0,
          status: o.status || "Draft",
          outstandingAmount: Number(o.outstanding_amount) || 0,
          date: o.transaction_date || "—",
          shipping: o.shipping || null,
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
        const today = new Date().toISOString().slice(0, 10);
        const mapped = (res.data || []).map((d) => {
          const isDisabled = d.disable === 1 || d.disabled === 1;
          const isExpired = d.valid_upto && d.valid_upto < today;
          const status = isDisabled ? "Archived" : isExpired ? "Expired" : "Active";
          const type = d.rate_or_discount || "Discount Percentage";
          let value = "";
          if (type === "Discount Percentage") value = `${d.discount_percentage || 0}% OFF`;
          else if (type === "Rate") value = `PKR ${(d.rate || 0).toLocaleString()}`;
          else if (type === "Discount Amount") value = `PKR ${(d.discount_amount || 0).toLocaleString()} OFF`;
          return {
            rawKey: d.name,
            title: d.title || "",
            item_code: d.item_code || (d.item_codes?.[0] ?? "") || "",
            type,
            value,
            priority: d.priority ?? 0,
            valid_from: d.valid_from || "—",
            valid_upto: d.valid_upto || "—",
            status,
            disabled: isDisabled,
          };
        });
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
      pushToast("error", `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  // Close advanced filter panel when clicking outside
  useEffect(() => {
    if (!filtersOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filtersOpen]);

  // Derived statistics for the StatsRow
  const stats: Stat[] = useMemo(() => {
    const total = rows.length;
    const activeCount = rows.filter((r) => {
      const s = String(r.status ?? r.is_group_label ?? "").toLowerCase();
      return s.includes("active") || s.includes("enabled") || s.includes("deliver") || s.includes("in stock") || s.includes("parent");
    }).length;

    return [
      { label: `Total ${title}`, value: String(total) },
      { label: "Active", value: String(activeCount || total) },
      { label: "Sync status", value: "Real-time", delta: "Live", trend: "up" },
      { label: "Source", value: "Live system" },
    ];
  }, [rows, title]);

  const filtered = useMemo(() => {
    let out = rows;
    
    // Apply status/type filter based on FILTER_CONFIG
    if (active && active !== "All") {
      const config = FILTER_CONFIG[slug];
      if (config) {
        const targetValue = config.mapping[active];
        if (targetValue) {
          out = out.filter((r) => r[config.field] === targetValue);
        }
      } else {
        out = out.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(active.toLowerCase())));
      }
    }
    
    // Apply search query across all fields
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    }
    
    // Apply legacy column filters
    for (const [k, v] of Object.entries(colFilters)) {
      if (!v) continue;
      const lv = v.toLowerCase();
      out = out.filter((r) => String(r[k] ?? "").toLowerCase().includes(lv));
    }
    
    // Apply advanced multi-field filters
    for (const f of advancedFilters) {
      out = applyFilter(out, f);
    }
    
    return out;
  }, [rows, active, query, colFilters, advancedFilters, slug]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const singular = (typeof title === "string" ? title : String(title)).replace(/s$/, "");

  const handleAction = async (a: RowAction, r: Row, idx: number) => {
    if (a === "view") {
      setDrawer({ open: true, row: r, index: idx });
      return;
    }
    if (a === "edit") {
      if (slug === "products") {
        const itemCode = r.rawKey || r.sku || r.name;
        try {
          const detailRes = await getItemDetail(itemCode);
          if (detailRes && detailRes.data) {
            const detail = detailRes.data as any;
            const fullSlideshow: string[] = Array.isArray(detail.slideshow_images) && detail.slideshow_images.length
              ? detail.slideshow_images
              : (detail.image ? [detail.image] : (r.slideshow_images || []));
            const enhancedRow = {
              ...r,
              ...detail,
              rawKey: itemCode,
              image: detail.image || r.image,
              images: fullSlideshow.length ? fullSlideshow : (r.image ? [r.image] : []),
              slideshow_images: fullSlideshow,
            };
            setModal({ open: true, mode: "edit", row: enhancedRow, index: idx });
            return;
          }
        } catch {
          // fallback to standard row
        }
      }
      setModal({ open: true, mode: "edit", row: r, index: idx });
      return;
    }
    if (a === "payment" && slug === "orders") {
      setModal({ open: true, mode: "payment", row: r, index: idx });
      return;
    }
    if (a === "return" && slug === "orders") {
      setModal({ open: true, mode: "return", row: r, index: idx });
      return;
    }
    if (a === "delete") {
      const recordName = r.rawKey || r.name || r.id || r.rawId;
      try {
        if (slug === "products") {
          await deleteItem(recordName);
          setRows((prev) => prev.filter((row) => {
            const candidate = row.rawKey || row.name || row.id || row.rawId;
            return candidate !== recordName;
          }));
        } else if (slug === "orders") {
          await deleteAdminOrder(r.rawId || recordName.replace(/^#/, ""));
        } else if (slug === "categories" || slug === "collections") {
          await deleteItemGroup(recordName);
        } else if (slug === "customers") {
          await deleteAdminCustomer(recordName);
        } else if (slug === "discounts") {
          const result = await deleteAdminDiscount(recordName);
          // Handle different actions for discounts
          if (result.action === "disabled") {
            pushToast("warning", result.message || `${singular} archived (linked to existing orders)`);
          } else {
            pushToast("success", result.message || `${singular} deleted`);
          }
          loadData();
          return; // Early return to skip the generic success toast below
        } else if (slug === "team") {
          await deleteAdminUser(recordName);
        } else if (slug === "inventory") {
          const itemCode = r.sku || r.item_code || r.name || recordName;
          await deleteItem(itemCode);
          setRows((prev) => prev.filter((row) => {
            const candidate = row.sku || row.item_code || row.name || row.rawKey;
            return candidate !== itemCode && row.rawKey !== r.rawKey;
          }));
        } else {
          await deleteErpDoc(singular, recordName);
        }
        pushToast("success", `${singular} deleted`);
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
          const autoSku = (formData.sku || formData.name || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          const chosenStatus = formData.status || "Enable";
          await createItem({
            item_name: formData.name || autoSku,
            item_code: autoSku || undefined,
            sku: autoSku || undefined,
            item_group: formData.item_group || "General",
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")) || 0,
            stock_qty: Number(formData.stock) || 0,
            stock_uom: "Nos",
            description: formData.description || "",
            short_description: formData.short_description || "",
            web_long_description: formData.web_long_description || "",
            image: formData.image || undefined,
            imageUrl: formData.imageUrl || undefined,
            images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : undefined,
            status: chosenStatus,
            publish: chosenStatus === "Enable",
          });
        } else if (slug === "inventory") {
          const autoSku = (formData.sku || formData.name || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          const chosenStatus = formData.status || "In stock";
          const stockQty = chosenStatus === "Out of stock" ? 0 : (Number(formData.stock ?? formData.actual_qty) || 0);

          await createItem({
            item_name: formData.name || autoSku,
            item_code: autoSku || undefined,
            sku: autoSku || undefined,
            item_group: formData.item_group || "General",
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")) || 0,
            stock_qty: stockQty,
            stock_uom: "Nos",
            short_description: formData.short_description || "",
            web_long_description: formData.web_long_description || "",
            image: formData.image || undefined,
            imageUrl: formData.imageUrl || undefined,
            images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : undefined,
            status: chosenStatus,
            publish: true,
          });
        } else if (slug === "orders") {
          pushToast("info", "Order creation is disabled in this dashboard.");
          setModal({ open: false, mode: "create", row: null, index: -1 });
          return;
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
        } else if (slug === "discounts") {
          const rateOrDiscount = formData.rate_or_discount || "Discount Percentage";
          const payload: Record<string, unknown> = {
            item_code: formData.item_code,
            rate_or_discount: rateOrDiscount,
            priority: Number(formData.priority) || 0,
            disable: formData.disable === "1" ? 1 : 0,
          };
          if (rateOrDiscount === "Rate") payload.rate = Number(formData.rate) || 0;
          else if (rateOrDiscount === "Discount Amount") payload.discount_amount = Number(formData.discount_amount) || 0;
          else payload.discount_percentage = Number(formData.discount_percentage) || 0;
          if (formData.valid_from) payload.valid_from = formData.valid_from;
          if (formData.valid_upto) payload.valid_upto = formData.valid_upto;
          if (formData.title) payload.title = formData.title;
          await createAdminDiscount(payload);
        } else if (slug === "team") {
          await createAdminUser({
            email: formData.email,
            first_name: formData.full_name || formData.email.split("@")[0],
            user_type: formData.user_type || "System User",
          });
        } else {
          await createErpDoc(singular, formData);
        }
        pushToast("success", `${singular} created`);
        // short pause to ensure ERPNext persisted child entry, then refresh list
        await new Promise((r) => setTimeout(r, 300));
        loadData();
      } else {
        // Edit mode
        const recordName = modal.row?.rawKey || modal.row?.name || modal.row?.id || modal.row?.rawId;
        if (slug === "products") {
          await updateItem(recordName, {
            item_name: formData.name,
            item_group: formData.item_group,
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")),
            description: formData.description,
            short_description: formData.short_description || "",
            web_long_description: formData.web_long_description || "",
            image: formData.image || undefined,
            imageUrl: formData.imageUrl || undefined,
            images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : undefined,
            status: formData.status || "Enable",
            stock_uom: "Nos",
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
          const chosenStatus = formData.status || "In stock";
          const newQty = chosenStatus === "Out of stock" ? 0 : (Number(formData.actual_qty ?? formData.qty ?? formData.stock) || 0);
          await adjustAdminInventory({
            item_code: modal.row?.sku || modal.row?.name || formData.sku || formData.name,
            warehouse: formData.warehouse || modal.row?.warehouse || "Stores - O",
            qty: newQty,
            entry_type: "Stock Reconciliation",
            mode: "set",
          });
        } else if (slug === "team") {
          await updateAdminUser(recordName, {
            full_name: formData.full_name,
            user_type: formData.user_type,
          });
        } else if (slug === "discounts") {
          const rateOrDiscount = formData.rate_or_discount || modal.row?.type || "Discount Percentage";
          const payload: Record<string, unknown> = {
            rate_or_discount: rateOrDiscount,
            disable: formData.disable === "1" ? 1 : 0,
          };
          if (formData.item_code) payload.item_code = formData.item_code;
          if (formData.priority !== undefined) payload.priority = Number(formData.priority) || 0;
          if (formData.valid_from !== undefined) payload.valid_from = formData.valid_from || null;
          if (formData.valid_upto !== undefined) payload.valid_upto = formData.valid_upto || null;
          if (rateOrDiscount === "Rate" && formData.rate !== undefined) payload.rate = Number(formData.rate) || 0;
          else if (rateOrDiscount === "Discount Amount" && formData.discount_amount !== undefined) payload.discount_amount = Number(formData.discount_amount) || 0;
          else if (rateOrDiscount === "Discount Percentage" && formData.discount_percentage !== undefined) payload.discount_percentage = Number(formData.discount_percentage) || 0;
          if (formData.title) payload.title = formData.title;
          await updateAdminDiscount(recordName, payload);
        } else {
          await updateErpDoc(singular, recordName, formData);
        }
        pushToast("success", `${singular} updated`);
        await new Promise((r) => setTimeout(r, 300));
        loadData();
      }
      setModal({ open: false, mode: "create", row: null, index: -1 });
      loadData();
    } catch (err: any) {
      pushToast("error", err.message || `Failed to save ${singular}`);
    }
  };

  const handleToggle = async (key: string, row: Row, checked: boolean) => {
    if (slug !== "products" || key !== "status") return;
    const newStatus = checked ? "Enable" : "Disable";
    const itemCode = row.rawKey || row.sku || row.name;

    setRows((prev) => prev.map((r) => (r.rawKey === row.rawKey ? { ...r, status: newStatus } : r)));

    try {
      await updateItem(itemCode, { status: newStatus });
      pushToast("success", `Product ${checked ? "enabled" : "disabled"} on website`);
    } catch (err: any) {
      setRows((prev) => prev.map((r) => (r.rawKey === row.rawKey ? { ...r, status: checked ? "Disable" : "Enable" } : r)));
      pushToast("error", err.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6" key={slug}>
      <ToastHost />
      <Breadcrumb label={title} />
      <PageHeader
        icon={icon} title={title} subtitle={meta.subtitle} primaryAction={slug === "orders" || slug === "products" ? "" : meta.primaryAction}
        onPrimary={slug === "orders" || slug === "products" ? undefined : () => setModal({ open: true, mode: "create", row: null, index: -1 })}
        onRefresh={loadData} loading={loading}
        onExport={() => { downloadCSV(slug, meta.columns, filtered); pushToast("info", `Exported ${filtered.length} rows`); }}
      />
      <StatsRow stats={stats} />
      <div className="relative" ref={filterPanelRef}>
        <Toolbar
          filters={meta.filters} active={active} onActive={(f) => { setActive(f); setAdvancedFilters([]); setPage(1); }}
          query={query} onQuery={(q) => { setQuery(q); setPage(1); }}
          filtersOpen={filtersOpen} onFiltersToggle={() => setFiltersOpen((o) => !o)}
          advFilterCount={advancedFilters.length}
        />
        <AdvancedFilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          config={ADVANCED_FILTER_CONFIGS[slug] || []}
          filters={advancedFilters}
          onChange={(f) => { setAdvancedFilters(f); setPage(1); }}
          dynamicData={rows}
        />
      </div>
      {advancedFilters.length > 0 && (
        <ActiveFilterChips
          filters={advancedFilters}
          config={ADVANCED_FILTER_CONFIGS[slug] || []}
          onRemove={(field) => {
            setAdvancedFilters((prev) => prev.filter((f) => f.field !== field));
            setPage(1);
          }}
        />
      )}
      {(advancedFilters.length > 0 || (active && active !== "All")) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {rows.length} results</span>
          <button
            onClick={() => { setAdvancedFilters([]); setActive("All"); setQuery(""); setPage(1); }}
            className="text-xs font-semibold text-primary hover:text-foreground transition"
          >
            Clear all filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Fetching live data...</span>
        </div>
      ) : paged.length ? (
        <>
          <DataTable
            columns={meta.columns} rows={paged} slug={slug}
            onRowClick={(r) => setDrawer({ open: true, row: r, index: rows.indexOf(r) })}
            onAction={handleAction}
            onToggle={slug === "products" ? handleToggle : undefined}
          />
          <Pagination page={page} pages={pages} onPage={setPage} />
        </>
      ) : (
        <EmptyState
          title={meta.emptyTitle}
          desc={meta.emptyDesc}
          action={slug === "orders" || slug === "products" ? "" : meta.primaryAction}
          onAction={slug === "orders" || slug === "products" ? undefined : () => setModal({ open: true, mode: "create", row: null, index: -1 })}
        />
      )}

      <DetailDrawer
        open={drawer.open} onClose={() => setDrawer({ open: false, row: null, index: -1 })}
        row={drawer.row} columns={meta.columns} title={singular} slug={slug}
        onEdit={() => {
          const r = drawer.row; const i = drawer.index;
          setDrawer({ open: false, row: null, index: -1 });
          setModal({ open: true, mode: "edit", row: r, index: i });
        }}
        onDelete={() => { if (drawer.row) { handleAction("delete", drawer.row, drawer.index); setDrawer({ open: false, row: null, index: -1 }); } }}
      />

      <RecordModal
        open={modal.open && (modal.mode === "create" || modal.mode === "edit")}
        mode={modal.mode === "edit" ? "edit" : "create"}
        onClose={() => setModal({ open: false, mode: "create", row: null, index: -1 })}
        title={singular} columns={meta.columns} initial={modal.row}
        onSave={handleSave}
        itemGroups={itemGroups}
        itemCodes={itemCodes}
        slug={slug}
      />

      <OrderActionModal
        open={modal.open && (modal.mode === "payment" || modal.mode === "return")}
        mode={modal.mode === "return" ? "return" : "payment"}
        row={modal.row}
        onClose={() => setModal({ open: false, mode: "create", row: null, index: -1 })}
        onDone={() => { setModal({ open: false, mode: "create", row: null, index: -1 }); loadData(); }}
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
    { name: "Direct Sales", pct: 54, color: "bg-primary" },
    { name: "Website Orders", pct: 32, color: "bg-emerald-400" },
    { name: "Customer Portal", pct: 14, color: "bg-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb label="Analytics" />
      <PageHeader icon={item.icon} title="Analytics" subtitle="Real-time revenue and sales order metrics." primaryAction="Export report"
        onPrimary={() => pushToast("info", "Generating analytics report…")}
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
            <span className="text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">Sales Order Sync</span>
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
        <div className="text-sm font-medium mb-3">Top selling catalog items</div>
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
      .catch(() => pushToast("error", "Failed to load files"))
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
        pushToast("success", `${fileList[i].name} uploaded`);
      } catch (err: any) {
        pushToast("error", err.message || "Failed to upload file");
      }
    }
    loadFiles();
    e.target.value = "";
  };

  const downloadFile = async (f: any) => {
    try {
      const res = await fetch(f.file_url?.startsWith("http") ? f.file_url : getItemImageUrl(f.file_url || f.file_name));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.file_name || f.name || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast("success", `${f.file_name || f.name} downloaded`);
    } catch (err: any) {
      pushToast("error", err.message || "Failed to download file");
    }
  };

  const openFile = (f: any) => {
    if (f.file_url && f.file_url.startsWith("http")) {
      window.open(f.file_url, "_blank");
    } else if (f.file_url || f.file_name) {
      window.open(getItemImageUrl(f.file_url || f.file_name), "_blank");
    } else {
      pushToast("info", `File: ${f.file_name || f.name}`);
    }
  };

  const handleDeleteFile = async (f: any) => {
    if (!f.name || f.is_folder) return;
    if (!window.confirm(`Delete "${f.file_name || f.name}" permanently?`)) return;
    setLoading(true);
    try {
      await deleteAdminFile(f.file_ids ? f.file_ids.join(",") : f.name);
      pushToast("success", `${f.file_name || f.name} deleted`);
      loadFiles();
    } catch (err: any) {
      pushToast("error", err.message || "Failed to delete file");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastHost />
      <Breadcrumb label="Media Library" />
      <PageHeader icon={item.icon} title="Media Library" subtitle="Files, images and attachments stored in the platform." primaryAction="Upload file"
        onPrimary={triggerUpload}
        onRefresh={loadFiles} loading={loading}
        onExport={() => pushToast("info", "Media manifest exported")} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />

      <StatsRow stats={[
        { label: "Unique Assets", value: String(files.length) },
        { label: "Storage", value: "Attachments" },
        { label: "Status", value: "Synced", delta: "Active", trend: "up" },
        { label: "Upload Mode", value: "Direct" },
      ]} />

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <EmptyState title="No files uploaded yet" desc="Upload images and documents directly to file storage." action="Upload first file" onAction={triggerUpload} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((f, i) => (
            <motion.div key={f.name || f.file_url || i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ y: -3 }}
              onClick={() => openFile(f)}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 glass cursor-pointer p-3 flex flex-col justify-between"
            >
              <div onClick={() => openFile(f)} className="h-full w-full flex items-center justify-center rounded-xl bg-white/[0.04] overflow-hidden">
                {f.file_url && (f.file_url.endsWith(".jpg") || f.file_url.endsWith(".jpeg") || f.file_url.endsWith(".png") || f.file_url.endsWith(".webp")) ? (
                  <img src={getItemImageUrl(f.file_url)} alt={f.file_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-mono text-muted-foreground">📄</span>
                )}
              </div>
              <div onClick={() => openFile(f)} className="mt-2 flex flex-col">
                <span className="text-[11px] text-white/90 truncate font-medium">
                  {f.file_name || f.name}
                </span>
                {Array.isArray(f.attachments) && f.attachments.length > 0 && (
                  <span className="text-[9px] text-primary/80 truncate">
                    Attached ({f.attachments.length})
                  </span>
                )}
              </div>
              <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={(e) => { e.stopPropagation(); downloadFile(f); }}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/85"
                  aria-label="Download" title="Download">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteFile(f); }}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-red-600/90"
                  aria-label="Delete" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Banners Management
 * ============================================================ */
function BannersPage() {
  const item = findItem("banners")!;
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const loadBanners = () => {
    setLoading(true);
    getAdminBanners()
      .then((res) => setBanners(res.data || []))
      .catch(() => pushToast("error", "Failed to load banners"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBanners(); }, []);

  const handleDelete = async (b: Banner) => {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    try {
      await deleteAdminBanner(b.id);
      pushToast("success", "Banner deleted");
      loadBanners();
    } catch (err: any) {
      pushToast("error", err.message || "Failed to delete banner");
    }
  };

  const handleToggleActive = async (b: Banner) => {
    try {
      await updateAdminBanner(b.id, { isActive: !b.isActive });
      setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, isActive: !x.isActive } : x));
      pushToast("success", `Banner ${b.isActive ? "disabled" : "enabled"}`);
    } catch (err: any) {
      pushToast("error", err.message || "Failed to update banner");
    }
  };

  return (
    <div className="space-y-6">
      <ToastHost />
      <Breadcrumb label="Banners" />
      <PageHeader
        icon={item.icon}
        title="Banners"
        subtitle="Manage homepage carousel banners and linked products."
        primaryAction="Create banner"
        onPrimary={() => { setEditingBanner(null); setModalOpen(true); }}
        onRefresh={loadBanners}
        loading={loading}
      />

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          title="No banners yet"
          desc="Create your first homepage banner to display on the website."
          action="Create banner"
          onAction={() => { setEditingBanner(null); setModalOpen(true); }}
        />
      ) : (
        <div className="space-y-3">
          {banners.sort((a, b) => a.position - b.position).map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-2xl border border-white/10 p-4 flex items-center gap-4"
            >
              <span className="text-xs text-muted-foreground font-mono w-6 text-center shrink-0">
                #{b.position}
              </span>
              <div className="w-24 h-16 rounded-xl overflow-hidden bg-white/[0.04] shrink-0">
                <img
                  src={getItemImageUrl(b.image)}
                  alt={b.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {b.products.length} product{b.products.length !== 1 ? "s" : ""} linked
                </p>
              </div>
              <button
                onClick={() => handleToggleActive(b)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition ${
                  b.isActive
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-white/5 border-white/10 text-muted-foreground"
                }`}
              >
                {b.isActive ? "Active" : "Inactive"}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingBanner(b); setModalOpen(true); }}
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-rose-500/15 text-muted-foreground hover:text-rose-300 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {modalOpen && (
        <BannerModal
          banner={editingBanner}
          onClose={() => { setModalOpen(false); setEditingBanner(null); }}
          onSaved={() => { setModalOpen(false); setEditingBanner(null); loadBanners(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Banner Create/Edit Modal
 * ============================================================ */
function BannerModal({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [image, setImage] = useState(banner?.image ?? "");
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [position, setPosition] = useState(banner?.position ?? 0);
  const [selectedProducts, setSelectedProducts] = useState<BannerProduct[]>(banner?.products ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Item[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProductSearch = (val: string) => {
    setProductSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.length < 2) { setProductResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await getItems({ search: val, limit: 20 });
        setProductResults(res.data || []);
      } catch { setProductResults([]); }
    }, 400);
  };

  const addProduct = (p: Item) => {
    if (selectedProducts.length >= 5) { pushToast("warning", "Maximum 5 products per banner"); return; }
    if (selectedProducts.some((x) => x.productName === (p.item_code || p.name))) return;
    setSelectedProducts((prev) => [...prev, { productName: p.item_code || p.name || "", sortOrder: prev.length }]);
    setProductSearch("");
    setProductResults([]);
  };

  const removeProduct = (name: string) => {
    setSelectedProducts((prev) => prev.filter((x) => x.productName !== name));
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAdminFile(file);
      setImage(res.data?.file_url || res.data?.url || "");
      pushToast("success", "Image uploaded");
    } catch (err: any) {
      pushToast("error", err.message || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!title.trim()) { pushToast("error", "Title is required"); return; }
    if (!image) { pushToast("error", "Image is required"); return; }
    setSaving(true);
    try {
      if (banner) {
        await updateAdminBanner(banner.id, { title, image, isActive, position, products: selectedProducts });
        pushToast("success", "Banner updated");
      } else {
        await createAdminBanner({ title, image, isActive, position, products: selectedProducts });
        pushToast("success", "Banner created");
      }
      onSaved();
    } catch (err: any) {
      pushToast("error", err.message || "Failed to save banner");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{banner ? "Edit Banner" : "Create Banner"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Banner Image *</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileUpload} />
          {image ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={getItemImageUrl(image)} alt="Banner" className="w-full h-40 object-cover" />
              <button
                onClick={() => setImage("")}
                className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-rose-600/90 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-white transition"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">{uploading ? "Uploading..." : "Click to upload image"}</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Sale 2026"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Position</label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-end pb-1">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                isActive
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-white/5 border-white/10 text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Linked Products ({selectedProducts.length}/5)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={productSearch}
              onChange={(e) => onProductSearch(e.target.value)}
              placeholder="Search products to link..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {productResults.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl max-h-48 overflow-y-auto">
                {productResults.map((p) => (
                  <button
                    key={p.item_code || p.name}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 transition text-sm"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
                      {p.image ? (
                        <img src={getItemImageUrl(p.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="grid w-full h-full place-items-center text-muted-foreground text-xs">?</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs truncate">{p.item_name || p.item_code}</p>
                      <p className="text-muted-foreground text-[10px]">{p.item_code}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedProducts.map((bp) => (
                <span
                  key={bp.productName}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/25 px-3 py-1 text-xs text-primary"
                >
                  {bp.productName}
                  <button onClick={() => removeProduct(bp.productName)} className="hover:text-white transition">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : banner ? "Update Banner" : "Create Banner"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
