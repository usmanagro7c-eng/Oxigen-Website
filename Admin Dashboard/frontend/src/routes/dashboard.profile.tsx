import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { UserCircle, Upload, Trash2, Loader2 } from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Input, Select, SaveButton } from "@/components/dashboard/glass-form";
import { getUserProfile, updateUserProfile, uploadProfileImage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — OxiGen Admin" }] }),
  component: ProfilePage,
});

type FormState = {
  full_name: string;
  mobile_no: string;
  phone: string;
  gender: string;
  birth_date: string;
};

function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const email = user?.email;

  const [status, setStatus] = useState<"idle" | "loading" | "saved">("idle");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    mobile_no: "",
    phone: "",
    gender: "",
    birth_date: "",
  });

  useEffect(() => {
    if (!email) return;
    getUserProfile(email)
      .then(({ data }) =>
        setForm({
          full_name: data.full_name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "",
          mobile_no: data.mobile_no ?? "",
          phone: data.phone ?? "",
          gender: data.gender ?? "",
          birth_date: data.birth_date ?? "",
        }),
      )
      .catch((err) => setError(err.message));
  }, [email]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatar(URL.createObjectURL(f));
    setStatus("loading");
    try {
      const result = await uploadProfileImage(f);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1600);
      if (result.data?.image) setAvatar(result.data.image);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setError(null);
    try {
      await updateUserProfile(email, form);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1600);
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  const initials = (form.full_name || email || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb label="Profile" />
      <Header
        icon={UserCircle}
        title="Profile"
        subtitle="Manage your personal information and how others see you."
      />

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* Avatar card */}
        <GlassCard title="Profile picture" desc="PNG or JPG, up to 4MB.">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="relative inline-flex h-24 w-24 items-center justify-center rounded-3xl overflow-hidden bg-accent-gradient text-primary-foreground font-display text-2xl font-semibold shadow-glow"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : initials}
            </motion.div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs font-medium cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5" /> Upload avatar
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-destructive/15 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Personal information" desc="Update your name and contact details.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldGroup label="Full name">
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
            </FieldGroup>
            <FieldGroup label="Email address">
              <Input type="email" value={email ?? ""} disabled placeholder="you@company.com" />
            </FieldGroup>
            <FieldGroup label="Mobile number">
              <Input value={form.mobile_no} onChange={(e) => setForm((f) => ({ ...f, mobile_no: e.target.value }))} placeholder="+1 555 000 0000" />
            </FieldGroup>
            <FieldGroup label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
            </FieldGroup>
            <FieldGroup label="Gender">
              <Select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                <option value="">Select…</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </Select>
            </FieldGroup>
            <FieldGroup label="Birth date">
              <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
            </FieldGroup>
          </div>
        </GlassCard>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setForm((f) => ({ ...f }))} className="h-10 px-4 rounded-xl glass hover:bg-white/10 text-sm font-medium transition-colors">
            Cancel
          </button>
          <SaveButton status={status} />
        </div>
      </form>
    </div>
  );
}
