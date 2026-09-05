import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  CheckCircle2,
  Circle,
  Ban,
  RotateCcw,
  X,
  RefreshCw,
} from "lucide-react";
import {
  DashCard,
  SectionHeader,
  StatusBadge,
  orderTone,
  payTone,
} from "@/components/dashboard/DashboardShell";
import { formatPKR } from "@/lib/site-data";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

import { API_BASE } from "@/lib/api";

type OrderDetailItem = {
  slug?: string;
  item_name?: string;
  name?: string;
  image?: string;
  qty?: number;
  rate?: number;
};

type OrderDetailData = {
  name?: string;
  transaction_date?: string;
  status?: string;
  display_status?: string;
  invoice_name?: string | null;
  invoice_status?: string | null;
  outstanding_amount?: number | null;
  delivery_date?: string;
  payment_method?: string;
  courier?: string;
  tracking_number?: string;
  customer_name?: string;
  address_display?: string;
  billing_address_display?: string;
  shipping_address_display?: string;
  items?: OrderDetailItem[];
  net_total?: number;
  grand_total?: number;
  total_taxes_and_charges?: number;
  discount_amount?: number;
  [key: string]: unknown;
};

const parseAddressDisplay = (display: string, defaultName = "Customer Address") => {
  if (!display) {
    return {
      name: defaultName,
      phone: "",
      line1: "Not specified",
      city: "",
      province: "",
      postal: "",
    };
  }
  const lines = display
    .split(/<br\s*\/?>|\n/gi)
    .map((l: string) => l.trim())
    .filter(Boolean);
  const phoneLine = lines.find((l: string) => l.toLowerCase().includes("phone:"));
  const phone = phoneLine ? phoneLine.replace(/phone:\s*/i, "") : "";
  const cleanLines = lines.filter((l: string) => !l.toLowerCase().includes("phone:"));
  const name = cleanLines[0] || defaultName;
  const line1 = cleanLines.slice(1, -2).join(", ") || cleanLines[1] || "";
  const cityProvPostal = cleanLines[cleanLines.length - 2] || "";
  const country = cleanLines[cleanLines.length - 1] || "";

  return {
    name,
    phone,
    line1: line1 || cityProvPostal || country,
    city: "",
    province: "",
    postal: "",
  };
};

const buildTimeline = (status: string, date: string) => {
  const steps = ["Confirmed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"];
  let upto = "Confirmed";
  if (status === "Cancelled") {
    return [
      { label: "Confirmed", date: date, done: true },
      { label: "Cancelled", date: date, done: true },
    ];
  }
  if (status === "Completed") {
    upto = "Delivered";
  } else if (status === "To Deliver" || status === "To Deliver and Bill" || status === "To Bill") {
    upto = "Packed";
  } else {
    upto = "Processing";
  }

  const idx = steps.indexOf(upto);
  return steps.map((s, i) => ({
    label: s,
    date: i <= idx ? `${date} · Active` : "—",
    done: i <= idx,
  }));
};

