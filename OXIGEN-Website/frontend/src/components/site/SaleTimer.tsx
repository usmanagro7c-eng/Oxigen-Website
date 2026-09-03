import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { brand } from "@/lib/site-data";

function getMsLeft() {
  // Countdown resets to the end of the current day (midnight local time).
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime() - now.getTime();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function SaleTimer() {
  const [ms, setMs] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMs(getMsLeft());
    const id = setInterval(() => setMs(getMsLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(0, ms ?? 0);
  const hrs = Math.floor(total / 3_600_000);
  const min = Math.floor((total % 3_600_000) / 60_000);
  const sec = Math.floor((total % 60_000) / 1000);

  const units = [
    { label: "Hrs", value: pad(hrs) },
    { label: "Min", value: pad(min) },
    { label: "Sec", value: pad(sec) },
  ];

  return (
    <section className="mx-auto max-w-[1400px] px-3 sm:px-5 py-3 sm:py-4" aria-label="Flash Sale Countdown">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-royal to-accent p-4 sm:px-7 sm:py-4 text-white shadow-lg border border-white/10">
          <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />

          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            {/* Left: Info */}
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide backdrop-blur-sm">
                  <Flame className="h-3.5 w-3.5 animate-pulse text-amber-300" /> Flash Sale
                </span>
                <span className="text-[11px] font-medium text-white/80 hidden md:inline">
                  Limited time daily offer
                </span>
              </div>
              <h2 className="mt-1 font-display text-base sm:text-lg md:text-xl font-extrabold tracking-tight">
                {brand.promo}
              </h2>
            </div>

            {/* Right: Countdown & CTA */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Timer */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                {units.map((u, i) => (
                  <div key={u.label} className="flex items-center gap-1 sm:gap-1.5">
                    <div className="flex min-w-[42px] sm:min-w-[48px] flex-col items-center justify-center rounded-xl bg-white/15 px-2 py-1 backdrop-blur-sm border border-white/10 shadow-inner">
                      <span className="font-display text-base sm:text-lg font-black tabular-nums leading-none">
                        {!mounted || ms === null ? "00" : u.value}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/75 mt-0.5">
                        {u.label}
                      </span>
                    </div>
                    {i < units.length - 1 && (
                      <span className="text-white/60 font-black text-xs sm:text-sm -mt-2.5">:</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-primary shadow-md hover:bg-white/95 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                Claim Offer <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
