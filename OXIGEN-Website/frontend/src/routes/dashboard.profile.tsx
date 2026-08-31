import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Camera, KeyRound, Save } from "lucide-react";
import { DashCard, SectionHeader } from "@/components/dashboard/DashboardShell";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, updateProfile } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    status: "Member",
    memberSince: "",
  });

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile(form);
    if (success) {
      setEditing(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <DashCard className="lg:col-span-1">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent text-3xl font-black text-white shadow-lg shadow-primary/25">
              {form.name ? form.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "U"}
            </div>
            <button className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-white text-primary shadow-md ring-1 ring-border">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 font-display text-lg font-extrabold text-ink">{form.name}</p>
          <p className="text-sm text-muted-foreground">{form.email}</p>
          <span className="mt-3 inline-flex rounded-full bg-gradient-to-r from-primary/15 to-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            {form.status}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">Member since {form.memberSince}</p>
        </div>
      </DashCard>

      <DashCard className="lg:col-span-2">
        <SectionHeader
          title="Personal Information"
          action={
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          }
        />

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} disabled={!editing} />
          <Field label="Email" type="email" value={form.email} disabled />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} disabled={!editing} />
          {editing ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Gender</span>
              <select
                value={form.gender ? (form.gender.charAt(0).toUpperCase() + form.gender.slice(1).toLowerCase()) : ""}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
          ) : (
            <Field label="Gender" value={form.gender} disabled />
          )}
          <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} disabled={!editing} />

          <div className="sm:col-span-2 flex flex-wrap gap-2 border-t border-border/70 pt-4">
            <button
              type="submit"
              disabled={!editing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Save Changes
            </button>
            <Link
              to="/dashboard/security"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
            >
              <KeyRound className="h-4 w-4" /> Change Password
            </Link>
          </div>
        </form>
      </DashCard>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary disabled:bg-secondary/60 disabled:text-ink/70"
      />
    </label>
  );
}
