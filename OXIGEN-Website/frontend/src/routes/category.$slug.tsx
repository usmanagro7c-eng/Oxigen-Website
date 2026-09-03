import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowUpRight, ShoppingCart, Heart } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { slugify, formatPKR } from "@/lib/site-data";
import { useStore } from "@/lib/store";
import { API_BASE, getProductImage } from "@/lib/api";

interface ProductItem {
  item_code: string;
  item_name: string;
  route: string;
  standard_rate: number;
  valuation_rate: number;
  custom_stock_qty: number;
  image: string;
  item_group: string;
  short_description: string;
}

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Supplements — OxiGen Pakistan`,
      },
      {
        name: "description",
        content: `Browse ${params.slug.replace(/-/g, " ")} supplements from OxiGen. Premium quality, free shipping across Pakistan.`,
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { addToCart, toggleWishlist, inWishlist } = useStore();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState("");

  const fallbackCategoryName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    setLoading(true);
    setError(false);

    // Step 1: Fetch categories to find the correct ERP item group name for this slug
    fetch(`${API_BASE}/items/groups`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        const categories = json.data || [];
        const matched = categories.find((c: any) => c.slug === slug);
        const groupName = matched ? matched.name : fallbackCategoryName;
        setCategoryTitle(groupName);

        // Step 2: Fetch products belonging to this group
        return fetch(
          `${API_BASE}/items?item_group=${encodeURIComponent(groupName)}`
        );
      })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
        setCategoryTitle(fallbackCategoryName);
      });
  }, [slug]);

  const displayTitle = categoryTitle || fallbackCategoryName;

  return (
    <SiteLayout>
      {/* Decorative right-side panel in logo colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 -z-10 w-24 bg-gradient-to-b from-primary via-accent to-primary opacity-15 blur-2xl sm:w-40 lg:w-56"
      />
      <PageHeader
        eyebrow="Category"
        title={`${displayTitle} Supplements`}
        sub={`Explore our range of premium ${displayTitle.toLowerCase()} supplements.`}
      />
      <section className="mx-auto max-w-6xl px-5 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-7 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-3xl bg-secondary glass" />
            ))}
          </div>
        ) : error || products.length === 0 ? (
          <Reveal>
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No products found in this category.{" "}
                <Link
                  to="/shop"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Browse all products
                </Link>
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-7 xl:grid-cols-3">
            {products.map((p, i) => {
              const productSlug = p.route?.split("/").pop() || slugify(p.item_name);
              const price = p.standard_rate || 0;
              const was = p.valuation_rate || 0;
              const off = was > price ? Math.round(((was - price) / was) * 100) : 0;
              const stockQty = typeof p.custom_stock_qty === "number" ? p.custom_stock_qty : 0;
              const available = stockQty > 0;
              const saved = inWishlist(productSlug);
              const img = getProductImage(p.image);

              return (
                <Reveal key={p.item_code} delay={i * 0.1}>
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl glass p-4 sm:p-6 transition-all duration-500 hover:-translate-y-2">
                    <span className="absolute left-4 top-4 z-10 hidden rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold text-white shadow sm:left-6 sm:top-6 sm:inline-block">
                      {p.item_group}
                    </span>
                    {off > 0 && (
                      <span className="absolute right-4 top-4 z-10 rounded-lg bg-gradient-to-r from-primary to-accent px-2.5 py-1 text-[11px] font-extrabold text-white shadow sm:right-6 sm:top-6">
                        {off}% OFF
                      </span>
                    )}
                    <button
                      aria-label="Toggle wishlist"
                      onClick={() => toggleWishlist(productSlug)}
                      className={`absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full glass transition-colors sm:right-6 sm:top-6 ${saved ? "text-primary" : "text-ink hover:text-primary"}`}
                    >
                      <Heart className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
                    </button>
                    <Link
                      to="/product/$slug"
                      params={{ slug: productSlug }}
                      className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-white to-secondary sm:mb-6"
                    >
                      <img
                        src={img}
                        alt={`${p.item_name}`}
                        loading="lazy"
                        className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-110 sm:p-6"
                      />
                    </Link>
                    <Link
                      to="/product/$slug"
                      params={{ slug: productSlug }}
                      className="line-clamp-2 font-display text-base font-bold text-ink hover:text-primary sm:line-clamp-none sm:text-lg"
                    >
                      {p.item_name}
                    </Link>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <p className="hidden text-sm font-medium text-primary sm:block">Wellness</p>
                      {available ? (
                        <span className="hidden text-[11px] font-bold text-emerald-600 sm:inline">
                          ● {stockQty} in stock
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-500">
                          ● Out of stock
                        </span>
                      )}
                    </div>
                    <p className="mt-2 hidden flex-1 text-sm leading-relaxed text-muted-foreground sm:block">
                      {p.short_description || "Premium quality supplement."}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2 sm:mt-5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-ink sm:text-xl">
                          {formatPKR(price)}
                        </span>
                        {was > price && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPKR(was)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(productSlug)}
                        disabled={!available}
                        aria-label={`Add ${p.item_name} to cart`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105 sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {available ? (
                          <>
                            <span className="hidden sm:inline">Add </span>
                            <ShoppingCart className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Out of Stock
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
