import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Categories } from "@/components/site/Sections";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Supplement Categories — OxiGen Pakistan" },
      {
        name: "description",
        content:
          "Explore OxiGen supplement categories: Multivitamins, Women's Health, Men's Health and Brain Health. Premium nutrition for every wellness goal.",
      },
      { property: "og:title", content: "Supplement Categories — OxiGen" },
      {
        property: "og:description",
        content: "Browse OxiGen supplement categories for every wellness goal.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/categories" },
    ],
    links: [{ rel: "canonical", href: "/categories" }],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Natural choice for your health"
        title="Shop by Category"
        sub="Explore premium nutritional supplements for every wellness goal."
      />
      <Categories showHeading={false} />
    </SiteLayout>
  );
}
