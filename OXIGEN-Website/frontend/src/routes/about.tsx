import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Mission, Why } from "@/components/site/Sections";
import { usePageText } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const about = usePageText<{
    eyebrow: string; title: string; sub: string;
  }>("about");
  return (
    <SiteLayout>
      <PageHeader
        eyebrow={about.eyebrow}
        title={about.title}
        sub={about.sub}
      />
      <Mission />
      <Why />
    </SiteLayout>
  );
}