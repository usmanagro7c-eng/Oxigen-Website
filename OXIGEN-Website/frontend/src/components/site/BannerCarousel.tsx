import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroBanners } from "@/lib/site-data";

export function BannerCarousel() {
  const [i, setI] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const n = heroBanners.length;

  const go = useCallback((d: number) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n, isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
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
  };

  return (
    <section
      className="relative pt-24 sm:pt-28 lg:pt-32"
      aria-label="Featured offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        {/* Banner Frame */}
        <div className="group relative overflow-hidden rounded-[2rem] border border-border/50 bg-muted shadow-2xl shadow-primary/15">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${i * 100}%)` }}
          >
            {heroBanners.map((b, idx) => {
              const bannerSrc =
                b.id === "nutri-cept"
                  ? "/banners/banner-nutricept.jpg"
                  : "/banners/banner-oxidop.jpg";

              return (
                <Link
                  key={b.id || idx}
                  to="/product/$slug"
                  params={{ slug: b.id }}
                  className="relative block w-full shrink-0 overflow-hidden"
                  aria-label={b.title}
                >
                  <img
                    src={bannerSrc}
                    alt={`${b.title} — ${b.sub}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="aspect-[16/7] max-h-[440px] min-h-[200px] w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.01]"
                  />
                  <span className="sr-only">{`${b.title} — ${b.sub}. ${b.cta}`}</span>
                </Link>
              );
            })}
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
            {heroBanners.map((b, idx) => (
              <button
                key={b.id || idx}
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
