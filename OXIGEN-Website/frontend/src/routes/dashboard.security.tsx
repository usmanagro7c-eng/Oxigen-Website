import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Monitor, Smartphone, ShieldCheck, LogOut } from "lucide-react";
import { DashCard, SectionHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { mockDevices, mockLoginHistory } from "@/lib/dashboard-mock";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

export const Route = createFileRoute("/dashboard/security")({
  head: () => ({ meta: [{ title: "Security — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const [twoFA, setTwoFA] = useState(false);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DashCard>
        <SectionHeader title="Change Password" />
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const old_password = String(f.get("old_password") || "");
            const new_password = String(f.get("new_password") || "");
            const confirm_password = String(f.get("confirm_password") || "");

            if (!old_password || !new_password) {
              toast.error("Password fields are required.");
              return;
            }
            if (new_password !== confirm_password) {
              toast.error("New passwords do not match.");
              return;
            }

            try {
              const csrfRes = await fetch(`${API_BASE}/csrf-token`, { credentials: "include" }).then(r => r.json());
              const csrfToken = csrfRes.csrfToken;

              const res = await fetch(`${API_BASE}/user/change-password`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRF-Token": csrfToken,
                },
                credentials: "include",
                body: JSON.stringify({ old_password, new_password }),
              }).then((r) => r.json());

              if (res.message) {
                toast.success(res.message);
                (e.target as HTMLFormElement).reset();
              } else {
                toast.error(res.error || "Failed to update password.");
              }
            } catch (err) {
              console.error(err);
              toast.error("Failed to update password.");
            }
          }}
        >
          <PasswordField label="Current Password" name="old_password" required />
          <PasswordField label="New Password" name="new_password" required />
          <PasswordField label="Confirm New Password" name="confirm_password" required />
          <button
            type="submit"
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25"
          >
            <KeyRound className="h-4 w-4" /> Update Password
          </button>
        </form>
      </DashCard>

      <DashCard>
        <SectionHeader title="Two-Factor Authentication" />
        <div className="flex items-start gap-4 rounded-xl bg-white/60 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Authenticator App</p>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security using a time-based code from your favourite authenticator app.
            </p>
          </div>
          <button
            onClick={() => { setTwoFA((v) => !v); toast(twoFA ? "2FA disabled" : "2FA enabled"); }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${twoFA ? "bg-gradient-to-r from-primary to-accent" : "bg-secondary"}`}
            aria-pressed={twoFA}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${twoFA ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </DashCard>

      <DashCard className="lg:col-span-2">
        <SectionHeader title="Active Devices" />
        <ul className="divide-y divide-border/60">
          <li className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-ink">
              <Monitor className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Current Session</p>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
            <StatusBadge status="This device" tone="success" />
          </li>
          {mockDevices.map((d) => {
            const Icon = d.device.toLowerCase().includes("iphone") || d.device.toLowerCase().includes("android") ? Smartphone : Monitor;
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{d.device}</p>
                  <p className="text-xs text-muted-foreground">{d.location} · {d.lastActive}</p>
                </div>
                {d.current ? (
                  <StatusBadge status="This device" tone="success" />
                ) : (
                  <button className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20">
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </DashCard>

      <DashCard className="lg:col-span-2">
        <SectionHeader title="Login History" />
        {mockLoginHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No other login history available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3">When</th>
                  <th className="pb-3">Device</th>
                  <th className="pb-3">IP</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {mockLoginHistory.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 text-ink">{l.when}</td>
                    <td className="py-3 text-muted-foreground">{l.device}</td>
                    <td className="py-3 text-muted-foreground">{l.ip}</td>
                    <td className="py-3">
                      <StatusBadge status={l.status} tone={l.status === "Success" ? "success" : "danger"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  );
}

function PasswordField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="password"
        name={name}
        required={required}
        placeholder="••••••••"
        className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary"
      />
    </label>
  );
}
