import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Search, Truck, RotateCcw, Eye, XCircle } from "lucide-react";
import {
  DashCard,
  StatusBadge,
  EmptyState,
  orderTone,
  payTone,
} from "@/components/dashboard/DashboardShell";
import { formatPKR, catalog } from "@/lib/site-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({ meta: [{ title: "My Orders — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

const FILTERS = ["All", "Processing", "Shipped", "Delivered", "Cancelled"] as const;

function OrdersPage() {
  const { orders: storeOrders, cancelOrder, removeOrder } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");

  const orders = storeOrders.filter((o) => {
    if (filter !== "All" && !o.status.startsWith(filter)) return false;
    if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <DashCard className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order ID…"
              className="h-11 w-full rounded-xl bg-white/70 pl-10 pr-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                    : "bg-white/70 text-ink hover:bg-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </DashCard>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders found"
          desc="Try adjusting your filters or start shopping to place your first order."
          action={
            <Link to="/shop" className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white">
              Browse Products
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <DashCard key={o.id} className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div>
                  <p className="font-display text-base font-extrabold text-ink">Order {o.id}</p>
                  <p className="text-xs text-muted-foreground">Placed on {new Date(o.date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.status} tone={orderTone(o.status)} />
                </div>
              </div>

              <div className="space-y-3">
                {o.items && o.items.length > 0 ? (
                  o.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                        <img src={it.image} alt={it.name} className="h-full w-full object-contain p-1.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-ink">{it.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-secondary">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-ink">{o.item_summary || "Package Details"}</p>
                      <p className="text-xs text-muted-foreground">Click "View Details" to see items</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <div className="text-xs text-muted-foreground">
                  Payment Method: <span className="font-semibold text-ink">COD / Card</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-lg font-black text-ink">{formatPKR(o.total)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/dashboard/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25"
                >
                  <Eye className="h-4 w-4" /> View Details
                </Link>
                <Link
                  to="/dashboard/tracking"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
                >
                  <Truck className="h-4 w-4" /> Track Order
                </Link>
                {["Processing", "To Deliver", "To Deliver and Bill"].includes(o.status) && (
                  <button
                    onClick={() => cancelOrder(o.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <XCircle className="h-4 w-4" /> Cancel Order
                  </button>
                )}
                {["Cancelled", "Completed", "Delivered"].includes(o.status) && (
                  <button
                    onClick={() => removeOrder(o.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <XCircle className="h-4 w-4" /> Remove Order
                  </button>
                )}
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white">
                  <RotateCcw className="h-4 w-4" /> Buy Again
                </button>
              </div>
            </DashCard>
          ))}
        </div>
      )}
    </div>
  );
}