export const Route = createFileRoute("/dashboard/orders/$orderId")({
  head: ({ params }) => ({
    meta: [{ title: `Order ${params.orderId} — OxiGen` }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ params }) => {
    try {
      const res = await fetch(`${API_BASE}/user/orders/${encodeURIComponent(params.orderId)}`, {
        credentials: "include",
      }).then((r) => r.json());
      if (!res.data) throw notFound();
      return { orderData: res.data };
    } catch {
      throw notFound();
    }
  },
  component: OrderDetailsPage,
  notFoundComponent: () => (
    <DashCard>
      <p className="text-sm text-muted-foreground">Order not found.</p>
      <Link
        to="/dashboard/orders"
        className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
      >
        Back to orders
      </Link>
    </DashCard>
  ),
});

function OrderDetailsPage() {
  const { orderData } = Route.useLoaderData() as { orderData: OrderDetailData };
  const { returnOrder } = useStore();
  const [cancelling, setCancelling] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const navigate = useNavigate();

  const displayStatus = orderData.display_status || orderData.status || "To Deliver and Bill";
  const isUnpaid = displayStatus === "Unpaid";

  const mappedItems = (orderData.items || []).map((it: OrderDetailItem) => {
    return {
      slug: it.slug ?? "",
      name: it.item_name || it.name || it.slug || "Item",
      img: it.image || "/products/fallback-image.jpg",
      qty: it.qty ?? 0,
      price: it.rate ?? 0,
    };
  });

  const billingAddr = parseAddressDisplay(
    orderData.address_display || orderData.billing_address_display || "",
    orderData.customer_name ?? "Customer",
  );
  const shippingAddr = parseAddressDisplay(
    orderData.shipping_address_display || orderData.address_display || "",
    orderData.customer_name ?? "Customer",
  );

  const order = {
    id: orderData.name ?? "",
    date: orderData.transaction_date ?? "",
    status: displayStatus,
    paymentStatus:
      String(orderData.invoice_status || "").toLowerCase() === "paid" ? "Paid" : "Pending",
    paymentMethod: orderData.payment_method || "Cash on Delivery",
    courier: orderData.courier || "TCS Express",
    tracking: orderData.tracking_number || "TCS-Pending",
    eta: orderData.delivery_date
      ? new Date(orderData.delivery_date).toLocaleDateString()
      : "2–4 days",
    items: mappedItems,
    subtotal: orderData.net_total ?? orderData.grand_total ?? 0,
    shipping: orderData.total_taxes_and_charges ?? 0,
    discount: orderData.discount_amount ?? 0,
    total: orderData.grand_total ?? 0,
    billing: billingAddr,
    shipping_address: shippingAddr,
    timeline: buildTimeline(displayStatus, orderData.transaction_date ?? ""),
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      const csrfRes = await fetch(`${API_BASE}/csrf-token`, { credentials: "include" }).then((r) =>
        r.json(),
      );
      const csrfToken = csrfRes.csrfToken;

      const res = await fetch(`${API_BASE}/user/orders/${encodeURIComponent(order.id)}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken },
        credentials: "include",
      }).then((r) => r.json());

      if (res.message) {
        toast.success(res.message);
        navigate({ to: "/dashboard/orders" });
      } else {
        toast.error(res.error || "Failed to cancel order.");
      }
    } catch {
      toast.error("Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReturn = async () => {
    if (
      !confirm(
        `Return order ${order.id}?\n\nThe order will be cancelled and deducted stock will be restored.`,
      )
    )
      return;
    setCancelling(true);
    const ok = await returnOrder(order.id);
    setCancelling(false);
    if (ok) navigate({ to: "/dashboard/orders" });
  };

  const isCancellable =
    !isUnpaid &&
    ["To Deliver and Bill", "To Deliver", "To Bill", "Draft", "On Hold"].includes(
      orderData.status ?? "",
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/orders"
          className="touch-target inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        {isUnpaid && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPayOpen(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/20"
            >
              <CreditCard className="h-4 w-4" /> Payment
            </button>
            <button
              onClick={handleReturn}
              disabled={cancelling}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> {cancelling ? "Processing…" : "Return"}
            </button>
          </div>
        )}
        {isCancellable && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" /> {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
      </div>

      <PaymentModal
        open={payOpen}
        orderId={order.id}
        amount={
          orderData.outstanding_amount != null ? Number(orderData.outstanding_amount) : order.total
        }
        onClose={() => setPayOpen(false)}
        onDone={() => {
          setPayOpen(false);
          navigate({ to: "/dashboard/orders" });
        }}
      />

      <DashCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Order
            </p>
            <h2 className="font-display text-xl font-extrabold text-ink">{order.id}</h2>
            <p className="text-xs text-muted-foreground">
              Placed on {new Date(order.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={order.paymentStatus} tone={payTone(order.paymentStatus)} />
            <StatusBadge status={order.status} tone={orderTone(order.status)} />
          </div>
        </div>
      </DashCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DashCard>
            <SectionHeader title="Items" />
            <ul className="divide-y divide-border/60">
              {order.items.map((it) => (
                <li key={it.slug} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                    <img
                      src={it.img}
                      alt={it.name}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {it.qty} × {formatPKR(it.price)}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-ink">{formatPKR(it.price * it.qty)}</p>
                </li>
              ))}
            </ul>
          </DashCard>

          <DashCard>
            <SectionHeader title="Order Timeline" />
            <ol className="relative space-y-4 border-l-2 border-border/70 pl-5">
              {order.timeline.map((t) => (
                <li key={t.label} className="relative">
                  <span
                    className={`absolute -left-[27px] top-0 grid h-5 w-5 place-items-center rounded-full ${t.done ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-secondary text-muted-foreground"}`}
                  >
                    {t.done ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Circle className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <p
                    className={`text-sm font-semibold ${t.done ? "text-ink" : "text-muted-foreground"}`}
                  >
                    {t.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                </li>
              ))}
            </ol>
          </DashCard>
        </div>

        <div className="space-y-5">
          <DashCard>
            <SectionHeader title="Price Breakdown" />
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatPKR(order.subtotal)} />
              <Row
                label="Shipping"
                value={order.shipping === 0 ? "Free" : formatPKR(order.shipping)}
              />
              <Row
                label="Discount"
                value={`- ${formatPKR(order.discount)}`}
                accent="text-emerald"
              />
              <div className="my-2 h-px bg-border/70" />
              <Row label="Grand Total" value={formatPKR(order.total)} bold />
            </dl>
          </DashCard>

          <DashCard>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Payment
            </p>
            <p className="text-sm font-semibold text-ink">{order.paymentMethod}</p>
            <p className="mt-1 text-xs text-muted-foreground">Status: {order.paymentStatus}</p>
          </DashCard>

          <DashCard>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Shipping Address
            </p>
            <AddressBlock a={order.shipping_address} />
          </DashCard>

          <DashCard>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Billing Address
            </p>
            <AddressBlock a={order.billing} />
          </DashCard>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-muted-foreground ${bold ? "font-semibold text-ink" : ""}`}>{label}</dt>
      <dd
        className={`${bold ? "text-base font-black text-ink" : "font-semibold text-ink"} ${accent ?? ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function AddressBlock({
  a,
}: {
  a: { name: string; phone: string; line1: string; city: string; province: string; postal: string };
}) {
  return (
    <div className="text-sm text-ink">
      <p className="font-semibold">{a.name}</p>
      <p className="text-muted-foreground">{a.phone}</p>
      <p className="mt-1">{a.line1}</p>
      <p>
        {a.city}, {a.province} {a.postal}
      </p>
    </div>
  );
}

function PaymentModal({
  open,
  orderId,
  amount,
  onClose,
  onDone,
}: {
  open: boolean;
  orderId: string;
  amount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { paymentModes, fetchPaymentModes, paymentOrder } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ mode_of_payment: "Cash", amount: "", reference_no: "" });

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);
    fetchPaymentModes();
    setForm({
      mode_of_payment: "Cash",
      amount: amount > 0 ? String(amount) : "",
      reference_no: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, amount]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    const ok = await paymentOrder(orderId, {
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
      <div className="pointer-events-auto relative w-full max-w-md rounded-t-2xl bg-card p-5 text-ink shadow-lg sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Order action
            </p>
            <h2 className="font-display text-lg font-bold">Record Payment</h2>
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
            <span className="font-mono">{orderId}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-bold">
            <span className="text-muted-foreground">Outstanding</span>
            <span>{formatPKR(amount)}</span>
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
