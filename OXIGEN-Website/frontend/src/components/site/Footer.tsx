import {
  Facebook,
  Instagram,
  ShieldCheck,
  Lock,
  Truck,
  Wallet,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import oxigenLogo from "@/assets/oxigen-logo.png";
import { Link } from "@tanstack/react-router";
import { brand, nav, categories } from "@/lib/site-data";

export function Footer() {
  return (
    <footer className="relative mt-10 overflow-hidden px-3 pb-6 sm:px-5">
      <div className="mx-auto max-w-6xl rounded-[2.5rem] glass p-10 sm:p-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center" aria-label="OxiGen home">
              <img
                src={oxigenLogo}
                alt="OxiGen — Pakistan's No.1 Vitamin Brand"
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {brand.tagline}. Premium health & wellness supplements for everyday wellbeing.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${brand.email}`}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Mail className="h-4 w-4 text-primary" /> {brand.email}
                </a>
              </li>
              <li>
                <a
                  href={brand.phoneHref}
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-primary" /> {brand.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" /> {brand.location}
              </li>
            </ul>
            <div className="mt-5 flex gap-3">
              <a
                href={brand.facebook}
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center rounded-xl glass transition-transform hover:scale-110"
              >
                <Facebook className="h-4 w-4 text-primary" />
              </a>
              <a
                href={brand.instagram}
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-xl glass transition-transform hover:scale-110"
              >
                <Instagram className="h-4 w-4 text-primary" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-ink">Explore</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {nav.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-ink">Categories</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.title}>
                  <Link
                    to="/categories"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-ink">Newsletter</h4>
            <p className="mt-4 text-sm text-muted-foreground">
              Get wellness tips & exclusive offers.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Email address"
                className="w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2.5 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-primary/30"
              />
              <button className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-white/40 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "100% Authentic" },
            { icon: Wallet, label: "Cash on Delivery" },
            { icon: Lock, label: "Secure Checkout" },
            { icon: Truck, label: "Free Shipping" },
          ].map((b) => (
            <div
              key={b.label}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-white/40 px-4 py-3 text-sm font-semibold text-ink"
            >
              <b.icon className="h-4 w-4 text-primary" />
              {b.label}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/40 pt-6 text-sm text-muted-foreground">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/terms", label: "Terms & Conditions" },
              { to: "/refund-policy", label: "Refund Policy" },
              { to: "/shipping-policy", label: "Shipping Policy" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="transition-colors hover:text-primary">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
            <p>© {new Date().getFullYear()} OxiGen. All rights reserved.</p>
            <p>Pakistan's No.1 Vitamin Brand</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
