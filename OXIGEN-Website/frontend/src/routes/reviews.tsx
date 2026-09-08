import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Testimonials, Results } from "@/components/site/Sections";
import { usePageText } from "@/lib/site-content";

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const reviews = usePageText<{
    eyebrow: string; title: string; sub: string;
  }>("reviews");
  return (
    <SiteLayout>
      <PageHeader
        eyebrow={reviews.eyebrow}
        title={reviews.title}
        sub={reviews.sub}
      />
      <Results />
      <Testimonials showHeading={false} />
    </SiteLayout>
  );
}