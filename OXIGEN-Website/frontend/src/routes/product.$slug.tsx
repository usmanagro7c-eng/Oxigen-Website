import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Minus,
  Plus,
  Heart,
  ShoppingCart,
  MessageCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
  Flame,
  Clock,
  Star,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";
import { useStore } from "@/lib/store";
import { getProduct, catalog, formatPKR, slugify, getProductReviews, getReviewStats, brand } from "@/lib/site-data";
import { API_BASE, getProductImage } from "@/lib/api";

/**
 * Build a wa.me deep-link that pre-fills a WhatsApp order message for a product.
 * Falls back to the generic brand link if no product is passed.
 */
function orderOnWhatsAppUrl(name?: string, price?: number, qty = 1): string {
  const base = "https://wa.me/+923307069091?text=";
  const msg = name
    ? `Hi%20OxiGen%2C%20I%27d%20like%20to%20order%3A%0A%0A%F0%9F%9B%92%20${encodeURIComponent(name)}${price ? `%20%E2%80%94%20${encodeURIComponent(formatPKR(price))}` : ""}%0A%F0%9F%94%A2%20Qty%3A%20${qty}%0A%0APlease%20share%20delivery%20details.%20Thank%20you!`
    : brand.whatsapp.split("?text=")[1] ?? "";
  return `${base}${msg}`;
}

function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

