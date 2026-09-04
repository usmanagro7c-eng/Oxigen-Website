import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroBanners, type HeroBannerItem } from "@/lib/site-data";
import { API_BASE, getProductImage } from "@/lib/api";

type ApiBanner = {
  id: string;
  title: string;
  image: string;
  isActive: boolean;
  position: number;
  products: Array<{
    name: string;
    item_name: string;
    item_code: string;
    image: string | null;
    website_image: string | null;
    standard_rate: number;
    route: string;
    short_description: string;
  }>;
};

export function BannerCarousel() {
  const [i, setI] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [apiBanners, setApiBanners] = useState<ApiBanner[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/banners`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.data) && d.data.length > 0) {
          setApiBanners(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const hasApiBanners = apiBanners.length > 0;
  const n = hasApiBanners ? apiBanners.length : heroBanners.length;

  const go = useCallback((d: number) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (isPaused || n === 0) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n, isPaused]);

  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) go(1);
      else go(-1);
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  const banners = hasApiBanners
    ? apiBanners.map((b) => {
        const prodCount = b.products?.length || 0;
        let href = "/shop";
        if (prodCount === 1 && b.products?.[0]?.route) {
          const slug = (b.products[0].route.split("/").pop() || "").replace(/^\/product\//, "");
          href = `/product/${slug}`;
        } else if (prodCount >= 2) {
          href = `/offers/${b.id}`;
        }
        return {
          key: b.id,
          image: getProductImage(b.image),
          title: b.title,
          href,
        };
      })
    : heroBanners.map((b) => ({
        key: b.id,
        image: b.id === "nutri-cept" ? "/banners/banner-nutricept.jpg" : "/banners/banner-oxidop.jpg",
        title: b.title,
        href: `/product/${b.id}`,
      }));

  if (n === 0) return null;

  return (
    <section
      className="relative pt-24 sm:pt-28 lg:pt-32"
      aria-label="Featured offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-6xl px-5">
        {/* Banner Frame */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-border/50 bg-muted shadow-2xl shadow-primary/15">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${i * 100}%)` }}
          >
            {banners.map((b, idx) => (
              <Link
                key={b.key || idx}
                to={b.href}
                className="relative block w-full shrink-0 overflow-hidden"
                aria-label={b.title}
              >
                <img
                  src={b.image}
                  alt={b.title}
                  loading={idx === 0 ? "eager" : "lazy"}
                  className="aspect-[4/3] w-full h-auto block object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.01] sm:aspect-[2.35/1]"
                />
                <span className="sr-only">{b.title}</span>
              </Link>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-ink shadow-lg transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95 sm:left-5 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-ink shadow-lg transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95 sm:right-5 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Bottom Indicators */}
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {banners.map((b, idx) => (
              <button
                key={b.key || idx}
                onClick={() => setI(idx)}
                aria-label={`Go to banner ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === i
                    ? "w-9 bg-white shadow-md shadow-black/40"
                    : "w-2.5 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
