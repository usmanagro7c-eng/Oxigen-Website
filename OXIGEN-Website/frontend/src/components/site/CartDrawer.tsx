import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

const FOCUSABLE_SELECTOR =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** All focusable, visible, enabled elements within a container. */
function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, cartItems, subtotal, setQty, removeFromCart } = useStore();
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Trap focus inside the drawer while it is open, and restore focus to the
  // element that opened it when it closes.
  useEffect(() => {
    if (!drawerOpen) return;

    const drawer = drawerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : document.body;

    // Move focus into the drawer (first focusable element, i.e. the close button).
    if (drawer) {
      const focusables = getFocusables(drawer);
      focusables[0]?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawer) return;

      const focusables = getFocusables(drawer);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      // Focus has escaped the drawer (e.g. it is on <body>): pull it back in.
      if (!drawer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.focus?.();
    };
  }, [drawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
          />
          <motion.aside
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <ShoppingBag className="h-5 w-5 text-primary" /> Your Cart
              </h2>
              <button
                aria-label="Close cart"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl glass"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
                  <ShoppingBag className="h-7 w-7" />
                </span>
                <p className="text-muted-foreground">Your cart is empty.</p>
                <Link
                  to="/shop"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {cartItems.map((item) => (
                    <div key={item.slug} className="flex gap-3 rounded-2xl glass p-3">
                      <Link
                        to="/product/$slug"
                        params={{ slug: item.slug }}
                        onClick={() => setDrawerOpen(false)}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary"
                      >
                        <img
                          src={item.img}
                          alt={item.name}
                          className="h-full w-full object-contain p-1.5"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-sm font-semibold text-ink">
                            {item.name}
                          </h3>
                          <button
                            aria-label="Remove"
                            onClick={() => removeFromCart(item.slug)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="mt-0.5 text-sm font-bold text-primary">
                          {formatPKR(item.price)}
                        </span>
                        <div className="mt-auto flex items-center gap-2">
                          <button
                            aria-label="Decrease"
                            onClick={() => setQty(item.slug, item.qty - 1)}
                            className="grid h-7 w-7 place-items-center rounded-lg glass"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                          <button
                            aria-label="Increase"
                            onClick={() => setQty(item.slug, item.qty + 1)}
                            className="grid h-7 w-7 place-items-center rounded-lg glass"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-extrabold text-ink">{formatPKR(subtotal)}</span>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Shipping is free. Taxes calculated at checkout.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/cart"
                      onClick={() => setDrawerOpen(false)}
                      className="rounded-xl glass px-4 py-3 text-center text-sm font-semibold text-ink"
                    >
                      View Cart
                    </Link>
                    <Link
                      to="/checkout"
                      onClick={() => setDrawerOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white"
                    >
                      Checkout <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
