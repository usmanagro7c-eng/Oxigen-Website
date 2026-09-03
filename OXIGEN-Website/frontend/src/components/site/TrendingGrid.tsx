import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatPKR } from "@/lib/site-data";
import { useStore } from "@/lib/store";
import { API_BASE, getProductImage } from "@/lib/api";
import { Reveal } from "./Reveal";

export function TrendingGrid() {
  const { addToCart, setDrawerOpen } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["bestSellers"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/items`);
      if (!res.ok) throw new Error("Failed to fetch best sellers");
      return res.json();
    },
  });

  const catalog = (data?.data || []) as any[];

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scrollByAmount = useCallback((direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("article")?.clientWidth || 320;
    const scrollOffset = direction === "left" ? -(cardWidth + 20) : cardWidth + 20;
    el.scrollBy({ left: scrollOffset, behavior: "smooth" });
  }, []);

  // Auto-scroll loop when idle
  useEffect(() => {
    if (isPaused || catalog.length <= 1) return;
    const interval = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 20) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByAmount("right");
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, catalog.length, scrollByAmount]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, catalog]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1400px] px-3 py-12 sm:px-5">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (error || !data || !data.data || catalog.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-[1400px] px-3 py-10 sm:px-5 sm:py-14"
      aria-labelledby="trending"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Trending Now
          </span>
          <h2 id="trending" className="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl md:text-4xl">
            Best Sellers & Top Products
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Slider Arrow Controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={() => scrollByAmount("left")}
              disabled={!canScrollLeft}
              aria-label="Previous products"
              className="touch-target grid h-10 w-10 place-items-center rounded-xl glass border border-border text-ink transition-all hover:bg-white hover:text-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollByAmount("right")}
              disabled={!canScrollRight}
              aria-label="Next products"
              className="touch-target grid h-10 w-10 place-items-center rounded-xl glass border border-border text-ink transition-all hover:bg-white hover:text-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <Link
            to="/shop"
            className="shrink-0 rounded-xl glass border border-border px-4 py-2.5 text-xs font-bold text-primary transition-all hover:bg-white hover:shadow-md sm:text-sm"
          >
            View All Shop
          </Link>
        </div>
      </div>

      {/* Product Slideshow Track */}
      <div
        ref={trackRef}
        className="hide-scrollbar -mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 py-2 sm:-mx-5 sm:gap-5 sm:px-5"
      >
        {catalog.map((p: any, idx: number) => {
          const price = p.standard_rate || 0;
          const was = p.valuation_rate || 0;
          const off = was > price ? Math.round(((was - price) / was) * 100) : 0;
          const slug = p.route?.split("/").pop() || "";
          const img = getProductImage(p.image);
          const inStock = (p.custom_stock_qty ?? 1) > 0;

          return (
            <div
              key={p.item_code || idx}
              className="w-[280px] xs:w-[300px] sm:w-[320px] md:w-[340px] shrink-0 snap-start"
            >
              <Reveal delay={idx * 0.04}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl glass border border-border/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10">
                  <Link to="/product/$slug" params={{ slug }} className="relative block overflow-hidden bg-white">
                    {off > 0 && (
                      <span className="absolute left-3 top-3 z-10 rounded-lg bg-gradient-to-r from-primary to-accent px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                        {off}% OFF
                      </span>
                    )}
                    <span className="absolute right-3 top-3 z-10 rounded-lg bg-background/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur-sm">
                      {p.tag || "Popular"}
                    </span>
                    <img
                      src={img}
                      alt={p.item_name}
                      loading="lazy"
                      className="aspect-square w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 sm:p-6"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <Link to="/product/$slug" params={{ slug }}>
                      <h3 className="font-display text-base sm:text-lg font-bold leading-snug text-ink transition-colors group-hover:text-primary">
                        {p.item_name}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.short_description || p.description}</p>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-xl font-extrabold text-gradient">
                          {formatPKR(price)}
                        </span>
                        {was > price && (
                          <span className="pb-0.5 text-xs text-muted-foreground line-through">
                            {formatPKR(was)}
                          </span>
                        )}
                      </div>
                      {typeof p.custom_stock_qty === "number" && (
                        inStock ? (
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
                        onClick={() => {
                          addToCart(slug);
                          setDrawerOpen(true);
                        }}
                        disabled={!inStock}
                        className="touch-target inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingBag className="h-4 w-4" /> {inStock ? "Buy Now" : "Out of Stock"}
                      </button>
                      <Link
                        to="/product/$slug"
                        params={{ slug }}
                        className="touch-target inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-ink transition-colors hover:bg-muted"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
