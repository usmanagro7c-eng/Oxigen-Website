import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Star,
  Truck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BannerCarousel } from "@/components/site/BannerCarousel";
import { QuickLinks } from "@/components/site/QuickLinks";
import { TrendingGrid } from "@/components/site/TrendingGrid";
import { PromoBanners } from "@/components/site/PromoBanners";
import {
  Why,
  Results,
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
        <div className="grid grid-cols-2 gap-4 rounded-[2rem] glass p-4 sm:p-8 md:grid-cols-4">
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

function Index() {
  return (
    <SiteLayout>
      <BannerCarousel />
      <QuickLinks />
      <SaleTimer />
      <TrendingGrid />
      <PromoBanners />
      <Stats />
      <Why />
      <Results />
    </SiteLayout>
  );
}
