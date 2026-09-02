import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Globe, Check } from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Select, SaveButton } from "@/components/dashboard/glass-form";
import { getSettings, updateSettings } from "@/lib/api";

export const Route = createFileRoute("/dashboard/language")({
  head: () => ({ meta: [{ title: "Language & Region — OxiGen Admin" }] }),
  component: LanguagePage,
});

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦", rtl: true },
  { code: "he", label: "עברית", flag: "🇮🇱", rtl: true },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

type LangCode = (typeof LANGS)[number]["code"];

function LanguagePage() {
  const [lang, setLang] = useState<LangCode>("en");
  const [rtl, setRtl] = useState(false);
  const [country, setCountry] = useState("Pakistan");
  const [currency, setCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("(UTC+05:00) Pakistan Standard Time");
  const [numberFormat, setNumberFormat] = useState("#,###.##");
  const [status, setStatus] = useState<"idle"|"loading"|"saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then(({ data }) => {
        setLang(data.preferences.language as LangCode || "en");
        setCountry(data.preferences.country || "Pakistan");
        setCurrency(data.preferences.currency || "PKR");
        setTimezone(data.preferences.time_zone || "(UTC+05:00) Pakistan Standard Time");
        setNumberFormat(data.preferences.number_format || "#,###.##");
        setRtl(["ar", "he"].includes(data.preferences.language));
      })
      .catch((err) => setError(err.message));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      await updateSettings({
        preferences: {
          language: lang,
          country,
          currency,
          time_zone: timezone,
          number_format: numberFormat,
          date_format: "DD/MM/YYYY",
        },
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1400);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  const selectLang = (code: LangCode, isRtl?: boolean) => {
    setLang(code);
    setRtl(!!isRtl);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="Language & Region" />
      <Header icon={Globe} title="Language & Region" subtitle="Localize your workspace, currency and timezones." />

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {error && (
          <div className="lg:col-span-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">
            {error}
          </div>
        )}
        <GlassCard title="Language" desc="Interface & AI response language">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGS.map((l, i) => (
              <motion.button
                key={l.code}
                type="button"
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                onClick={() => selectLang(l.code, l.rtl)}
                className={`relative rounded-xl glass border p-3 text-left transition ${
                  lang === l.code ? "border-primary/50 shadow-glow" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="text-lg">{l.flag}</div>
                <div className="mt-1 text-sm font-medium">{l.label}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{l.code}</div>
                {lang === l.code && (
                  <span className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-gradient">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Region & formats" desc="Where your business operates">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldGroup label="Country / region">
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="Pakistan">Pakistan</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Germany">Germany</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Currency">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Timezone">
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time</option>
                <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                <option value="(GMT+01:00) Berlin">(GMT+01:00) Berlin</option>
                <option value="(GMT+05:00) Pakistan Standard Time">(GMT+05:00) Pakistan Standard Time</option>
                <option value="(GMT+09:00) Tokyo">(GMT+09:00) Tokyo</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Number format">
              <Select value={numberFormat} onChange={(e) => setNumberFormat(e.target.value)}>
                <option>#,###.##</option>
                <option>#.###,##</option>
                <option># ###,##</option>
              </Select>
            </FieldGroup>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl glass border border-white/10 p-3.5">
            <div>
              <div className="text-sm font-medium">Right-to-left layout</div>
              <div className="text-[11.5px] text-muted-foreground">Mirror the UI for RTL languages</div>
            </div>
            <button
              type="button"
              onClick={() => setRtl(r => !r)}
              className={`relative h-6 w-11 rounded-full transition ${rtl ? "bg-primary-gradient shadow-glow" : "bg-white/10"}`}
            >
              <motion.span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                animate={{ x: rtl ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </GlassCard>

        <div className="lg:col-span-2 flex justify-end">
          <SaveButton status={status} label="Save preferences" />
        </div>
      </form>
    </div>
  );
}
