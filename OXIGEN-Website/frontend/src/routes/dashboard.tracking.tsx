import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Truck, Package, CheckCircle2, Circle, Copy, MapPin } from "lucide-react";
import { DashCard, SectionHeader, StatusBadge, orderTone, EmptyState } from "@/components/dashboard/DashboardShell";
import { useStore } from "@/lib/store";
import { catalog } from "@/lib/site-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/tracking")({
  head: () => ({ meta: [{ title: "Order Tracking — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: TrackingPage,
});

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

function TrackingPage() {
  const { orders } = useStore();
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orders.length > 0 && !selectedId) {
      setSelectedId(orders[0]?.id);
    }
  }, [orders, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`${API_BASE}/user/orders/${encodeURIComponent(selectedId)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setOrderData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No orders to track"
        desc="You haven't placed any orders yet. Start shopping to track your wellness packages."
        action={
          <Link to="/shop" className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white">
            Go to Shop
          </Link>
        }
      />
    );
  }

  const order = orderData ? {
    id: orderData.name,
    date: orderData.transaction_date,
    status: orderData.status || "To Deliver",
    paymentStatus: orderData.payment_status === "Paid" ? "Paid" : "Pending",
    paymentMethod: orderData.payment_method || "Cash on Delivery",
    courier: orderData.courier || "TCS Express",
    tracking: orderData.tracking_number || "TCS-Pending",
    eta: orderData.delivery_date ? new Date(orderData.delivery_date).toLocaleDateString() : "2–4 days",
    items: (orderData.items || []).map((it: any) => {
      const product = catalog.find((c) => c.slug === it.item_code);
      return {
        slug: it.item_code,
        name: it.item_name || product?.name || it.item_code,
        img: product?.img || "",
        qty: it.qty,
      };
    }) as Array<{ slug: string; name: string; img: string; qty: number }>,
    shipping_address: parseAddressDisplay(orderData.shipping_address_display || orderData.address_display || "", orderData.customer_name),
    timeline: buildTimeline(orderData.status, orderData.transaction_date),
  } : null;

  const completed = order?.timeline.filter((t) => t.done).length || 0;
  const totalTimeline = order?.timeline.length || 1;
  const percent = Math.round((completed / totalTimeline) * 100);

  return (
    <div className="space-y-5">
      <DashCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">Track Order:</span>
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedId === o.id
                  ? "bg-gradient-to-r from-primary to-accent text-white"
                  : o.status === "Cancelled"
                    ? "bg-destructive/20 text-destructive line-through"
                    : "bg-white/70 text-ink hover:bg-white"
              }`}
            >
              {o.id}
            </button>
          ))}
        </div>
      </DashCard>

      {loading && (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-sm font-semibold">Loading tracking progress...</p>
        </div>
      )}

      {!loading && order && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DashCard className="lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionHeader title="Delivery Progress" />
                <StatusBadge status={order.status} tone={orderTone(order.status)} />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                <p className="font-display text-lg font-bold text-ink">{order.eta}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Order placed</span>
                <span>{percent}% complete</span>
                <span>Delivered</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-emerald transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Horizontal steps (desktop) */}
            <div className="hidden lg:block">
              <ol className="relative flex justify-between">
                <div className="absolute left-4 right-4 top-4 -z-0 h-0.5 bg-border/70" />
                {order.timeline.map((t) => (
                  <li key={t.label} className="relative z-10 flex flex-col items-center text-center" style={{ width: `${100 / order.timeline.length}%` }}>
                    <span className={`grid h-9 w-9 place-items-center rounded-full ${t.done ? "bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/25" : "bg-secondary text-muted-foreground"}`}>
                      {t.done ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Circle className="h-3.5 w-3.5" />}
                    </span>
                    <p className={`mt-2 text-xs font-semibold ${t.done ? "text-ink" : "text-muted-foreground"}`}>{t.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t.date}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Vertical steps (mobile) */}
            <ol className="relative space-y-4 border-l-2 border-border/70 pl-5 lg:hidden">
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

          <div className="space-y-5">
            <DashCard>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Courier
              </p>
              <p className="font-display text-lg font-bold text-ink">{order.courier}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracking Number</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-ink">
                  {order.tracking}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(order.tracking);
                    toast.success("Tracking number copied");
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/70 text-ink ring-1 ring-inset ring-border hover:bg-white"
                  aria-label="Copy tracking number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </DashCard>

            <DashCard>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Package
              </p>
              <ul className="space-y-2 text-sm">
                {order.items.map((it) => (
                  <li key={it.slug} className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary">
                      <img src={it.img} alt="" className="h-full w-full object-contain p-1" />
                    </span>
                    <span className="line-clamp-1 flex-1 text-ink">{it.name}</span>
                    <span className="text-xs text-muted-foreground">× {it.qty}</span>
                  </li>
                ))}
              </ul>
            </DashCard>

            <DashCard>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Delivering To
              </p>
              <p className="text-sm font-semibold text-ink">{order.shipping_address.name}</p>
              <p className="text-sm text-muted-foreground">
                {order.shipping_address.line1}
              </p>
            </DashCard>
          </div>
        </div>
      )}
    </div>
  );
}
