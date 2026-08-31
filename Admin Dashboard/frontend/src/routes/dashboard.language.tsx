import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Globe, Check } from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Select, SaveButton } from "@/components/dashboard/glass-form";

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

function LanguagePage() {
  const [lang, setLang] = useState("en");
  const [rtl, setRtl] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"saved">("idle");

  const save = (e: React.FormEvent) => {
    e.preventDefault(); setStatus("loading");
    setTimeout(() => { setStatus("saved"); setTimeout(() => setStatus("idle"), 1400); }, 700);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="Language & Region" />
      <Header icon={Globe} title="Language & Region" subtitle="Localize your workspace, currency and timezones." />

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Language" desc="Interface & AI response language">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGS.map((l, i) => (
              <motion.button
                key={l.code}
                type="button"
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                onClick={() => { setLang(l.code); setRtl(!!l.rtl); }}
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
              <Select defaultValue="PK">
                <option value="PK">Pakistan</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AE">United Arab Emirates</option>
                <option value="SA">Saudi Arabia</option>
                <option value="DE">Germany</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Currency">
              <Select defaultValue="PKR">
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Timezone">
              <Select defaultValue="pt">
                <option value="pt">(GMT-08:00) Pacific Time</option>
                <option>(GMT+00:00) UTC</option>
                <option>(GMT+01:00) Berlin</option>
                <option>(GMT+09:00) Tokyo</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Number format">
              <Select defaultValue="1,234.56">
                <option>1,234.56</option>
                <option>1.234,56</option>
                <option>1 234,56</option>
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
