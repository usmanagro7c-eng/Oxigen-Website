import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Testimonials, Results } from "@/components/site/Sections";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews — OxiGen Supplements" },
      {
        name: "description",
        content:
          "Read real OxiGen customer reviews and see visible transformations. Loved across Pakistan for skin health, energy and immunity.",
      },
      { property: "og:title", content: "Customer Reviews — OxiGen" },
      {
        property: "og:description",
        content: "Real results and reviews from OxiGen customers across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reviews" },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Let customers speak for us"
        title="Loved across Pakistan"
        sub="See the difference consistent, quality nutrition can make."
      />
      <Results />
      <Testimonials showHeading={false} />
    </SiteLayout>
  );
}
