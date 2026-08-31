import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, ArrowLeft, Sparkles, Store, CreditCard, Building2, Wallet,
  Apple, Smartphone, Globe, ShieldCheck, Lock, BadgeCheck, ShoppingCart,
  Store as StoreIcon, Package, Laptop, Truck, Loader2, PartyPopper,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — OxiGen Admin" },
      { name: "description", content: "Set up your OxiGen store, payments and catalog." },
    ],
  }),
  component: OnboardingPage,
});

/* =============== Constants =============== */
const STEPS = [
  { key: "account", label: "Account" },
  { key: "store", label: "Store" },
  { key: "payment", label: "Payment" },
  { key: "setup", label: "Setup" },
  { key: "dashboard", label: "Dashboard" },
] as const;

/* =============== Page =============== */
function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = account success splash
  const [dir, setDir] = useState(1);

  // form state
  const [store, setStore] = useState({
    name: "OxiGen Store", category: "Health & Wellness", business: "Sole Proprietor",
    country: "Pakistan", currency: "PKR",
  });
  const [payment, setPayment] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");

  // Auto-advance from splash → store
  useEffect(() => {
    if (step !== 0) return;
    const t = setTimeout(() => { setDir(1); setStep(1); }, 1800);
    return () => clearTimeout(t);
  }, [step]);

  const go = (delta: number) => {
    setDir(delta > 0 ? 1 : -1);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
  };
  const toDashboard = () => navigate({ to: "/dashboard" });

  const progressIndex = step; // 0..4

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <BackgroundFx />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 md:px-10 py-5">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-extrabold text-base tracking-tight text-foreground">OxiGen</span>
        </Link>
        <button
          onClick={toDashboard}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Exit setup
        </button>
      </header>

      {/* Stepper */}
      <div className="relative z-10 px-5 md:px-10">
        <Stepper current={progressIndex} />
      </div>

      {/* Content */}
      <main className="relative z-10 px-4 md:px-6 pb-32 md:pb-16 pt-8 md:pt-14">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            {step === 0 && (
              <StepShell key="s0" dir={dir}>
                <SplashAccount />
              </StepShell>
            )}
            {step === 1 && (
              <StepShell key="s1" dir={dir}>
                <StepStore store={store} setStore={setStore} onBack={() => go(-1)} onNext={() => go(1)} />
              </StepShell>
            )}
            {step === 2 && (
              <StepShell key="s2" dir={dir}>
                <StepPayment
                  value={payment} setValue={setPayment}
                  onBack={() => go(-1)} onNext={() => go(1)} onSkip={() => go(1)}
                />
              </StepShell>
            )}
            {step === 3 && (
              <StepShell key="s3" dir={dir}>
                <StepSetup
                  goal={goal} setGoal={setGoal}
                  nickname={nickname} setNickname={setNickname}
                  onBack={() => go(-1)} onDone={toDashboard}
                />
              </StepShell>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/* =============== Background =============== */
function BackgroundFx() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0">
      <div className="absolute inset-0 bg-hero-gradient opacity-70" />
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <motion.div
        className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full blur-3xl opacity-40"
        style={{ background: "var(--glow)" }}
        animate={{ x: [0, 50, -20, 0], y: [0, 30, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
        style={{ background: "var(--glow-2)" }}
        animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full blur-3xl opacity-25"
        style={{ background: "var(--accent)" }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* =============== Stepper =============== */
function Stepper({ current }: { current: number }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ol className="flex items-center gap-2 md:gap-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <motion.span
                  layout
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold border transition-colors
                    ${done ? "bg-primary-gradient border-transparent text-primary-foreground shadow-glow"
                          : active ? "glass-strong border-white/20 text-foreground"
                                   : "glass border-white/10 text-muted-foreground"}`}
                  animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span key="c" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    ) : (
                      <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-primary-gradient opacity-30 blur-md -z-10" />
                  )}
                </motion.span>
                <span className={`hidden sm:block text-xs font-medium truncate ${active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] rounded-full bg-white/5 overflow-hidden min-w-4">
                  <motion.div
                    className="h-full bg-primary-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: done ? "100%" : active ? "50%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* =============== Step transition shell =============== */
function StepShell({ children, dir }: { children: React.ReactNode; dir: number }) {
  return (
    <motion.div
      custom={dir}
      initial={{ opacity: 0, x: 40 * dir, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -40 * dir, filter: "blur(10px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* =============== Panel wrapper =============== */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl glass-strong border border-white/10 shadow-elegant p-6 sm:p-8 md:p-10 ${className}`}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: "var(--glow)" }} />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-25" style={{ background: "var(--glow-2)" }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/* =============== Step 0: Splash =============== */
function SplashAccount() {
  return (
    <Panel className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-gradient shadow-glow"
      >
        <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-6 font-display text-3xl md:text-4xl font-semibold tracking-tight"
      >
        Account created <span className="text-gradient">successfully</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-3 text-sm text-muted-foreground max-w-md mx-auto"
      >
        Welcome to OxiGen Admin. We're preparing your workspace…
      </motion.p>
      <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading setup
      </div>
      <PartyPopper className="mx-auto mt-6 h-5 w-5 text-secondary opacity-0" aria-hidden />
    </Panel>
  );
}

/* =============== Step 1: Store =============== */
function StepStore({
  store, setStore, onBack, onNext,
}: {
  store: { name: string; category: string; business: string; country: string; currency: string };
  setStore: (s: any) => void;
  onBack: () => void; onNext: () => void;
}) {
  const slug = useMemo(() => {
    const s = store.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return s || "oxigen-store";
  }, [store.name]);

  return (
    <Panel>
      <Heading
        icon={Store}
        title="Configure your store"
        desc="Let's set up your OxiGen catalog in just a few steps."
      />

      <div className="mt-8 space-y-5">
        <FloatingInput
          id="store-name" label="Store name" value={store.name}
          onChange={(v) => setStore({ ...store, name: v })}
          placeholder="OxiGen Official Store"
        />

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Store URL</label>
          <div className="flex items-center rounded-2xl bg-card border border-border px-4 py-3.5 text-sm">
            <span className="text-gradient font-bold truncate">{slug}</span>
            <span className="text-muted-foreground">.oxigen.pk</span>
            <motion.span
              key={slug}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Store category" value={store.category} onChange={(v) => setStore({ ...store, category: v })}
            options={["Fashion & Apparel", "Electronics", "Home & Garden", "Beauty", "Food & Beverage", "Digital Products"]} />
          <Select label="Business type" value={store.business} onChange={(v) => setStore({ ...store, business: v })}
            options={["Sole Proprietor", "LLC", "Corporation", "Non-profit"]} />
          <Select label="Country" value={store.country} onChange={(v) => setStore({ ...store, country: v })}
            options={["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "India", "Japan"]} />
          <Select label="Currency" value={store.currency} onChange={(v) => setStore({ ...store, currency: v })}
            options={["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"]} />
        </div>
      </div>

      <ActionBar onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </Panel>
  );
}

/* =============== Step 2: Payment =============== */
function StepPayment({
  value, setValue, onBack, onNext, onSkip,
}: {
  value: string | null; setValue: (v: string) => void;
  onBack: () => void; onNext: () => void; onSkip: () => void;
}) {
  const options = [
    { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, Amex", icon: CreditCard },
    { id: "bank", label: "Bank Account", desc: "Direct ACH transfer", icon: Building2 },
    { id: "paypal", label: "PayPal", desc: "Pay with your PayPal balance", icon: Wallet },
    { id: "apple", label: "Apple Pay", desc: "One-tap secure checkout", icon: Apple },
    { id: "google", label: "Google Pay", desc: "Fast wallet payments", icon: Smartphone },
    { id: "stripe", label: "Stripe", desc: "Global payment processing", icon: Globe },
  ];
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <Heading
          icon={CreditCard}
          title="Set up your payment method"
          desc="Choose how you'd like to receive payments from customers."
        />
        <button
          onClick={onSkip}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Skip for now
        </button>
      </div>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const active = value === o.id;
          return (
            <motion.button
              key={o.id}
              type="button"
              onClick={() => setValue(o.id)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300
                ${active
                  ? "glass-strong border-primary/60 shadow-glow"
                  : "glass border-white/10 hover:border-white/25"}`}
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all
                ${active ? "bg-primary-gradient text-primary-foreground shadow-glow" : "glass text-foreground"}`}>
                <o.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{o.label}</p>
                <p className="text-xs text-muted-foreground truncate">{o.desc}</p>
              </div>
              <span className={`ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all
                ${active ? "bg-primary-gradient border-transparent text-primary-foreground" : "border-white/20"}`}>
                {active && <Check className="h-3 w-3" />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Security badges */}
      <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-secondary" /> SSL Secure
        </span>
        <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
          <Lock className="h-3.5 w-3.5 text-secondary" /> 256-bit Encrypted
        </span>
        <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
          <BadgeCheck className="h-3.5 w-3.5 text-secondary" /> PCI Compliant
        </span>
      </div>

      <ActionBar onBack={onBack} onNext={onNext} nextLabel="Continue" nextDisabled={!value} />
    </Panel>
  );
}

/* =============== Step 3: Setup =============== */
function StepSetup({
  goal, setGoal, nickname, setNickname, onBack, onDone,
}: {
  goal: string | null; setGoal: (v: string) => void;
  nickname: string; setNickname: (v: string) => void;
  onBack: () => void; onDone: () => void;
}) {
  const opts = [
    { id: "online", label: "Sell Online", desc: "Launch a modern web store", icon: ShoppingCart },
    { id: "instore", label: "Sell In-Store", desc: "Retail POS and inventory", icon: StoreIcon },
    { id: "drop", label: "Dropshipping", desc: "Source and fulfill globally", icon: Package },
    { id: "digital", label: "Sell Digital Products", desc: "Downloads, courses, licenses", icon: Laptop },
    { id: "move", label: "Move Existing Store", desc: "Migrate from another platform", icon: Truck },
  ];
  return (
    <Panel>
      <Heading
        icon={Sparkles}
        title="Let's get started"
        desc="Tell us what you'd like to achieve first so we can personalize your experience."
      />

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold tracking-tight">What can I help you do?</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {opts.map((o) => {
            const active = goal === o.id;
            return (
              <motion.button
                key={o.id}
                type="button"
                onClick={() => setGoal(o.id)}
                whileHover={{ y: -3, rotate: -0.4 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300
                  ${active
                    ? "glass-strong border-primary/60 shadow-glow"
                    : "glass border-white/10 hover:border-white/25"}`}
              >
                {active && (
                  <motion.span
                    layoutId="goal-glow"
                    className="absolute -inset-1 rounded-3xl bg-primary-gradient opacity-20 blur-xl -z-10"
                  />
                )}
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all
                    ${active ? "bg-primary-gradient text-primary-foreground shadow-glow" : "glass text-foreground"}`}>
                    <o.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
                  </div>
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all
                    ${active ? "bg-primary-gradient border-transparent text-primary-foreground" : "border-white/20"}`}>
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-display text-lg font-semibold tracking-tight">What should we call your store?</h3>
        <div className="mt-3">
          <FloatingInput
            id="store-nick" label="Store nickname" value={nickname}
            onChange={setNickname} placeholder="My Store (optional)"
          />
        </div>
      </div>

      <ActionBar
        onBack={onBack} onNext={onDone} nextLabel="Continue"
        secondary={{ label: "I'll do this later", onClick: onDone }}
      />
    </Panel>
  );
}

/* =============== Shared UI =============== */
function Heading({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient shadow-glow"
      >
        <Icon className="h-5 w-5 text-primary-foreground" />
      </motion.span>
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function FloatingInput({
  id, label, value, onChange, placeholder,
}: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focus, setFocus] = useState(false);
  const active = focus || value.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={active ? placeholder : " "}
        className={`peer w-full rounded-2xl glass px-4 pt-6 pb-3 text-sm placeholder:text-muted-foreground/50 transition-all duration-300
          focus:outline-none ${focus ? "ring-2 ring-primary/50 shadow-glow" : ""}`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 transition-all duration-200
          ${active ? "top-2 text-[10px] uppercase tracking-widest text-primary" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}
      >
        {label}
      </label>
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl bg-card border border-border px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer shadow-sm"
        >
          {options.map((o) => <option key={o} value={o} className="bg-card text-foreground py-1.5">{o}</option>)}
        </select>
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
          <path fill="currentColor" d="M5 8l5 5 5-5z" />
        </svg>
      </div>
    </div>
  );
}

function ActionBar({
  onBack, onNext, nextLabel, nextDisabled, secondary,
}: {
  onBack?: () => void; onNext: () => void; nextLabel: string; nextDisabled?: boolean;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <>
      {/* Desktop / inline */}
      <div className="mt-10 hidden md:flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-2xl glass hover:bg-white/10 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondary.label}
            </button>
          )}
          <PrimaryButton onClick={onNext} disabled={nextDisabled}>
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </div>

      {/* Mobile sticky */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-30 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]
                      bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center h-12 w-12 shrink-0 rounded-2xl glass"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <PrimaryButton onClick={onNext} disabled={nextDisabled} className="flex-1 h-12">
            {nextLabel} <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
        {secondary && (
          <button
            onClick={secondary.onClick}
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {secondary.label}
          </button>
        )}
      </div>
    </>
  );
}

function PrimaryButton({
  children, onClick, disabled, className = "",
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl
        bg-primary-gradient text-primary-foreground text-sm font-semibold shadow-glow transition-all
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      {!disabled && (
        <motion.span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
        />
      )}
    </motion.button>
  );
}
