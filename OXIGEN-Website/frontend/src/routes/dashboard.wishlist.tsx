import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star, X } from "lucide-react";
import { DashCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { useStore } from "@/lib/store";
import { formatPKR } from "@/lib/site-data";

export const Route = createFileRoute("/dashboard/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlistItems, toggleWishlist, addToCart } = useStore();

  if (wishlistItems.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        desc="Save your favourite supplements to easily find them later."
        action={
          <Link to="/shop" className="rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white">
            Browse Products
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {wishlistItems.map((p) => (
        <DashCard key={p.slug} className="group relative flex flex-col p-4">
          <button
            onClick={() => toggleWishlist(p.slug)}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-ink shadow hover:text-destructive"
            aria-label="Remove from wishlist"
          >
            <X className="h-4 w-4" />
          </button>
          <Link
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="mb-3 aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-secondary via-white to-secondary"
          >
            <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
          </Link>
          <Link to="/product/$slug" params={{ slug: p.slug }} className="line-clamp-2 text-sm font-bold text-ink hover:text-primary">
            {p.name}
          </Link>
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
            <span className="ml-1 text-muted-foreground">(4.8)</span>
          </div>
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-base font-black text-ink">
              {p.available ? formatPKR(p.price) : "Soon"}
            </span>
            <button
              onClick={() => addToCart(p.slug)}
              disabled={!p.available}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-xs font-semibold text-white shadow-md shadow-primary/25 disabled:opacity-50"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </DashCard>
      ))}
    </div>
  );
}
