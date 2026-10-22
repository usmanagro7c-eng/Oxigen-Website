import { Facebook, Instagram, Mail, Phone } from "lucide-react";
import oxigenLogo from "@/assets/oxigen-logo.png";
import { Link } from "@tanstack/react-router";
import { useBrand, useNav } from "@/lib/site-content";

export function Footer() {
  const brand = useBrand();
  const nav = useNav();
  return (
    <footer className="relative mt-8 overflow-hidden px-3 pb-5 safe-pl safe-pr sm:px-5">
      <div className="mx-auto max-w-6xl rounded-3xl glass p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Socials */}
          <div className="space-y-3">
            <Link to="/" className="inline-block" aria-label="OxiGen home">
              <img
                src={oxigenLogo}
                alt="OxiGen — Pakistan's No.1 Vitamin Brand"
                className="h-7 w-auto sm:h-8"
              />
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
              {brand.tagline}. Premium health & wellness supplements for everyday wellbeing.
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={brand.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white/50 text-muted-foreground transition-all hover:bg-white hover:text-primary hover:scale-105"
              >
                <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={brand.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white/50 text-muted-foreground transition-all hover:bg-white hover:text-primary hover:scale-105"
              >
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${brand.email}`}
                aria-label="Email"
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white/50 text-muted-foreground transition-all hover:bg-white hover:text-primary hover:scale-105"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={brand.phoneHref}
                aria-label="Phone"
                className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-white/50 text-muted-foreground transition-all hover:bg-white hover:text-primary hover:scale-105"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Quick Links + Policies side-by-side on mobile */}
          <div className="grid grid-cols-2 gap-6 sm:contents">
            {/* Quick Links */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                Quick Links
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs">
                {nav.slice(0, 5).map((n) => (
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

            {/* Customer Care & Policies */}
            <div>
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                Policies & Support
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs">
                <li>
                  <Link
                    to="/shipping-policy"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/refund-policy"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
              Newsletter
            </h4>
            <p className="mt-2 text-xs text-muted-foreground">
              Get wellness tips and exclusive seasonal offers.
            </p>
            <form className="mt-2 flex gap-1.5" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Your email"
                className="min-h-[40px] flex-1 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs outline-none backdrop-blur focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                className="touch-target shrink-0 rounded-xl bg-gradient-to-r from-primary to-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 flex flex-col items-center justify-between gap-1 border-t border-white/30 pt-3 text-[10px] text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} OxiGen. All rights reserved.</p>
          <p className="text-muted-foreground/80">Pakistan's No.1 Vitamin Brand</p>
        </div>
      </div>
    </footer>
  );
}