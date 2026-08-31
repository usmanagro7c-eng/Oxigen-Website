import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { FAQ } from "@/components/site/Sections";
import { faqs } from "@/lib/site-data";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — OxiGen Supplements" },
      {
        name: "description",
        content:
          "Frequently asked questions about OxiGen supplements — product types, everyday use, quality standards and the importance of nutritional supplementation.",
      },
      { property: "og:title", content: "FAQ — OxiGen Supplements" },
      {
        property: "og:description",
        content: "Answers to common questions about OxiGen supplements.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="FAQ" title="Frequently Asked Questions" />
      <FAQ showHeading={false} />
    </SiteLayout>
  );
}
