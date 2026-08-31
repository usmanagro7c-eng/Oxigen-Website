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
    { label: "Hours", value: pad(hrs) },
    { label: "Minutes", value: pad(min) },
    { label: "Seconds", value: pad(sec) },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary via-royal to-accent p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 text-center lg:flex-row lg:justify-between lg:text-left">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wide">
                <Flame className="h-3.5 w-3.5" /> Flash Sale
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
                {brand.promo}
              </h2>
              <p className="mt-2 text-white/90">Hurry! This deal ends when the timer hits zero.</p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="flex gap-3">
                {units.map((u) => (
                  <div
                    key={u.label}
                    className="flex min-w-[70px] flex-col items-center rounded-2xl bg-white/15 px-4 py-3 backdrop-blur"
                  >
                    <span className="font-display text-3xl font-extrabold tabular-nums sm:text-4xl">
                      {!mounted || ms === null ? "00" : u.value}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                      {u.label}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-primary shadow-xl transition-transform hover:scale-105"
              >
                Claim Offer <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
