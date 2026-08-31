import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Contact } from "@/components/site/Sections";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact OxiGen — Chat on WhatsApp" },
      {
        name: "description",
        content:
          "Contact OxiGen for help choosing the right supplements. Chat with our team on WhatsApp. Free shipping, 7-day returns and cash on delivery across Pakistan.",
      },
      { property: "og:title", content: "Contact OxiGen" },
      { property: "og:description", content: "Get in touch with the OxiGen team on WhatsApp." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Get in touch"
        title="Start your wellness journey"
        sub="Have a question about our supplements? Our team is here to help."
      />
      <Contact />
    </SiteLayout>
  );
}
