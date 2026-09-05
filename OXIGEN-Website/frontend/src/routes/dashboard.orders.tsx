import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Truck,
  RotateCcw,
  Eye,
  XCircle,
  CreditCard,
  X,
  RefreshCw,
} from "lucide-react";
import {
  DashCard,
  StatusBadge,
  EmptyState,
  orderTone,
} from "@/components/dashboard/DashboardShell";
import { formatPKR } from "@/lib/site-data";
import { useStore, type Order } from "@/lib/store";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({ meta: [{ title: "My Orders — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

const FILTERS = ["All", "Active", "Unpaid", "Completed", "Cancelled"] as const;

const ACTIVE_STATUSES = [
  "Processing",
  "To Deliver",
  "To Deliver and Bill",
  "To Bill",
  "Draft",
  "On Hold",
  "To Ship",
];

function matchesFilter(o: Order, f: (typeof FILTERS)[number]): boolean {
  if (f === "All") return true;
  if (f === "Unpaid") return o.status === "Unpaid";
  if (f === "Active") return ACTIVE_STATUSES.includes(o.status);
  if (f === "Completed") return o.status === "Completed" || o.status === "Delivered";
  if (f === "Cancelled") return o.status === "Cancelled";
  return true;
}

function OrdersPage() {
  const { orders: storeOrders, cancelOrder, removeOrder, paymentOrder, returnOrder } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);

  const orders = storeOrders.filter((o) => {
    if (!matchesFilter(o, filter)) return false;
    if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleReturn = async (o: Order) => {
    if (
      !confirm(`Return order ${o.id}?\n\nThe order will be cancelled and stock will be restored.`)
    )
      return;
    await returnOrder(o.id);
  };

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
                className={`touch-target rounded-lg px-3 py-2 text-xs font-semibold transition ${
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
            <Link
              to="/shop"
              className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
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
                  <p className="text-xs text-muted-foreground">
                    Placed on {new Date(o.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={o.status === "Unpaid" ? "Unpaid" : o.status}
                    tone={o.status === "Unpaid" ? "warning" : orderTone(o.status)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {o.items && o.items.length > 0 ? (
                  o.items.map((it, idx: number) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                        <img
                          src={it.image}
                          alt={it.name}
                          className="h-full w-full object-contain p-1.5"
                        />
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
                      <p className="line-clamp-1 text-sm font-semibold text-ink">
                        {o.item_summary || "Package Details"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "View Details" to see items
                      </p>
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
                  className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25"
                >
                  <Eye className="h-4 w-4" /> View Details
                </Link>
                <Link
                  to="/dashboard/tracking"
                  className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
                >
                  <Truck className="h-4 w-4" /> Track Order
                </Link>
                {o.status === "Unpaid" && (
                  <>
                    <button
                      onClick={() => setPayingOrder(o)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/25 hover:bg-primary/20"
                    >
                      <CreditCard className="h-4 w-4" /> Payment
                    </button>
                    <button
                      onClick={() => handleReturn(o)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive ring-1 ring-inset ring-destructive/25 hover:bg-destructive/20"
                    >
                      <RotateCcw className="h-4 w-4" /> Return
                    </button>
                  </>
                )}
                {!o.status.startsWith("Unpaid") &&
                  [
                    "Processing",
                    "To Deliver",
                    "To Deliver and Bill",
                    "To Bill",
                    "Draft",
                    "On Hold",
                  ].includes(o.status) && (
                    <button
                      onClick={() => cancelOrder(o.id)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Order
                    </button>
                  )}
                {["Cancelled", "Completed", "Delivered"].includes(o.status) && (
                  <button
                    onClick={() => removeOrder(o.id)}
                    className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  >
                    <XCircle className="h-4 w-4" /> Remove Order
                  </button>
                )}
                <button className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white">
                  <RotateCcw className="h-4 w-4" /> Buy Again
                </button>
              </div>
            </DashCard>
          ))}
        </div>
      )}

      <PaymentModal
        open={payingOrder !== null}
        order={payingOrder}
        onClose={() => setPayingOrder(null)}
        onDone={() => setPayingOrder(null)}
      />
    </div>
  );
}

function PaymentModal({
  open,
  order,
  onClose,
  onDone,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { paymentModes, fetchPaymentModes, paymentOrder } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ mode_of_payment: "Cash", amount: "", reference_no: "" });

  useEffect(() => {
    if (!open || !order) return;
    setError("");
    setSaving(false);
    fetchPaymentModes();
    setForm({
      mode_of_payment: "Cash",
      amount:
        order.outstandingAmount != null ? String(order.outstandingAmount) : String(order.total),
      reference_no: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  if (!open || !order) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    const ok = await paymentOrder(order.id, {
      mode_of_payment: form.mode_of_payment || "Cash",
      amount: Number(form.amount) > 0 ? Number(form.amount) : undefined,
      reference_no: form.reference_no || undefined,
    });
    setSaving(false);
    if (!ok) {
      setError("Payment could not be recorded. Please try again.");
      return;
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-md" onClick={onClose} />
      <div className="pointer-events-auto relative w-full max-w-md rounded-t-2xl bg-card p-5 shadow-lg sm:rounded-2xl text-ink max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Order action
            </p>
            <h2 className="font-display text-lg font-bold text-ink">Record Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span className="text-muted-foreground">Order</span>
            <span className="font-mono">{order.id}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-bold">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="text-ink">
              {formatPKR(order.outstandingAmount != null ? order.outstandingAmount : order.total)}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Mode of Payment
            </span>
            <select
              value={form.mode_of_payment}
              onChange={(e) => setForm((f) => ({ ...f, mode_of_payment: e.target.value }))}
              className="h-10 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {paymentModes.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
              {paymentModes.length === 0 && <option value="Cash">Cash</option>}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Amount (PKR)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="h-10 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Outstanding amount"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Reference No (optional)
            </span>
            <input
              value={form.reference_no}
              onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
              className="h-10 w-full rounded-xl border border-border bg-card px-3.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Transaction ID / Voucher No"
            />
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-ink hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-xs font-bold text-white shadow-md shadow-primary/25 transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            {saving ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
