import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon, Building2, Sliders, Palette, BellRing, ShieldCheck,
  Sun, Moon, Monitor, KeyRound, Smartphone, Laptop2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb, Header, GlassCard, FieldGroup, Input, Select, SaveButton } from "@/components/dashboard/glass-form";
import { getSettings, updateSettings, type SettingsData } from "@/lib/api";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — OxiGen Admin" }] }),
  component: SettingsPage,
});

const SECTIONS = [
  { id: "organization",  label: "Organization",  icon: Building2 },
  { id: "preferences",   label: "Preferences",   icon: Sliders },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "security",      label: "Security",      icon: ShieldCheck },
];

const THEME_KEY = "oxigen-admin-theme";

const DEFAULTS = (partial?: Partial<SettingsData>): SettingsData => ({
  organization: {
    company_name: "OxiGen Healthcare",
    website_url: "https://oxigen.pk",
    support_email: "support@oxigen.pk",
    ...partial?.organization,
  },
  preferences: {
    language: "English (UK)",
    time_zone: "(UTC+05:00) Pakistan Standard Time",
    date_format: "DD/MM/YYYY",
    currency: "PKR — Pakistani Rupee",
    country: "Pakistan",
    number_format: "#,###.##",
    ...partial?.preferences,
  },
  notifications: {
    email: true,
    push: true,
    marketing: false,
    ...partial?.notifications,
  },
});

function SettingsPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>(() => DEFAULTS());
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [twofa, setTwofa] = useState(true);

  useEffect(() => {
    getSettings()
      .then(({ data }) => setSettings(DEFAULTS(data)))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "system") setTheme(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const patchOrg = (key: keyof SettingsData["organization"], value: string) =>
    setSettings((s) => ({ ...s, organization: { ...s.organization, [key]: value } }));

  const patchPref = (key: keyof SettingsData["preferences"], value: string) =>
    setSettings((s) => ({ ...s, preferences: { ...s.preferences, [key]: value } }));

  const patchNotif = (key: keyof SettingsData["notifications"], value: boolean) =>
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const payload = {
        organization: settings.organization,
        preferences: settings.preferences,
        notifications: settings.notifications,
      };
      const { data } = await updateSettings(payload);
      setSettings(DEFAULTS(data));
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="Settings" />
      <Header icon={SettingsIcon} title="Settings" subtitle="Manage your OxiGen workspace, preferences and security." />

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sticky nav */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ul className="glass-strong rounded-2xl border border-border p-1.5 space-y-0.5 shadow-sm">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <s.icon className="h-4 w-4" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <form onSubmit={save} className="space-y-6">
          {/* Organization */}
          <section id="organization">
            <GlassCard title="Organization" desc="Public details about your OxiGen healthcare brand.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Brand name"><Input value={settings.organization.company_name} onChange={(e) => patchOrg("company_name", e.target.value)} /></FieldGroup>
                <FieldGroup label="Website"><Input type="url" value={settings.organization.website_url} onChange={(e) => patchOrg("website_url", e.target.value)} /></FieldGroup>
                <FieldGroup label="Support email"><Input type="email" value={settings.organization.support_email} onChange={(e) => patchOrg("support_email", e.target.value)} /></FieldGroup>
                <FieldGroup label="Company logo">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-sm" />
                    <label className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold cursor-pointer transition-colors">
                      Upload logo <input type="file" className="hidden" />
                    </label>
                  </div>
                </FieldGroup>
              </div>
            </GlassCard>
          </section>

          {/* Preferences */}
          <section id="preferences">
            <GlassCard title="Preferences" desc="Localization and currency defaults.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Language">
                  <Select
                    value={settings.preferences.language}
                    onChange={(e) => patchPref("language", e.target.value)}
                  >
                    <option>English (UK)</option><option>English (US)</option>
                    <option>Urdu (اردو)</option><option>Arabic (العربية)</option>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Time zone">
                  <Select
                    value={settings.preferences.time_zone}
                    onChange={(e) => patchPref("time_zone", e.target.value)}
                  >
                    <option>(UTC+05:00) Pakistan Standard Time</option>
                    <option>(UTC+04:00) Gulf Standard Time</option>
                    <option>(UTC+00:00) UTC</option>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Date format">
                  <Select
                    value={settings.preferences.date_format}
                    onChange={(e) => patchPref("date_format", e.target.value)}
                  >
                    <option>DD/MM/YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Currency">
                  <Select
                    value={settings.preferences.currency}
                    onChange={(e) => patchPref("currency", e.target.value)}
                  >
                    <option>PKR — Pakistani Rupee</option><option>AED — UAE Dirham</option><option>USD — US Dollar</option>
                  </Select>
                </FieldGroup>
              </div>
            </GlassCard>
          </section>

          {/* Appearance */}
          <section id="appearance">
            <GlassCard title="Appearance" desc="Choose how OxiGen Admin looks on your devices.">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ] as const).map(t => {
                  const active = theme === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTheme(t.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-2xl p-4 border transition-all",
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-secondary"
                      )}
                    >
                      <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl",
                        active ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm" : "bg-secondary text-muted-foreground"
                      )}>
                        <t.icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-bold text-foreground">{t.label}</span>
                      {active && (
                        <motion.span layoutId="theme-ring" className="absolute inset-0 rounded-2xl ring-2 ring-primary/40 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </section>

          {/* Notifications */}
          <section id="notifications">
            <GlassCard title="Notifications" desc="Choose what you want to hear about.">
              <div className="space-y-3">
                <Toggle label="Email notifications"   desc="Order updates, stock alerts and customer inquiries." checked={settings.notifications.email} onChange={(v) => patchNotif("email", v)} />
                <Toggle label="Push notifications"    desc="Real-time alerts on your devices." checked={settings.notifications.push} onChange={(v) => patchNotif("push", v)} />
                <Toggle label="Marketing emails"      desc="Tips, wellness campaigns and performance." checked={settings.notifications.marketing} onChange={(v) => patchNotif("marketing", v)} />
              </div>
            </GlassCard>
          </section>

          {/* Security */}
          <section id="security">
            <GlassCard title="Security" desc="Keep your account safe.">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-4 w-4" /></span>
                    <div>
                      <div className="text-sm font-bold text-foreground">Change password</div>
                      <div className="text-xs text-muted-foreground">Manage your login credentials.</div>
                    </div>
                  </div>
                  <a href="/dashboard/security" className="inline-flex items-center h-9 px-3.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-colors shadow-sm">Update password</a>
                </div>

                <div className="h-px bg-border" />

                <Toggle label="Two-factor authentication" desc="Require a code from your authenticator app on sign in." checked={twofa} onChange={setTwofa} />

                <div className="h-px bg-border" />

                <div>
                  <div className="text-sm font-bold text-foreground mb-2.5">Active sessions</div>
                  <ul className="space-y-2">
                    {[
                      { icon: Laptop2, device: "Admin Workstation — Chrome", where: "Lahore, PK", current: true },
                      { icon: Smartphone, device: "iPhone 15 — OxiGen Admin iOS", where: "Karachi, PK" },
                    ].map(s => (
                      <li key={s.device} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground"><s.icon className="h-4 w-4" /></span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{s.device}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.where}</div>
                        </div>
                        {s.current ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">This device</span>
                        ) : (
                          <button type="button" className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">Revoke</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GlassCard>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button type="button" className="h-10 px-4 rounded-xl glass hover:bg-white/10 text-sm font-medium transition-colors">Cancel</button>
            <SaveButton status={status} />
          </div>
        </form>
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 border",
          checked ? "bg-primary-gradient border-transparent shadow-glow" : "bg-white/[0.05] border-white/10"
        )}
      >
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
