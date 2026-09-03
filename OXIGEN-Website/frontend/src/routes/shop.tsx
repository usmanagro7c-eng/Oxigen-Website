import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowUpRight, Truck, ShieldCheck, RotateCcw, ShoppingCart, Heart } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import {
  brand,
  perks,
  slugify,
  formatPKR,
} from "@/lib/site-data";
import { useStore } from "@/lib/store";
import { API_BASE, getProductImage } from "@/lib/api";

export const Route = createFileRoute("/shop")({
  component: Shop,
});

const perkIcons = [Truck, ShieldCheck, RotateCcw];

function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const { addToCart, toggleWishlist, inWishlist } = useStore();

  useEffect(() => {
    fetch(`${API_BASE}/items`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/items/groups`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        setCategories(json.data || []);
        setCatLoading(false);
      })
      .catch(() => {
        setCatLoading(false);
      });
  }, []);

  return (
    <SiteLayout>
      {/* Decorative right-side panel in logo colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-24 bg-gradient-to-b from-primary via-accent to-primary opacity-15 blur-2xl sm:w-40 lg:w-56"
      />
      <PageHeader
        eyebrow="Best Sellings"
        title="Shop All Supplements"
        sub="Quality ingredients, transparent formulations, science-informed nutrition — delivered to your door."
      />

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="grid gap-4 sm:gap-7 grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-3xl bg-secondary glass" />
              ))
            : products.map((p, i) => {
                const slug = p.route?.split("/").pop() || slugify(p.item_name);
                const price = p.standard_rate || 0;
                const was = p.valuation_rate || 0;
                const off = was > price ? Math.round(((was - price) / was) * 100) : 0;
                const stockQty = typeof p.custom_stock_qty === "number" ? p.custom_stock_qty : 0;
                const available = stockQty > 0;
                const saved = inWishlist(slug);
                const img = getProductImage(p.image);

                return (
                  <Reveal key={p.item_code} delay={i * 0.1}>
                    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl glass p-4 sm:p-6 transition-all duration-500 hover:-translate-y-2">
                      <span className="absolute left-4 top-4 z-10 hidden rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold text-white shadow sm:left-6 sm:top-6 sm:inline-block">
                        {p.item_group}
                      </span>
                      {off > 0 && (
                        <span className="absolute right-4 top-4 z-10 rounded-lg bg-gradient-to-r from-primary to-accent px-2.5 py-1 text-[11px] font-extrabold text-white shadow sm:right-6 sm:top-6">
                          {off}% OFF
                        </span>
                      )}
                      <button
                        aria-label="Toggle wishlist"
                        onClick={() => toggleWishlist(slug)}
                        className={`absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full glass transition-colors sm:right-6 sm:top-6 ${saved ? "text-primary" : "text-ink hover:text-primary"}`}
                      >
                        <Heart className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
                      </button>
                      <Link
                        to="/product/$slug"
                        params={{ slug }}
                        className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-white to-secondary sm:mb-6"
                      >
                        <img
                          src={img}
                          alt={`${p.item_name}`}
                          loading="lazy"
                          className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-110 sm:p-6"
                        />
                      </Link>
                      <Link
                        to="/product/$slug"
                        params={{ slug }}
                        className="line-clamp-2 font-display text-base font-bold text-ink hover:text-primary sm:line-clamp-none sm:text-lg"
                      >
                        {p.item_name}
                      </Link>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <p className="text-sm font-medium text-primary">Wellness</p>
                        {available ? (
                          <span className="hidden text-[11px] font-bold text-emerald-600 sm:inline">
                            ● {stockQty} in stock
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">
                            ● Out of stock
                          </span>
                        )}
                      </div>
                      <p className="mt-2 hidden flex-1 text-sm leading-relaxed text-muted-foreground sm:block">
                        {p.short_description || "Premium quality supplement."}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-2 sm:mt-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-extrabold text-ink sm:text-xl">
                            {formatPKR(price)}
                          </span>
                          {was > price && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPKR(was)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addToCart(slug)}
                          disabled={!available}
                          aria-label={`Add ${p.item_name} to cart`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105 sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {available ? (
                            <>
                              <span className="hidden sm:inline">Add </span>
                              <ShoppingCart className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Out of Stock
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {perks.map((p, i) => {
            const Icon = perkIcons[i];
            return (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="flex items-start gap-4 rounded-3xl glass p-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-ink">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="font-display text-2xl font-extrabold text-ink">Shop by Category</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {catLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-3xl bg-secondary glass p-5" />
              ))
            : categories.map((c: any, i: number) => (
                <Reveal key={c.name || i} delay={i * 0.06}>
                  <Link
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="group block overflow-hidden rounded-3xl glass p-5 transition-all duration-500 hover:-translate-y-2"
                  >
                    <div className="mb-4 aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-white">
                      {c.image && (
                        <img
                          src={getProductImage(c.image)}
                          alt={`${c.name} supplements`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      )}
                    </div>
                    <h3 className="font-display font-bold text-ink">{c.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.description || "Browse supplements"}
                    </p>
                  </Link>
                </Reveal>
              ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-4 text-center">
        <a
          href={brand.whatsapp}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald to-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          Order on WhatsApp <ArrowUpRight className="h-4 w-4" />
        </a>
      </section>
    </SiteLayout>
  );
}
