import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, X } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — OxiGen" },
      {
        name: "description",
        content:
          "Your saved OxiGen supplements. Keep track of the products you love and add them to your cart anytime.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlistItems, toggleWishlist, addToCart } = useStore();

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Wishlist"
        title="Your Saved Products"
        sub="The supplements you love, saved for later."
      />

      <section className="mx-auto max-w-6xl px-5 pb-24">
        {wishlistItems.length === 0 ? (
          <Reveal>
            <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl glass px-6 py-16 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
                <Heart className="h-7 w-7" />
              </span>
              <p className="text-muted-foreground">Your wishlist is empty.</p>
              <Link
                to="/shop"
                className="rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
              >
                Browse Products
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {wishlistItems.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl glass p-6 transition-all duration-500 hover:-translate-y-2">
                  <button
                    aria-label="Remove from wishlist"
                    onClick={() => toggleWishlist(p.slug)}
                    className="absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-full glass text-ink hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="relative mb-5 aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-white to-secondary"
                  >
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
                    />
                  </Link>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="font-display text-lg font-bold text-ink hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm font-medium text-primary">{p.subtitle}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-ink">
                      {p.available ? formatPKR(p.price) : "Coming Soon"}
                    </span>
                    <button
                      onClick={() => addToCart(p.slug)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <ShoppingCart className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
