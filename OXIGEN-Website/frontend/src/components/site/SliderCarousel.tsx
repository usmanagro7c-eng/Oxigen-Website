import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

type SliderCarouselProps<T> = {
  items: readonly T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemClassName?: string;
  keyFor?: (item: T, index: number) => string | number;
  autoplayMs?: number;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  showArrows?: boolean;
  showDots?: boolean;
};

export function SliderCarousel<T>({
  items,
  renderItem,
  itemClassName,
  keyFor,
  autoplayMs = 6000,
  ariaLabel = "Carousel",
  className,
  contentClassName,
  showArrows = true,
  showDots = true,
}: SliderCarouselProps<T>) {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCurrent(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    if (!api || paused || count <= 1) return;
    const t = window.setInterval(() => api.scrollNext(), autoplayMs);
    return () => window.clearInterval(t);
  }, [api, paused, count, autoplayMs]);

  const goTo = useCallback((index: number) => api?.scrollTo(index), [api]);

  if (items.length === 0) return null;
  if (items.length === 1) return <>{renderItem(items[0], 0)}</>;

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <Carousel opts={{ loop: true, align: "start" }} setApi={setApi} aria-label={ariaLabel}>
        <CarouselContent className={contentClassName}>
          {items.map((item, idx) => (
            <CarouselItem
              key={keyFor ? keyFor(item, idx) : idx}
              className={cn("pl-3 sm:pl-4", itemClassName)}
            >
              {renderItem(item, idx)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {showArrows && count > 1 && (
        <>
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            aria-label="Previous slide"
            className="hidden sm:grid absolute left-2 top-1/2 -translate-y-1/2 place-items-center rounded-full glass p-3 text-ink shadow-lg transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95 sm:left-3"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => api?.scrollNext()}
            aria-label="Next slide"
            className="hidden sm:grid absolute right-2 top-1/2 -translate-y-1/2 place-items-center rounded-full glass p-3 text-ink shadow-lg transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95 sm:right-3"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {showDots && count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 sm:h-2 rounded-full transition-all duration-300",
                i === current
                  ? "w-7 sm:w-9 bg-primary shadow-md shadow-primary/30"
                  : "w-2 sm:w-2.5 bg-ink/20 hover:bg-ink/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}