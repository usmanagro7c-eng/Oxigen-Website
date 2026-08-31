import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, string | undefined>): { registered?: string } => ({
    registered: search.registered,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — OxiGen" },
      {
        name: "description",
        content:
          "Sign in to your OxiGen account to track orders, manage your wishlist and enjoy a faster checkout.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { signIn, user } = useStore();
  const navigate = useNavigate();
  const { registered } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signIn(email, password);
    if (success) navigate({ to: "/dashboard" });
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Account"
        title="Welcome Back"
        sub="Sign in to continue your wellness journey."
      />
      <section className="mx-auto max-w-md px-5 pb-24">
        {registered === "true" && (
          <p className="mb-6 rounded-xl border border-border bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
            Account created! Please check your email to set your password.
          </p>
        )}
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
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-ink">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white/60 py-3 pl-10 pr-10 text-sm text-ink outline-none focus:border-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink focus:outline-none flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
