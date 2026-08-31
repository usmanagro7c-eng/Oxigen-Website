import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Activity, ShoppingBag, Bell, TrendingUp, CreditCard, Sparkles } from "lucide-react";
import { Counter } from "./primitives";
import heroDashboard from "@/assets/hero-dashboard.png";

export function HeroDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [12, 0]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 100, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ y, rotateX, perspective: 1200 }}
      className="relative w-full"
    >
      {/* Glow behind */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-60 animate-pulse-glow rounded-[40px]"
        style={{ background: "var(--gradient-primary)" }} />

      <div className="relative glass-strong rounded-3xl p-6 shadow-elegant">
        <img
          src={heroDashboard}
          alt="Aether dashboard preview"
          width={1280}
          height={960}
          className="w-full h-auto rounded-2xl"
        />

        {/* Floating notification card */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: -10 }}
          animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.7, delay: 1.4 },
            x: { duration: 0.7, delay: 1.4 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.4 },
          }}
          className="absolute -right-4 top-16 md:-right-10 md:top-24 glass-strong rounded-2xl p-4 w-64 shadow-elegant"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-gradient flex items-center justify-center shadow-glow">
              <ShoppingBag className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">New order</p>
              <p className="text-sm font-semibold">+$1,284.00</p>
            </div>
            <motion.div
              className="h-2 w-2 rounded-full bg-secondary"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Revenue counter card */}
        <motion.div
          initial={{ opacity: 0, x: -40, y: 10 }}
          animate={{ opacity: 1, x: 0, y: [0, 10, 0] }}
          transition={{
            opacity: { duration: 0.7, delay: 1.6 },
            x: { duration: 0.7, delay: 1.6 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.6 },
          }}
          className="absolute -left-4 bottom-16 md:-left-10 md:bottom-24 glass-strong rounded-2xl p-4 w-56 shadow-elegant"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-secondary" />
            Monthly revenue
          </div>
          <p className="mt-1 text-2xl font-display font-semibold text-gradient">
            <Counter to={284390} prefix="$" duration={2.6} />
          </p>
          <div className="mt-2 flex items-end gap-1 h-8">
            {[40, 60, 35, 80, 55, 90, 70, 95].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm bg-primary-gradient"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: 1.8 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
        </motion.div>

        {/* Floating AI badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, rotate: [0, 6, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 1.9 },
            scale: { duration: 0.6, delay: 1.9 },
            rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute right-8 -bottom-6 glass-strong rounded-full px-4 py-2 flex items-center gap-2 shadow-glow-cyan"
        >
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-xs font-medium">AI insights live</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
