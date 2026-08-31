import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { csrfToken } from "@/lib/store";

import { API_BASE } from "@/lib/api";

export const Route = createFileRoute("/set-password")({
  component: SetPasswordPage,
  validateSearch: (search: Record<string, string | undefined>) => ({
    token: search.token as string | undefined,
    email: search.email as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Set Password — OxiGen" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SetPasswordPage() {
  const { token, email } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !email) {
      setError("This link is invalid or has expired. Please sign up again.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() },
        credentials: "include",
        body: JSON.stringify({ token, email, password }),
      }).then((r) => r.json());

      if (!res.success) {
        setError(res.error || "Failed to set password. The link may have expired.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate({ to: "/signin", search: { registered: undefined } }), 3000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <SiteLayout>
        <PageHeader eyebrow="Error" title="Invalid Link" sub="This link is incomplete." />
        <section className="mx-auto max-w-md px-5 pb-24 text-center">
          <div className="rounded-3xl glass p-7">
            <p className="text-sm text-muted-foreground">
              This password-set link is missing required information. Please check your email for the full link or{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">sign up again</Link>.
            </p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  if (success) {
    return (
      <SiteLayout>
        <PageHeader eyebrow="Done" title="Password Set!" sub="You're all set." />
        <section className="mx-auto max-w-md px-5 pb-24 text-center">
          <div className="rounded-3xl glass p-7">
            <KeyRound className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-sm text-muted-foreground">
              Your password has been set successfully. Redirecting you to sign in...
            </p>
            <Link
              to="/signin"
              search={{ registered: undefined as string | undefined }}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white"
            >
              Sign In Now
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Account"
        title="Set Your Password"
        sub="Choose a strong password for your new account."
      />
      <section className="mx-auto max-w-md px-5 pb-24">
        <Reveal>
          <form onSubmit={submit} className="space-y-4 rounded-3xl glass p-7">
            <div className="rounded-xl border border-border bg-blue-50/60 px-4 py-3 text-sm text-muted-foreground">
              Setting password for <span className="font-medium text-ink">{email}</span>
            </div>

            {error && (
              <p className="rounded-xl border border-border bg-red-50/60 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-white/60 py-3 pl-10 pr-10 text-sm text-ink outline-none focus:border-primary"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-white/60 py-3 pl-10 pr-4 text-sm text-ink outline-none focus:border-primary"
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {submitting ? "Setting Password..." : "Set Password"}
            </button>
          </form>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
