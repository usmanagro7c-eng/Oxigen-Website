import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Shield, KeyRound, Smartphone, Laptop, Globe, MapPin, LogOut, CheckCircle2, AlertTriangle } from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Input, SaveButton } from "@/components/dashboard/glass-form";
import { changePassword } from "@/lib/api";

export const Route = createFileRoute("/dashboard/security")({
  head: () => ({ meta: [{ title: "Security — OxiGen Admin" }] }),
  component: SecurityPage,
});

const SESSIONS = [
  { icon: Laptop, device: "MacBook Pro — Chrome", loc: "San Francisco, US", when: "Active now", current: true },
  { icon: Smartphone, device: "iPhone 15 — Safari", loc: "San Francisco, US", when: "3h ago" },
  { icon: Globe, device: "Windows — Firefox", loc: "Berlin, DE", when: "2d ago" },
];

const EVENTS = [
  { icon: CheckCircle2, tone: "text-emerald-400", label: "Password changed", when: "Oct 30" },
  { icon: CheckCircle2, tone: "text-emerald-400", label: "2FA enabled", when: "Oct 12" },
  { icon: AlertTriangle, tone: "text-amber-400", label: "New sign-in from Berlin", when: "Sep 21" },
];

function SecurityPage() {
  const [twofa, setTwofa] = useState(true);
  const [status, setStatus] = useState<"idle"|"loading"|"saved">("idle");
  const [pw, setPw] = useState({ old_password: "", new_password: "", confirm: "" });
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.new_password !== pw.confirm) {
      setErr("New passwords do not match.");
      return;
    }
    setStatus("loading");
    try {
      await changePassword(pw.old_password, pw.new_password);
      setStatus("saved");
      setPw({ old_password: "", new_password: "", confirm: "" });
      setTimeout(() => setStatus("idle"), 1400);
    } catch (err: any) {
      setErr(err.message);
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="Security" />
      <Header icon={Shield} title="Security" subtitle="Passwords, two-factor, sessions and activity." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Change password" desc="Use at least 8 characters">
          <form onSubmit={save} className="space-y-3">
            {err && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">{err}</div>}
            <FieldGroup label="Current password">
              <Input type="password" required value={pw.old_password} onChange={(e) => setPw((p) => ({ ...p, old_password: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="New password">
              <Input type="password" required value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} />
            </FieldGroup>
            <FieldGroup label="Confirm new password">
              <Input type="password" required value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            </FieldGroup>
            <div className="pt-1"><SaveButton status={status} label="Update password" /></div>
          </form>
        </GlassCard>

        <GlassCard title="Two-factor authentication" desc="TOTP app or hardware key">
          <div className="rounded-2xl glass border border-white/10 p-4 flex items-center gap-3">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${twofa ? "bg-primary-gradient shadow-glow" : "bg-white/5"}`}>
              <KeyRound className={`h-5 w-5 ${twofa ? "text-primary-foreground" : "text-muted-foreground"}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Authenticator app</div>
              <div className="text-[12px] text-muted-foreground">
                {twofa ? "Enabled — required on every sign-in" : "Off — enable to secure your account"}
              </div>
            </div>
            <button type="button" onClick={() => setTwofa(v => !v)}
              className={`relative h-6 w-11 rounded-full transition ${twofa ? "bg-primary-gradient shadow-glow" : "bg-white/10"}`}>
              <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                animate={{ x: twofa ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </button>
          </div>

          <div className="mt-3 rounded-2xl glass border border-white/10 p-4">
            <div className="text-sm font-medium">Recovery codes</div>
            <div className="text-[12px] text-muted-foreground">Download backup codes in case you lose access.</div>
            <button type="button" className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
              Generate new codes
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Active sessions" desc="Sign out of any session you don't recognize" className="lg:col-span-2">
          <ul className="divide-y divide-white/[0.06]">
            {SESSIONS.map((s, i) => (
              <motion.li key={i}
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-3.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl glass border border-white/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {s.device}
                    {s.current && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300">This device</span>}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{s.loc} · {s.when}</div>
                </div>
                {!s.current && (
                  <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg glass hover:bg-white/10 text-xs">
                    <LogOut className="h-3.5 w-3.5" /> Revoke
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard title="Recent activity" className="lg:col-span-2">
          <ul className="space-y-3">
            {EVENTS.map((e, i) => (
              <li key={i} className="flex items-center gap-3">
                <e.icon className={`h-4 w-4 ${e.tone}`} />
                <span className="text-sm flex-1">{e.label}</span>
                <span className="text-[11.5px] text-muted-foreground">{e.when}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
