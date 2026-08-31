import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Mission, Why } from "@/components/site/Sections";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OxiGen — Wellness for Life" },
      {
        name: "description",
        content:
          "OxiGen explores the goodness of nature with innovation. Learn about our mission to build a healthy community through quality, transparent nutritional supplements.",
      },
      { property: "og:title", content: "About OxiGen — Wellness for Life" },
      {
        property: "og:description",
        content: "Our mission: exploring the goodness of nature with innovation.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Our Mission — Wellness for Life"
        title="About OxiGen"
        sub="Exploring the goodness of nature with innovation."
      />
      <Mission />
      <Why />
    </SiteLayout>
  );
}
