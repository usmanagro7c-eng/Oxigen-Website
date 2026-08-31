import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, CreditCard, CheckCircle2, Circle, Ban } from "lucide-react";
import {
  DashCard,
  SectionHeader,
  StatusBadge,
  orderTone,
  payTone,
} from "@/components/dashboard/DashboardShell";
import { formatPKR } from "@/lib/site-data";
import { toast } from "sonner";

import { API_BASE } from "@/lib/api";

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
      { label: "Cancelled", date: date, done: true }
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
    label: s as any,
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
      <Link to="/dashboard/orders" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
        Back to orders
      </Link>
    </DashCard>
  ),
});

function OrderDetailsPage() {
  const { orderData } = Route.useLoaderData() as { orderData: any };
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  const mappedItems = (orderData.items || []).map((it: any) => {
    return {
      slug: it.slug,
      name: it.item_name || it.name || it.slug,
      img: it.image || "/products/fallback-image.jpg",
      qty: it.qty,
      price: it.rate,
    };
  });

  const billingAddr = parseAddressDisplay(orderData.address_display || orderData.billing_address_display || "", orderData.customer_name);
  const shippingAddr = parseAddressDisplay(orderData.shipping_address_display || orderData.address_display || "", orderData.customer_name);

  const order = {
    id: orderData.name,
    date: orderData.transaction_date,
    status: orderData.status || "To Deliver",
    paymentStatus: orderData.payment_status === "Paid" ? "Paid" : "Pending",
    paymentMethod: orderData.payment_method || "Cash on Delivery",
    courier: orderData.courier || "TCS Express",
    tracking: orderData.tracking_number || "TCS-Pending",
    eta: orderData.delivery_date ? new Date(orderData.delivery_date).toLocaleDateString() : "2–4 days",
    items: mappedItems,
    subtotal: orderData.net_total || orderData.grand_total,
    shipping: orderData.total_taxes_and_charges || 0,
    discount: orderData.discount_amount || 0,
    total: orderData.grand_total,
    billing: billingAddr,
    shipping_address: shippingAddr,
    timeline: buildTimeline(orderData.status, orderData.transaction_date),
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      const csrfRes = await fetch(`${API_BASE}/csrf-token`, { credentials: "include" }).then(r => r.json());
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

  const isCancellable = ["To Deliver and Bill", "To Deliver", "To Bill", "Draft", "On Hold"].includes(orderData.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        {isCancellable && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" /> {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
      </div>

      <DashCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</p>
            <h2 className="font-display text-xl font-extrabold text-ink">{order.id}</h2>
            <p className="text-xs text-muted-foreground">Placed on {new Date(order.date).toLocaleDateString()}</p>
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
              {order.items.map((it: any) => (
                <li key={it.slug} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                    <img src={it.img} alt={it.name} className="h-full w-full object-contain p-1.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {it.qty} × {formatPKR(it.price)}</p>
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
                  <span className={`absolute -left-[27px] top-0 grid h-5 w-5 place-items-center rounded-full ${t.done ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-secondary text-muted-foreground"}`}>
                    {t.done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                  </span>
                  <p className={`text-sm font-semibold ${t.done ? "text-ink" : "text-muted-foreground"}`}>{t.label}</p>
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
              <Row label="Shipping" value={order.shipping === 0 ? "Free" : formatPKR(order.shipping)} />
              <Row label="Discount" value={`- ${formatPKR(order.discount)}`} accent="text-emerald" />
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

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`text-muted-foreground ${bold ? "font-semibold text-ink" : ""}`}>{label}</dt>
      <dd className={`${bold ? "text-base font-black text-ink" : "font-semibold text-ink"} ${accent ?? ""}`}>{value}</dd>
    </div>
  );
}

function AddressBlock({ a }: { a: { name: string; phone: string; line1: string; city: string; province: string; postal: string } }) {
  return (
    <div className="text-sm text-ink">
      <p className="font-semibold">{a.name}</p>
      <p className="text-muted-foreground">{a.phone}</p>
      <p className="mt-1">{a.line1}</p>
      <p>{a.city}, {a.province} {a.postal}</p>
    </div>
  );
}
