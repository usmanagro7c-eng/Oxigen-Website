import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OxiGen" },
      {
        name: "description",
        content:
          "How OxiGen collects, uses and protects your personal information when you shop with us across Pakistan.",
      },
      { property: "og:title", content: "Privacy Policy — OxiGen" },
      {
        property: "og:description",
        content: "How OxiGen handles and protects your personal data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="July 2026"
      intro="Your privacy matters to us. This policy explains what we collect and how we use it."
      sections={[
        {
          heading: "Information we collect",
          body: [
            "When you place an order or contact us, we collect the details you provide — such as your name, phone number, delivery address and email address. This information is used only to process and deliver your order.",
            "We do not store card details. Payments are handled through cash on delivery or secure third-party payment providers.",
          ],
        },
        {
          heading: "How we use your information",
          body: [
            "We use your information to confirm orders, arrange delivery, provide customer support and, where you have opted in, send occasional offers and wellness tips.",
            "You can unsubscribe from marketing messages at any time.",
          ],
        },
        {
          heading: "Sharing your information",
          body: [
            "We share your delivery details only with our courier partners so your order can reach you. We never sell your personal data to third parties.",
          ],
        },
        {
          heading: "Data security",
          body: [
            "We apply reasonable safeguards to protect your information. While no online service can guarantee absolute security, we work to keep your data safe and limit access to it.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You may request access to, correction of, or deletion of the personal information we hold about you by contacting us on WhatsApp or through our Contact page.",
          ],
        },
      ]}
    />
  ),
});
