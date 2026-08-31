import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Lock, ShoppingBag, ArrowRight } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore, type OrderPlaced } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — OxiGen" },
      {
        name: "description",
        content:
          "Complete your OxiGen order with secure checkout and cash on delivery available across Pakistan.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cartItems, subtotal, placeOrder, user } = useStore();
  const [placed, setPlaced] = useState<OrderPlaced | null>(null);
  const [method, setMethod] = useState("Cash on Delivery");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    city: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Valid email required";
    if (!/^[0-9+\-\s]{7,}$/.test(form.phone)) errs.phone = "Valid phone required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.city.trim()) errs.city = "City is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const order = await placeOrder({
      items: cartItems.map((i) => ({ slug: i.slug, qty: i.qty })),
      customer: form,
      paymentMethod: method,
    });
    if (order) {
      setPlaced(order);
      window.scrollTo({ top: 0 });
    }
  };

  if (placed) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-5 pt-40 pb-24 text-center">
          <Reveal>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald/15 text-emerald">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Order Confirmed!</h1>
            <p className="mt-3 text-muted-foreground">
              Thank you, {placed.customer?.name || "Customer"}. Your order{" "}
              <span className="font-semibold text-ink">{placed.id}</span> has been placed. We'll
              deliver it to your doorstep in 2–4 business days.
            </p>
            <div className="mt-6 rounded-3xl glass p-6 text-left">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total paid</span>
                <span className="font-extrabold text-ink">{formatPKR(placed.total)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/shop"
                className="rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
              >
                Continue Shopping
              </Link>
              {user && (
                <Link
                  to="/dashboard/orders"
                  className="rounded-xl glass px-6 py-3 text-sm font-semibold text-ink"
                >
                  View Orders
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </SiteLayout>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-5 pt-40 pb-24 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingBag className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some products before checking out.</p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Go to Shop
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const field = (name: keyof typeof form, label: string, type = "text") => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        className="w-full rounded-xl border border-border bg-white/60 px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-primary"
      />
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Checkout"
        title="Secure Checkout"
        sub="Cash on delivery available — pay when your order arrives."
      />

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-8 lg:grid-cols-3">
          <form onSubmit={submit} className="space-y-4 rounded-3xl glass p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-bold text-ink">Shipping Details</h2>
            {field("name", "Full Name")}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("email", "Email", "email")}
              {field("phone", "Phone", "tel")}
            </div>
            {field("address", "Street Address")}
            {field("city", "City")}

            <div className="pt-2">
              <h3 className="mb-3 text-sm font-semibold text-ink">Payment Method</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Cash on Delivery", "Bank Transfer"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      method === m
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <span className="text-sm font-medium text-ink">{m}</span>
                    <div className={`h-4 w-4 rounded-full border-2 transition-all ${
                      method === m ? "border-primary bg-primary" : "border-muted"
                    }`}>
                      {method === m && <div className="m-auto h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg"
            >
              <Lock className="h-4 w-4" /> Place Order — {formatPKR(subtotal)}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              By placing your order you agree to our terms. Your information is secure.
            </p>
          </form>

          <div className="rounded-3xl glass p-6">
            <h2 className="font-display text-lg font-bold text-ink">Order Summary</h2>
            <div className="mt-4 space-y-3">
              {cartItems.map((i) => (
                <div key={i.slug} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    <img src={i.img} alt={i.name} className="h-full w-full object-contain p-1" />
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {i.qty}
                    </span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="line-clamp-1 font-medium text-ink">{i.name}</p>
                    <p className="text-muted-foreground">
                      {formatPKR(i.price)} × {i.qty}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {formatPKR(i.price * i.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-4 border-t border-border" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-semibold text-emerald">Free</span>
              </div>
              <div className="flex justify-between pt-2 text-base">
                <span className="font-bold text-ink">Total</span>
                <span className="font-extrabold text-ink">{formatPKR(subtotal)}</span>
              </div>
            </div>
            <Link
              to="/cart"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Edit cart <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
