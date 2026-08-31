import { Link } from "@tanstack/react-router";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatPKR } from "@/lib/site-data";
import { useStore } from "@/lib/store";
import { API_BASE, getProductImage } from "@/lib/api";
import { Reveal } from "./Reveal";

export function TrendingGrid() {
  const { addToCart } = useStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["bestSellers"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/items`);
      if (!res.ok) throw new Error("Failed to fetch best sellers");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error || !data || !data.data) return null;

  const catalog = data.data;

  return (
    <section className="mx-auto max-w-[1400px] px-3 py-12 sm:px-5" aria-labelledby="trending">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Trending Now
          </span>
          <h2 id="trending" className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Best Sellers
          </h2>
        </div>
        <Link
          to="/shop"
          className="shrink-0 rounded-xl glass px-4 py-2.5 text-xs font-bold text-primary sm:text-sm"
        >
          View All
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((p: any, idx: number) => {
          const price = p.standard_rate || 0;
          const was = p.valuation_rate || 0;
          const off = was > price ? Math.round(((was - price) / was) * 100) : 0;
          const slug = p.route?.split("/").pop() || "";
          const img = getProductImage(p.image);

          return (
            <Reveal key={p.item_code} delay={idx * 0.06}>
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl glass transition-transform duration-300 hover:-translate-y-1.5">
                <Link to="/product/$slug" params={{ slug }} className="relative block">
                  {off > 0 && (
                    <span className="absolute left-3 top-3 z-10 rounded-lg bg-gradient-to-r from-primary to-accent px-2.5 py-1 text-[11px] font-extrabold text-white">
                      {off}% OFF
                    </span>
                  )}
                  <span className="absolute right-3 top-3 z-10 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] font-bold text-ink">
                    {p.tag || 'Popular'}
                  </span>
                  <img
                    src={img}
                    alt={p.item_name}
                    loading="lazy"
                    className="aspect-square w-full bg-white object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <Link to="/product/$slug" params={{ slug }}>
                    <h3 className="font-display text-lg font-bold leading-snug text-ink">{p.item_name}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground">{p.short_description}</p>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl font-extrabold text-gradient">
                        {formatPKR(price)}
                      </span>
                      {was > price && (
                        <span className="pb-0.5 text-sm text-muted-foreground line-through">
                          {formatPKR(was)}
                        </span>
                      )}
                    </div>
                    {typeof p.custom_stock_qty === "number" && (
                      p.custom_stock_qty > 0 ? (
                        <span className="text-[11px] font-bold text-emerald-600">
                          {p.custom_stock_qty} in stock
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-500">
                          Out of stock
                        </span>
                      )
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => addToCart(slug)}
                      disabled={(p.custom_stock_qty ?? 0) <= 0}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingBag className="h-4 w-4" /> {(p.custom_stock_qty ?? 0) > 0 ? "Buy Now" : "Out of Stock"}
                    </button>
                    <Link
                      to="/product/$slug"
                      params={{ slug }}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:bg-muted"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
