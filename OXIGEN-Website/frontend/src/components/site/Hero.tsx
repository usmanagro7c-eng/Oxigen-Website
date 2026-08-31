import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShieldCheck, Truck, ChevronDown } from "lucide-react";
import { brand, products } from "@/lib/site-data";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 });
  const px = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 80, damping: 20 });
  const py = useSpring(useTransform(my, [-0.5, 0.5], [-18, 18]), { stiffness: 80, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={onMove}
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-16 lg:pt-44"
    >
      {/* animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-blob" />
        <div className="absolute right-0 top-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/25 blur-3xl animate-blob [animation-delay:4s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald/25 blur-3xl animate-blob [animation-delay:8s]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent,var(--color-background))]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" /> {brand.tagline}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:mt-6 sm:text-6xl lg:text-7xl"
          >
            Premium <span className="text-gradient">Wellness</span> for Everyday Wellbeing
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            Better health starts with better nutrition. Science-informed supplements for immunity,
            skin health, hormonal balance and energy — crafted with quality ingredients and
            transparent formulations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-primary/25 transition-transform duration-300 hover:scale-[1.04]"
            >
              Explore Products
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.04]"
            >
              Why OxiGen
            </Link>
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent" /> Free Shipping
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald" /> Quality Guaranteed
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> 18+ 5★ Reviews
            </span>
          </div>
        </div>

        {/* 3D floating product */}
        <div className="relative flex justify-center" style={{ perspective: 1200 }}>
          <motion.div
            style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
            className="relative"
          >
            <motion.div style={{ x: px, y: py }} className="relative">
              <div className="absolute inset-0 -z-10 scale-90 rounded-[2.5rem] bg-gradient-to-br from-primary/40 to-accent/40 blur-3xl" />
              <div className="animate-float rounded-[2.5rem] glass p-4 sm:p-6">
                <img
                  src={products[1]?.img || "/products/oxidop-new-packaging.jpeg"}
                  alt="OxiGen OxiDop Focus & Dopamine Support supplement bottle"
                  loading="eager"
                  className="mx-auto h-64 w-auto object-contain drop-shadow-2xl sm:h-[26rem]"
                />
              </div>
            </motion.div>

            <motion.div
              style={{ x: px, y: py, translateZ: 60 }}
              className="absolute -left-6 top-10 rounded-2xl glass px-4 py-3 text-sm"
            >
              <p className="font-bold text-ink">OxiDop</p>
              <p className="text-xs text-muted-foreground">Focus • Calm • Motivation</p>
            </motion.div>
            <motion.div
              style={{ x: px, y: py, translateZ: 80 }}
              className="absolute -right-4 bottom-12 rounded-2xl glass px-4 py-3"
            >
              <p className="text-lg font-extrabold text-gradient">Rs.4,500</p>
              <p className="text-xs text-muted-foreground line-through">Rs.6,000</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Link
        to="/categories"
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-xs font-medium text-muted-foreground"
      >
        Explore Categories
        <ChevronDown className="h-4 w-4 animate-bounce" />
      </Link>
    </section>
  );
}
