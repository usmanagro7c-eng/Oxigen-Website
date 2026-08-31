import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShoppingBag, Truck } from "lucide-react";
import { promoBanners } from "@/lib/site-data";
import { Reveal } from "./Reveal";

export function PromoBanners() {
  // Map our hero banner item structure to the promo banner display.
  // This ensures the link always points to the API-resolved product slug,
  // while showing the packaging info for Nutri-Cept or OxiDop.
  return (
    <section className="mx-auto max-w-[1440px] px-3 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            New Packaging Highlights
          </span>
          <h2 className="mt-1 font-display text-2xl font-black text-ink sm:text-3xl">
            Latest Formula Upgrades
          </h2>
        </div>
        <Link
          to="/shop"
          className="rounded-xl glass px-4 py-2 text-xs font-bold text-primary transition-all hover:scale-105"
        >
          View All Products →
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {promoBanners.map((b, i) => {
          // Resolve the correct slug for the product, based on its ID
          const slug = b.id === 'nutri-cept' ? 'nutri-cept' : 'oxidop';

          return (
            <Reveal key={b.href} delay={i * 0.1}>
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-primary/20">
                {/* Background ambient gradient glow */}
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full blur-3xl transition-opacity group-hover:opacity-100 ${
                    i === 0 ? "bg-rose-600/30 opacity-70" : "bg-cyan-600/30 opacity-70"
                  }`}
                />

                <div className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-12 sm:p-8">
                  {/* Text Info */}
                  <div className="flex flex-col gap-3 sm:col-span-7">
                    {b.tag && (
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-sm ${b.badgeBg}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        {b.tag}
                      </span>
                    )}

                    <h3 className="font-display text-xl font-black leading-snug text-white sm:text-2xl">
                      {b.title}
                    </h3>

                    <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">{b.sub}</p>

                    {/* Price & Savings */}
                    {b.price && (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-2xl font-black text-white">
                          {b.price}
                        </span>
                        {b.wasPrice && (
                          <span className="text-xs text-slate-400 line-through">{b.wasPrice}</span>
                        )}
                        {b.discount && (
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-extrabold text-emerald-300">
                            {b.discount}
                          </span>
                        )}
                      </div>
                    )}

                    {/* CTAs */}
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <Link
                        to="/product/$slug"
                        params={{ slug }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {b.cta}
                      </Link>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Truck className="h-3 w-3 text-emerald" /> Free Shipping
                      </span>
                    </div>
                  </div>

                  {/* Packaging Showcase Image */}
                  <div className="flex items-center justify-center sm:col-span-5">
                    <Link
                      to="/product/$slug"
                      params={{ slug }}
                      className="relative block w-full max-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md transition-transform duration-500 group-hover:scale-105"
                    >
                      <img
                        src={b.img}
                        alt={b.title}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-contain drop-shadow-2xl"
                      />
                      <div className="mt-2 text-center text-[10px] font-bold text-slate-300">
                        Authentic New Packaging
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
