import { motion, AnimatePresence } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, X,
  Check, Loader2, Sparkles, ShieldCheck, Github,
  AlertCircle,
} from "lucide-react";
import { signup, login } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/* ============ Context ============ */
type AuthTab = "signin" | "signup";
type AuthCtx = { open: (tab?: AuthTab) => void; close: () => void };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuthModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuthModal must be used within AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("signup");
  const value = useMemo<AuthCtx>(
    () => ({
      open: (t) => { if (t) setTab(t); setOpen(true); },
      close: () => setOpen(false),
    }),
    []
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      <AuthModal isOpen={isOpen} tab={tab} setTab={setTab} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

/* ============ Modal ============ */
function AuthModal({
  isOpen, tab, setTab, onClose,
}: { isOpen: boolean; tab: AuthTab; setTab: (t: AuthTab) => void; onClose: () => void }) {
  // lock scroll + ESC
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-root"
          className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Authentication"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/70 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Floating ambient orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
              style={{ background: "var(--glow)" }}
              animate={{ x: [0, 60, -20, 0], y: [0, 30, -40, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
              style={{ background: "var(--glow-2)" }}
              animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            <Particles />
          </div>

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full md:w-[min(1040px,calc(100%-2rem))] md:max-h-[92vh] h-full md:h-auto
                       grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] overflow-hidden
                       md:rounded-[28px] glass-strong shadow-elegant border border-white/10"
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center
                         rounded-full glass hover:bg-white/10 transition-all duration-300 hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Side panel — desktop only */}
            <SidePanel />

            {/* Form panel */}
            <div className="relative flex flex-col px-6 sm:px-10 py-8 md:py-12 overflow-y-auto">
              <Header />
              <Tabs tab={tab} setTab={setTab} />
              <div className="relative mt-7 flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  {tab === "signin" ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, x: -24, filter: "blur(8px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: 24, filter: "blur(8px)" }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <SignInForm />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: -24, filter: "blur(8px)" }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <SignUpForm />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <FooterLinks />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============ Particles ============ */
function Particles() {
  const dots = Array.from({ length: 18 });
  return (
    <>
      {dots.map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37) % 100;
        const dur = 6 + (i % 5);
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/40"
            style={{ left: `${left}%`, top: `${top}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        );
      })}
    </>
  );
}

/* ============ Side panel ============ */
function SidePanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10
                    bg-[radial-gradient(ellipse_at_top_left,oklch(0.68_0.24_295/0.35),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.18_210/0.3),transparent_60%)]">
      {/* Mesh */}
      <motion.div
        className="absolute -inset-20 bg-mesh-gradient opacity-30 blur-3xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      {/* Top */}
      <div className="relative">
        <div className="inline-flex items-center gap-2 font-display font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          Aether
        </div>
      </div>

      {/* Floating 3D-ish stack */}
      <div className="relative flex-1 my-10">
        <FloatingDashboard />
      </div>

      {/* Marketing copy */}
      <div className="relative">
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-display text-3xl xl:text-4xl font-semibold tracking-tight leading-[1.1]"
        >
          Create professional websites <span className="text-gradient">in minutes</span> with AI.
        </motion.h3>
        <p className="mt-4 text-sm text-muted-foreground max-w-sm">
          Join 12,000+ teams using Aether's AI co-pilot to design, ship and grow.
        </p>
        <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-secondary" /> SOC 2</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>No credit card</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Free 30 days</span>
        </div>
      </div>
    </div>
  );
}

function FloatingDashboard() {
  return (
    <div className="relative h-full w-full">
      {/* Main card */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-2xl glass-strong p-5 shadow-elegant"
        animate={{ y: [-6, 6, -6], rotate: [-1, 1, -1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Revenue</p>
            <p className="font-display text-xl font-semibold text-gradient">$48,294</p>
          </div>
          <span className="text-[10px] glass rounded-full px-2 py-0.5 text-secondary">+24%</span>
        </div>
        <svg viewBox="0 0 200 60" className="w-full">
          <defs>
            <linearGradient id="apg" x1="0" x2="1"><stop offset="0%" stopColor="oklch(0.78 0.18 210)" /><stop offset="100%" stopColor="oklch(0.68 0.24 295)" /></linearGradient>
          </defs>
          <motion.path
            d="M0 50 L25 40 L50 45 L75 28 L100 32 L125 18 L150 22 L175 10 L200 14"
            fill="none" stroke="url(#apg)" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Mon", "Tue", "Wed"].map((d, i) => (
            <div key={d} className="rounded-lg glass p-2">
              <p className="text-[9px] text-muted-foreground">{d}</p>
              <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary-gradient"
                  initial={{ width: 0 }} animate={{ width: `${40 + i * 20}%` }}
                  transition={{ duration: 1.4, delay: 0.4 + i * 0.15 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating template card */}
      <motion.div
        className="absolute -left-2 top-6 w-[42%] rounded-2xl glass p-3 shadow-card"
        animate={{ y: [0, -10, 0], rotate: [-4, -2, -4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="aspect-[4/3] rounded-lg bg-primary-gradient opacity-80" />
        <p className="mt-2 text-[10px] font-medium">Studio template</p>
      </motion.div>

      {/* AI assistant pill */}
      <motion.div
        className="absolute bottom-2 right-0 max-w-[60%] rounded-2xl glass-strong p-3 shadow-elegant"
        animate={{ y: [0, 8, 0], rotate: [2, 4, 2] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent-gradient shadow-glow-cyan">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </span>
          <p className="text-[10px] leading-tight"><span className="text-secondary">AI</span> drafted 3 layouts for you.</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ============ Header + Tabs ============ */
function Header() {
  return (
    <div className="lg:hidden flex items-center gap-2 font-display font-semibold mb-6">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-gradient shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </span>
      Aether
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: AuthTab; setTab: (t: AuthTab) => void }) {
  return (
    <div className="relative grid grid-cols-2 p-1 rounded-full glass">
      {(["signin", "signup"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`relative z-10 py-2.5 text-sm font-medium transition-colors duration-300 ${
            tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab === t && (
            <motion.span
              layoutId="auth-tab-pill"
              className="absolute inset-0 rounded-full bg-primary-gradient shadow-glow -z-10"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          {t === "signin" ? "Sign In" : "Create Account"}
        </button>
      ))}
    </div>
  );
}

/* ============ Inputs ============ */
function Field({
  icon: Icon, label, type = "text", value, onChange, placeholder, autoComplete, error,
  rightSlot, id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  rightSlot?: React.ReactNode;
  id: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div
        className={`relative flex items-center rounded-2xl glass transition-all duration-300
          ${focus ? "ring-2 ring-primary/50 shadow-glow" : ""}
          ${error ? "ring-2 ring-destructive/60" : ""}`}
      >
        <Icon className={`ml-3.5 h-4 w-4 shrink-0 transition-colors ${focus ? "text-primary" : "text-muted-foreground"}`} />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="w-full bg-transparent px-3 py-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {rightSlot}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-err`}
            initial={{ opacity: 0, y: -4, x: 0 }}
            animate={{ opacity: 1, y: 0, x: [0, -4, 4, -2, 2, 0] }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.4 }}
            className="mt-1.5 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Hide password" : "Show password"}
      className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

/* ============ Sign In ============ */
function SignInForm() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; pwd?: string; form?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const setAuthUser = useAuthStore((s) => s.setUser);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email address.";
    if (pwd.length < 6) errs.pwd = "Password must be at least 6 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus("loading");
    try {
      const result = await login(email, pwd);
      if (result.success) {
        setAuthUser({ email, full_name: result.user?.name ?? email.split("@")[0] });
        setStatus("success");
        setTimeout(() => navigate({ to: "/dashboard" }), 600);
      } else {
        setStatus("idle");
        setErrors({ form: result.message || "Sign in failed" });
      }
    } catch (err: any) {
      setStatus("idle");
      setErrors({ form: err.message || "Sign in failed. Please try again." });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="si-email" icon={Mail} label="Email" type="email" autoComplete="email"
        value={email} onChange={setEmail} placeholder="you@company.com" error={errors.email} />
      <Field id="si-pwd" icon={Lock} label="Password" type={showPwd ? "text" : "password"}
        autoComplete="current-password" value={pwd} onChange={setPwd} placeholder="••••••••"
        error={errors.pwd} rightSlot={<PasswordToggle show={showPwd} onToggle={() => setShowPwd(s => !s)} />} />

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={remember} onChange={setRemember} />
          <span className="text-muted-foreground">Remember me</span>
        </label>
        <a href="#" className="text-primary hover:text-secondary transition-colors">Forgot password?</a>
      </div>

      {errors.form && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          <AlertCircle className="h-3.5 w-3.5 inline-block mr-1.5" />
          {errors.form}
        </motion.p>
      )}

      <PrimaryButton status={status} label="Sign In" success="Welcome back" />
      <Divider />
      <SocialButtons googleLoading={googleLoading} onGoogle={() => {
        setGoogleLoading(true); setTimeout(() => setGoogleLoading(false), 1400);
      }} />
    </form>
  );
}

/* ============ Sign Up ============ */
function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [cpwd, setCpwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showCpwd, setShowCpwd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; pwd?: string; cpwd?: string; agree?: string; form?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [googleLoading, setGoogleLoading] = useState(false);

  const strength = passwordStrength(pwd);

  const navigate = useNavigate();
  const setAuthUser = useAuthStore((s) => s.setUser);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Enter a valid email address.";
    if (strength.score < 2) errs.pwd = "Use 8+ chars with mixed case, numbers or symbols.";
    if (cpwd !== pwd) errs.cpwd = "Passwords don't match.";
    if (!agree) errs.agree = "You must accept the terms to continue.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus("loading");
    try {
      const result = await signup({ full_name: name, email, password: pwd });
      if (result.success) {
        setAuthUser({ email, full_name: name });
        setStatus("success");
        setTimeout(() => navigate({ to: "/onboarding" }), 600);
      } else {
        setStatus("idle");
        setErrors({ form: result.message || "Sign up failed" });
      }
    } catch (err: any) {
      setStatus("idle");
      setErrors({ form: err.message || "Sign up failed. Please try again." });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="su-name" icon={UserIcon} label="Full Name" autoComplete="name"
        value={name} onChange={setName} placeholder="Ada Lovelace" error={errors.name} />
      <Field id="su-email" icon={Mail} label="Email Address" type="email" autoComplete="email"
        value={email} onChange={setEmail} placeholder="you@company.com" error={errors.email} />
      <Field id="su-pwd" icon={Lock} label="Password" type={showPwd ? "text" : "password"}
        autoComplete="new-password" value={pwd} onChange={setPwd} placeholder="At least 8 characters"
        error={errors.pwd} rightSlot={<PasswordToggle show={showPwd} onToggle={() => setShowPwd(s => !s)} />} />
      {pwd && <StrengthMeter strength={strength} />}
      <Field id="su-cpwd" icon={Lock} label="Confirm Password" type={showCpwd ? "text" : "password"}
        autoComplete="new-password" value={cpwd} onChange={setCpwd} placeholder="Re-enter password"
        error={errors.cpwd} rightSlot={<PasswordToggle show={showCpwd} onToggle={() => setShowCpwd(s => !s)} />} />

      <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs">
        <Checkbox checked={agree} onChange={setAgree} />
        <span className="text-muted-foreground leading-relaxed">
          I agree to the <a href="#" className="text-foreground hover:text-primary transition-colors">Terms & Conditions</a> and <a href="#" className="text-foreground hover:text-primary transition-colors">Privacy Policy</a>.
        </span>
      </label>
      <AnimatePresence>
        {errors.agree && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="-mt-2 text-xs text-destructive">{errors.agree}</motion.p>
        )}
      </AnimatePresence>

      {errors.form && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          <AlertCircle className="h-3.5 w-3.5 inline-block mr-1.5" />
          {errors.form}
        </motion.p>
      )}

      <PrimaryButton status={status} label="Create Free Account" success="Account created" />
      <Divider />
      <SocialButtons googleLoading={googleLoading} onGoogle={() => {
        setGoogleLoading(true); setTimeout(() => setGoogleLoading(false), 1400);
      }} showSecondary />
    </form>
  );
}

