import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, Mail, UserPlus } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — OxiGen" },
      {
        name: "description",
        content:
          "Create your free OxiGen account to save your wishlist, track orders and check out faster.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { signUp, user } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signUp(email, name);
    if (success) navigate({ to: "/signin", search: { registered: "true" } });
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Account"
        title="Create Your Account"
        sub="Join OxiGen for a faster, personalized shopping experience."
      />
      <section className="mx-auto max-w-md px-5 pb-24">
        <Reveal>
          <form onSubmit={submit} className="space-y-4 rounded-3xl glass p-7">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Full Name</label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white/60 py-3 pl-10 pr-4 text-sm text-ink outline-none focus:border-primary"
                  placeholder="Your name"
                />
              </div>
            </div>
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
            <p className="rounded-xl border border-border bg-blue-50/60 px-4 py-3 text-sm text-muted-foreground">
              After signing up you'll receive an email to set your password.
            </p>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg"
            >
              <UserPlus className="h-4 w-4" /> Create Account
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" search={{ registered: undefined as string | undefined }} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
