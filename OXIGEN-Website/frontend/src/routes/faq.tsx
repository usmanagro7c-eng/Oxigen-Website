import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { FAQ } from "@/components/site/Sections";
import { useFaqs } from "@/lib/site-content";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
});

function FaqJsonLd() {
  const faqs = useFaqs();
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function FaqPage() {
  return (
    <SiteLayout>
      <FaqJsonLd />
      <PageHeader eyebrow="FAQ" title="Frequently Asked Questions" />
      <FAQ showHeading={false} />
    </SiteLayout>
  );
}