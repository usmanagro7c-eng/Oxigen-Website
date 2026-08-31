import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — OxiGen" },
      {
        name: "description",
        content:
          "Review the supplements in your OxiGen cart and proceed to a fast, secure checkout with free shipping across Pakistan.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { cartItems, subtotal, setQty, removeFromCart } = useStore();

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Cart"
        title="Your Shopping Cart"
        sub="Free shipping on every order across Pakistan."
      />

      <section className="mx-auto max-w-6xl px-5 pb-24">
        {cartItems.length === 0 ? (
          <Reveal>
            <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl glass px-6 py-16 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
                <ShoppingBag className="h-7 w-7" />
              </span>
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link
                to="/shop"
                className="rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
              >
                Start Shopping
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item, i) => (
                <Reveal key={item.slug} delay={i * 0.05}>
                  <div className="flex gap-4 rounded-3xl glass p-4">
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="h-full w-full object-contain p-2"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            to="/product/$slug"
                            params={{ slug: item.slug }}
                            className="font-display font-bold text-ink hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-0.5 text-sm text-primary">{item.subtitle}</p>
                        </div>
                        <button
                          aria-label="Remove"
                          onClick={() => removeFromCart(item.slug)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center gap-2 rounded-xl glass p-1">
                          <button
                            aria-label="Decrease"
                            onClick={() => setQty(item.slug, item.qty - 1)}
                            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/60"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                          <button
                            aria-label="Increase"
                            onClick={() => setQty(item.slug, item.qty + 1)}
                            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/60"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-lg font-extrabold text-ink">
                          {formatPKR(item.price * item.qty)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <div className="sticky top-28 rounded-3xl glass p-6">
                <h2 className="font-display text-lg font-bold text-ink">Order Summary</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-ink">{formatPKR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald">Free</span>
                  </div>
                  <div className="my-2 border-t border-border" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-ink">Total</span>
                    <span className="font-extrabold text-ink">{formatPKR(subtotal)}</span>
                  </div>
                </div>
                <Link
                  to="/checkout"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg"
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary" /> Free delivery in 2–4 business days
                </p>
              </div>
            </Reveal>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
