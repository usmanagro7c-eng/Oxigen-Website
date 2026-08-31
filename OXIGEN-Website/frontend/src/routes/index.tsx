import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Star,
  Truck,
  ShieldCheck,
  Users,
  Leaf,
  RotateCcw,
  HeartPulse,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BannerCarousel } from "@/components/site/BannerCarousel";
import { QuickLinks } from "@/components/site/QuickLinks";
import { TrendingGrid } from "@/components/site/TrendingGrid";
import { PromoBanners } from "@/components/site/PromoBanners";
import {
  Categories,
  Why,
  Results,
  Testimonials,
  FAQ,
  TrustBadges,
} from "@/components/site/Sections";
import { Reveal } from "@/components/site/Reveal";
import { SaleTimer } from "@/components/site/SaleTimer";
import { brand, products } from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OxiGen — Pakistan's No.1 Vitamin & Wellness Brand" },
      {
        name: "description",
        content:
          "Shop premium OxiGen supplements — Nutri-Cept for women's hormonal balance & PCOS care, and OxiDop for laser focus & dopamine support. Free shipping across Pakistan, quality guaranteed.",
      },
      { property: "og:title", content: "OxiGen — Pakistan's No.1 Vitamin & Wellness Brand" },
      {
        property: "og:description",
        content:
          "Premium nutritional supplements for hormonal wellness, PCOS care, focus, and natural energy.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: products[0].img },
      { name: "twitter:image", content: products[0].img },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "OxiGen",
          description: brand.tagline,
          sameAs: [brand.facebook, brand.instagram],
        }),
      },
    ],
  }),
  component: Index,
});

function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary via-royal to-accent p-10 text-center text-white sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{brand.promo}</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/90">
            Start your wellness journey today — quality guaranteed, free shipping and 7-day returns.
          </p>
          <Link
            to="/shop"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-xl transition-transform hover:scale-105"
          >
            Shop Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

const stats = [
  { icon: Star, value: "4.9/5", label: "Average rating" },
  { icon: Users, value: "10,000+", label: "Happy customers" },
  { icon: Truck, value: "Free", label: "Nationwide shipping" },
  { icon: ShieldCheck, value: "100%", label: "Quality guaranteed" },
];

function Stats() {
  return (
    <section className="mx-auto -mt-6 max-w-6xl px-5">
      <Reveal>
        <div className="grid grid-cols-2 gap-4 rounded-[2rem] glass p-6 sm:p-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="font-display text-2xl font-extrabold text-ink">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

const guarantees = [
  {
    icon: Truck,
    title: "Free Nationwide Shipping",
    desc: "Delivered to your doorstep anywhere in Pakistan.",
  },
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    desc: "Genuine, sealed products you can fully trust.",
  },
  {
    icon: RotateCcw,
    title: "7-Day Easy Returns",
    desc: "Not satisfied? Return within 7 days, hassle-free.",
  },
  { icon: HeartPulse, title: "Science-Informed", desc: "Transparent, quality-led formulations." },
];

function Guarantees() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {guarantees.map((g, i) => (
            <div
              key={g.title}
              className="flex flex-col gap-3 rounded-3xl glass p-6 transition-transform duration-300 hover:-translate-y-1.5"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                <g.icon className="h-6 w-6" />
              </span>
              <h3 className="font-display text-lg font-bold text-ink">{g.title}</h3>
              <p className="text-sm text-muted-foreground">{g.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Index() {
  return (
    <SiteLayout>
      <BannerCarousel />
      <QuickLinks />
      <SaleTimer />
      <TrendingGrid />
      <PromoBanners />
      <Stats />
      <Categories />
      <Guarantees />
      <TrustBadges />
      <Why />
      <Results />
      <Testimonials />
      <FAQ showHeading />
      <CtaBand />
    </SiteLayout>
  );
}
