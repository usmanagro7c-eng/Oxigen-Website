import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send, KeyRound, ArrowLeft } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — OxiGen" },
      {
        name: "description",
        content: "Enter your email to receive a link to reset your OxiGen password.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { forgotPassword } = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await forgotPassword(email);
    if (success) setSent(true);
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Account"
        title="Forgot Password"
        sub="Enter your email and we'll send you a link to reset your password."
      />
      <section className="mx-auto max-w-md px-5 pb-24">
        {sent ? (
          <Reveal>
            <div className="space-y-4 rounded-3xl glass p-7 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-lg font-semibold text-ink">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If this email is registered, a password reset link has been sent to{" "}
                <span className="font-medium text-ink">{email}</span>.
              </p>
              <Link
                to="/signin"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <form onSubmit={submit} className="space-y-4 rounded-3xl glass p-7">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white/60 py-3 pl-10 pr-4 text-sm text-ink outline-none focus:border-primary"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg"
              >
                <Send className="h-4 w-4" /> Send Reset Link
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/signin" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Reveal>
        )}
      </section>
    </SiteLayout>
  );
}
