import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ShoppingBag, Heart, User as UserIcon, ShoppingCart } from "lucide-react";
import { nav } from "@/lib/site-data";
import { useStore } from "@/lib/store";
import oxigenLogo from "@/assets/oxigen-logo.png";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { cartCount, wishlist, user, setDrawerOpen } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-2 z-50 px-2 sm:top-8 sm:px-5 sm:pt-3"
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2.5 transition-all duration-500 sm:px-6 sm:py-3 ${
          scrolled
            ? "border border-white/60 bg-white shadow-lg shadow-primary/10 backdrop-blur-xl"
            : "border border-transparent bg-white/70 backdrop-blur-md"
        }`}
      >
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center"
          aria-label="OxiGen home"
        >
          <img
            src={oxigenLogo}
            alt="OxiGen — Pakistan's No.1 Vitamin Brand"
            className="h-7 w-auto sm:h-9"
          />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {nav
            .filter((n) => n.to !== "/shop")
            .map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => n.to === "/" && window.scrollTo({ top: 0, behavior: 'smooth' })}
                activeOptions={{ exact: n.to === "/" }}
                className="group relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
                activeProps={{ className: "text-ink" }}
              >
                {n.label}
                <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-primary to-accent transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative grid h-10 w-10 place-items-center rounded-xl glass text-ink transition-colors hover:text-primary"
          >
            <Heart className="h-5 w-5" />
            {wishlist.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-r from-primary to-accent px-1 text-[10px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </Link>

          <Link
            to={user ? "/account" : "/signin"}
            aria-label={user ? "Account" : "Sign in"}
            className="grid h-10 w-10 place-items-center rounded-xl glass text-ink transition-colors hover:text-primary"
          >
            <UserIcon className="h-5 w-5" />
          </Link>

          <button
            aria-label="Cart"
            onClick={() => setDrawerOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-xl glass text-ink transition-colors hover:text-primary"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-r from-primary to-accent px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

          <Link
            to="/shop"
            className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-transform duration-300 hover:scale-105 md:inline-flex"
          >
            Shop Now <ShoppingBag className="h-4 w-4" />
          </Link>

          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl glass md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto mt-2 max-w-6xl rounded-2xl glass p-3 md:hidden"
          >
            {nav
              .filter((n) => n.to !== "/shop")
              .map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => {
                    setOpen(false);
                    if (n.to === "/") window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-ink hover:bg-white/50"
                >
                  {n.label}
                </Link>
              ))}
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Shop Now <ShoppingBag className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
