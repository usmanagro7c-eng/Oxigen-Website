import { motion } from "motion/react";

/* Animated background: mesh + orbs + grid + beams */
export function BackgroundFx() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Mesh gradient */}
      <div className="absolute inset-0 bg-hero-gradient" />
      {/* Grid */}
      <div className="absolute inset-0 grid-pattern opacity-60" />
      {/* Orbs */}
      <motion.div
        className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.68 0.24 295 / 0.5), transparent 70%)" }}
        animate={{ x: [0, 60, -20, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 -right-20 h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.18 210 / 0.45), transparent 70%)" }}
        animate={{ x: [0, -50, 30, 0], y: [0, 50, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.22 340 / 0.4), transparent 70%)" }}
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Light beams */}
      <div className="absolute inset-0">
        {[15, 45, 70].map((left, i) => (
          <motion.div
            key={i}
            className="absolute top-0 h-full w-px"
            style={{
              left: `${left}%`,
              background: "linear-gradient(to bottom, transparent, oklch(0.78 0.18 210 / 0.5), transparent)",
            }}
            animate={{ opacity: [0, 1, 0], scaleY: [0.6, 1, 0.6] }}
            transition={{ duration: 6 + i * 1.5, repeat: Infinity, delay: i * 1.2, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

/* Floating 3D-ish glass cubes */
export function FloatingObjects() {
  const items = [
    { left: "8%", top: "20%", size: 70, delay: 0, rot: 12, hue: "var(--glow)" },
    { left: "85%", top: "30%", size: 90, delay: 1.5, rot: -18, hue: "var(--glow-2)" },
    { left: "12%", top: "70%", size: 60, delay: 2, rot: -8, hue: "var(--accent)" },
    { left: "82%", top: "75%", size: 80, delay: 0.7, rot: 20, hue: "var(--glow)" },
    { left: "50%", top: "12%", size: 50, delay: 1.1, rot: 6, hue: "var(--glow-2)" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((it, i) => (
        <motion.div
          key={i}
          className="absolute rounded-2xl glass shadow-elegant"
          style={{
            left: it.left,
            top: it.top,
            width: it.size,
            height: it.size,
            background: `linear-gradient(135deg, ${it.hue}, transparent 80%)`,
            border: "1px solid oklch(1 0 0 / 0.15)",
          }}
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -25, 0],
            rotate: [it.rot, it.rot + 8, it.rot],
          }}
          transition={{
            opacity: { duration: 1, delay: it.delay },
            scale: { duration: 1, delay: it.delay },
            y: { duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: it.delay },
            rotate: { duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: it.delay },
          }}
        />
      ))}
    </div>
  );
}