/* ============ Primary button (loading/success) ============ */
function PrimaryButton({
  status, label, success,
}: { status: "idle" | "loading" | "success"; label: string; success: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const id = Date.now();
    setRipples((p) => [...p, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
    setTimeout(() => setRipples((p) => p.filter((rp) => rp.id !== id)), 700);
  };
  return (
    <motion.button
      ref={btnRef}
      type="submit"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={status !== "idle"}
      className="relative w-full overflow-hidden rounded-2xl bg-primary-gradient px-6 py-3.5
                 text-sm font-semibold text-primary-foreground shadow-glow
                 transition-shadow duration-300 hover:shadow-[0_0_80px_-5px_var(--glow)]
                 disabled:opacity-90 disabled:cursor-not-allowed"
    >
      {/* shimmer */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent hover:translate-x-full transition-transform duration-700" />
      {/* ripples */}
      {ripples.map((r) => (
        <motion.span key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/40"
          style={{ left: r.x, top: r.y }}
          initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.6 }}
          animate={{ width: 400, height: 400, x: -200, y: -200, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {status === "loading" ? (
            <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </motion.span>
          ) : status === "success" ? (
            <motion.span key="s" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" /> {success}
            </motion.span>
          ) : (
            <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
              {label} <ArrowRight className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

/* ============ Misc ============ */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-4 shrink-0 rounded-[5px] border transition-all duration-200
        ${checked ? "bg-primary-gradient border-transparent shadow-glow" : "border-white/20 bg-white/5 hover:border-white/40"}`}
    >
      <AnimatePresence>
        {checked && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or continue with</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
    </div>
  );
}

function SocialButtons({
  onGoogle, googleLoading, showSecondary = false,
}: { onGoogle: () => void; googleLoading: boolean; showSecondary?: boolean }) {
  return (
    <div className="space-y-2.5">
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onGoogle}
        disabled={googleLoading}
        className="group relative w-full overflow-hidden rounded-2xl bg-white text-gray-800
                   px-6 py-3 text-sm font-semibold shadow-card hover:shadow-elegant transition-shadow duration-300"
      >
        <span className="inline-flex items-center justify-center gap-3">
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
          ) : (
            <GoogleLogo />
          )}
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </span>
      </motion.button>
      {showSecondary && (
        <div className="grid grid-cols-2 gap-2.5">
          <SecondarySocial icon={<Github className="h-4 w-4" />} label="GitHub" />
          <SecondarySocial icon={<MicrosoftLogo />} label="Microsoft" />
        </div>
      )}
    </div>
  );
}

function SecondarySocial({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl glass px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
    >
      {icon}{label}
    </motion.button>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.6 29.3 4.6 24 4.6c-7.7 0-14.4 4.4-17.7 10.1z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.7 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  );
}

/* ============ Password strength ============ */
function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];
  return { score: s, label: labels[s], color: colors[s] };
}

function StrengthMeter({ strength }: { strength: ReturnType<typeof passwordStrength> }) {
  return (
    <div className="-mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="h-1 flex-1 rounded-full bg-white/8"
            animate={{ backgroundColor: i < strength.score ? strength.color : "rgba(255,255,255,0.08)" }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Strength: <span style={{ color: strength.color }}>{strength.label}</span>
      </p>
    </div>
  );
}

/* ============ Footer links ============ */
function FooterLinks() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-4">
        <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
      </div>
      <a href="#" className="hover:text-foreground transition-colors">Need help? Contact support</a>
    </div>
  );
}