function StockTimer({ slug }: { slug: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Deterministic per-product deadline for today (resets daily) to avoid SSR mismatch.
  useEffect(() => {
    setMounted(true);
    const seed = slug.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const endHour = 18 + (seed % 6); // ends between 6pm–11pm local
    const end = new Date();
    end.setHours(endHour, (seed * 7) % 60, 0, 0);
    if (end.getTime() < Date.now()) end.setDate(end.getDate() + 1);
    const deadline = end.getTime();

    setNow(Math.max(0, deadline - Date.now()));
    const id = setInterval(() => setNow(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(id);
  }, [slug]);

  const seed = slug.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const stockLeft = 3 + (seed % 8); // 3–10 units left
  const stockPct = Math.min(100, Math.max(12, (stockLeft / 20) * 100));

  const h = now === null ? 0 : Math.floor(now / 3_600_000);
  const m = now === null ? 0 : Math.floor((now % 3_600_000) / 60_000);
  const s = now === null ? 0 : Math.floor((now % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
          <Flame className="h-4 w-4 text-primary" /> Sale ends soon
        </span>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          {[
            { v: mounted ? h : 0, l: "Hrs" },
            { v: mounted ? m : 0, l: "Min" },
            { v: mounted ? s : 0, l: "Sec" },
          ].map((t, i) => (
            <div key={t.l} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center">
                <span className="grid min-w-9 place-items-center rounded-lg bg-gradient-to-r from-primary to-accent px-1.5 py-1 font-display text-sm font-extrabold tabular-nums text-white">
                  {pad(t.v)}
                </span>
                <span className="mt-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                  {t.l}
                </span>
              </div>
              {i < 2 && <span className="pb-3 font-bold text-primary">:</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-medium text-ink">
          <span>
            Only <span className="font-bold text-primary">{stockLeft} left</span> in stock
          </span>
          <span className="text-muted-foreground">Selling fast</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${stockPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    // Try the static catalog first
    const catalogProduct = getProduct(params.slug);
    if (catalogProduct) return { product: catalogProduct, fromAPI: false };

    // Fallback: fetch from the ERP API and resolve by route
    try {
      const res = await fetch(
        `${API_BASE}/items`,
      );
      if (res.ok) {
        const json = await res.json();
        const apiItems = json.data || [];
        const match = apiItems.find(
          (i: Record<string, unknown>) =>
            (i.route as string)?.split("/").pop() === params.slug,
        );
        if (match) {
          const itemRes = await fetch(
            `${API_BASE}/items/${encodeURIComponent(match["name"] as string)}`,
          );
          if (itemRes.ok) {
            const itemJson = await itemRes.json();
            const availableQty = typeof d.custom_stock_qty === "number" ? d.custom_stock_qty : null;
            // Normalize API product to CatalogItem shape
            const normalized = {
              slug: (d.route as string)?.split("/").pop() ?? slugify(d.item_name || ""),
              name: d.web_item_name || d.item_name,
              subtitle: (d.short_description as string) || "",
              desc: (d.description as string) || "",
              price: d.standard_rate || 0,
              was: 0,
              tag: (d.item_group as string) || "",
              img: getProductImage(d.image),
              gallery: (d.slideshow_images as string[])?.map(
                (i: string) => getProductImage(i),
              ) || [],
              highlights: [],
              ingredients: (d.web_long_description as string) || "",
              stockQty: availableQty,
              available: availableQty === null ? true : availableQty > 0,
            };
            return { product: normalized, fromAPI: true };
          }
        }
      }
    } catch {
      // ignore — fall through to not-found
    }

    throw notFound();
  },
  head: ({ loaderData, params }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Product not found — OxiGen" }, { name: "robots", content: "noindex" }],
      };
    const p = loaderData.product;
    const stats = getReviewStats(getProductReviews(p.slug));
    const price = String(p.price);
    return {
      meta: [
        { title: `${p.name} — OxiGen` },
        { name: "description", content: p.desc },
        { property: "og:title", content: p.name },
        { property: "og:description", content: p.desc },
        { property: "og:type", content: "product" },
        { property: "og:image", content: p.img },
        { property: "og:url", content: `/product/${params.slug}` },
        { name: "twitter:image", content: p.img },
      ],
      links: [{ rel: "canonical", href: `/product/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.desc,
            image: p.gallery ?? [p.img],
            brand: { "@type": "Brand", name: "OxiGen" },
            offers: {
              "@type": "Offer",
              priceCurrency: "PKR",
              price,
              availability: "https://schema.org/InStock",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: stats.avg,
              reviewCount: stats.total,
            },
          }),
        },
      ],
    };
  },

  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-5 pt-40 pb-24 text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink">Product not found</h1>
        <Link
          to="/shop"
          className="mt-6 inline-block rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
        >
          Back to Shop
        </Link>
      </div>
    </SiteLayout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleWishlist, inWishlist, setDrawerOpen, apiCatalog } = useStore();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const saved = inWishlist(product.slug);
  // "You may also like" — pull from Frappe Website Items via API first;
  // fall back to the static catalog only if no API products have loaded.
  const related = (apiCatalog.length > 0 ? apiCatalog : catalog)
    .filter((prod) => prod.slug !== product.slug)
    .slice(0, 3);
  const gallery = product.gallery?.length ? product.gallery : [product.img];
  const reviews = getProductReviews(product.slug);
  const { total: reviewCount, avg: avgRating } = getReviewStats(reviews);

  const buyNow = () => {
    if (!product.available) return;
    addToCart(product.slug, qty);
    setDrawerOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 pt-32 pb-8">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-white to-secondary p-8">
                <span className="absolute left-6 top-6 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-1 text-xs font-semibold text-white shadow">
                  {product.tag}
                </span>
                <img
                  src={gallery[activeImg]}
                  alt={product.name}
                  className="mx-auto aspect-square w-full max-w-md object-contain"
                />
              </div>
              {gallery.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {gallery.map((src: string, i: number) => (
                    <button
                      key={src}
                      onClick={() => setActiveImg(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-white to-secondary p-2 transition-all ${
                        activeImg === i
                          ? "ring-2 ring-primary"
                          : "ring-1 ring-black/5 hover:ring-primary/40"
                      }`}
                    >
                      <img
                        src={src}
                        alt={`${product.name} ${i + 1}`}
                        loading="lazy"
                        className="aspect-square w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 text-lg font-medium text-primary">{product.subtitle}</p>

              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
                <Stars rating={avgRating} />
                <span className="font-semibold text-ink">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewCount} reviews)</span>
              </a>

              <div className="mt-4 flex items-baseline gap-3">
                {product.available ? (
                  <>
                    <span className="text-3xl font-extrabold text-ink">
                      {formatPKR(product.price)}
                    </span>
                    {product.was > 0 && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPKR(product.was)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-ink">
                      {formatPKR(product.price)}
                    </span>
                    {product.available ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                        <Check className="h-3.5 w-3.5" />
                        {typeof (product as any).stockQty === "number"
                          ? `${(product as any).stockQty} Units Available`
                          : "In Stock"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 border border-rose-500/20">
                        Out of Stock
                      </span>
                    )}
                  </>
                )}
              </div>

              <div
                className="mt-5 leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: product.desc }}
              />

              {product.highlights.length > 0 && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {product.highlights.map((h: string) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                    </li>
                  ))}
                </ul>
              )}

              {product.available && <StockTimer slug={product.slug} />}

              {product.available && (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <span className="text-sm font-semibold text-ink">Quantity</span>
                  <div className="inline-flex items-center rounded-xl border border-border glass p-1">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="grid h-10 w-10 place-items-center rounded-lg text-ink transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 select-none text-center text-base font-bold tabular-nums text-ink">
                      {qty}
                    </span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => {
                        const max = typeof (product as any).stockQty === "number" ? Math.max(1, (product as any).stockQty) : 99;
                        setQty((q) => Math.min(max, q + 1));
                      }}
                      disabled={qty >= (typeof (product as any).stockQty === "number" ? Math.max(1, (product as any).stockQty) : 99)}
                      className="grid h-10 w-10 place-items-center rounded-lg text-ink transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Subtotal{" "}
                    <span className="font-bold text-ink">{formatPKR(product.price * qty)}</span>
                  </span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => addToCart(product.slug, qty)}
                  disabled={!product.available}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </button>
                <button
                  onClick={buyNow}
                  disabled={!product.available}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy Now
                </button>
                <button
                  aria-label="Toggle wishlist"
                  onClick={() => toggleWishlist(product.slug)}
                  className={`grid h-[52px] w-[52px] place-items-center rounded-xl glass transition-colors ${saved ? "text-primary" : "text-ink hover:text-primary"}`}
                >
                  <Heart className={`h-5 w-5 ${saved ? "fill-primary" : ""}`} />
                </button>
              </div>
              <a
                href={orderOnWhatsAppUrl(product.name, product.price, qty)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald/20 transition-transform hover:scale-[1.02]"
              >
                <MessageCircle className="h-4 w-4" /> Order on WhatsApp
              </a>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: Truck, t: "Free Shipping" },
                  { Icon: ShieldCheck, t: "100% Authentic" },
                  { Icon: RotateCcw, t: "7-Day Returns" },
                ].map(({ Icon, t }) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 rounded-2xl glass px-3 py-3 text-xs font-medium text-ink"
                  >
                    <Icon className="h-5 w-5 text-primary" /> {t}
                  </div>
                ))}
              </div>

              <ul className="mt-6 space-y-2">
                {[
                  "Lab-tested premium ingredients",
                  "Cash on delivery available",
                  "Trusted by thousands across Pakistan",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {product.ingredients && (
          <Reveal>
            <section className="mt-14 rounded-3xl glass p-7 sm:p-9">
              <h2 className="font-display text-2xl font-extrabold text-ink">Supplement Facts</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{product.ingredients}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Take as directed on the label or as advised by your healthcare professional. Do not
                exceed the recommended daily intake.
              </p>
            </section>
          </Reveal>
        )}

        <section id="reviews" className="mt-16 scroll-mt-28">
          <Reveal>
            <div className="rounded-3xl glass p-7 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-ink">
                    Customer Reviews
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    What our customers say about {product.name}
                  </p>
                </div>
                <div className="flex items-center gap-4 rounded-2xl bg-secondary px-5 py-4">
                  <span className="font-display text-4xl font-extrabold text-ink">
                    {avgRating.toFixed(1)}
                  </span>
                  <div>
                    <Stars rating={avgRating} className="h-4 w-4" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on {reviewCount} reviews
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {reviews.map((r, i) => (
                  <Reveal key={`${r.name}-${i}`} delay={i * 0.05}>
                    <div className="flex h-full flex-col rounded-2xl border border-border bg-background/60 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-white">
                            {r.name.charAt(0)}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-ink">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.date}</p>
                          </div>
                        </div>
                        <Stars rating={r.rating} className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-ink">{r.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {r.text}
                      </p>
                      {r.verified && (
                        <span className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-medium text-emerald">
                          <Check className="h-3.5 w-3.5" /> Verified purchase
                        </span>
                      )}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-extrabold text-ink">You may also like</h2>
          <div className="mt-6 grid gap-7 md:grid-cols-3">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.08}>
                <div className="group flex h-full flex-col overflow-hidden rounded-3xl glass p-6 transition-all duration-500 hover:-translate-y-2">
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
