import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, Package, Heart, User as UserIcon, LayoutDashboard } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — OxiGen" },
      { name: "description", content: "Manage your OxiGen account, view your order history and saved wishlist items." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, orders, wishlistItems, signOut } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/signin" });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <SiteLayout>
      <PageHeader eyebrow="Account" title={`Hi, ${user.name}`} sub="Manage your orders and saved products." />

      <section className="mx-auto max-w-4xl px-5 pb-24 space-y-8">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl glass p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                <UserIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display font-bold text-ink">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
              <button
                onClick={() => {
                  signOut();
                  navigate({ to: "/" });
                }}
                className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold text-ink hover:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="rounded-3xl glass p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Package className="h-5 w-5 text-primary" /> Order History
            </h2>
            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You haven't placed any orders yet.{" "}
                <Link to="/shop" className="font-semibold text-primary hover:underline">Start shopping</Link>.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{o.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.date).toLocaleDateString()}</p>
                      </div>
                      <span className="font-extrabold text-ink">{formatPKR(o.total)}</span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {(o.items || []).map((it) => (
                        <div key={it.slug} className="flex justify-between">
                          <span>{it.name} × {it.qty}</span>
                          <span>{formatPKR(it.price * it.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-3xl glass p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Heart className="h-5 w-5 text-primary" /> Wishlist
              </h2>
              <Link to="/wishlist" className="text-sm font-semibold text-primary hover:underline">View all</Link>
            </div>
            {wishlistItems.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No saved products yet.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {wishlistItems.slice(0, 3).map((p) => (
                  <Link
                    key={p.slug}
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      <img src={p.img} alt={p.name} className="h-full w-full object-contain p-1" />
                    </div>
                    <span className="line-clamp-2 text-sm font-medium text-ink">{p.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
}
