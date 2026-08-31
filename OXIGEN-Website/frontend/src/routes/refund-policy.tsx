import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Return Policy — OxiGen" },
      {
        name: "description",
        content:
          "OxiGen's 7-day return policy, refund process and how to request a return for supplements ordered across Pakistan.",
      },
      { property: "og:title", content: "Refund & Return Policy — OxiGen" },
      { property: "og:description", content: "How refunds and returns work at OxiGen." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/refund-policy" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: () => (
    <LegalPage
      eyebrow="Legal"
      title="Refund & Return Policy"
      updated="July 2026"
      intro="We want you to shop with confidence. Here's how returns and refunds work."
      sections={[
        {
          heading: "7-day returns",
          body: [
            "If you are not satisfied, you may request a return within 7 days of receiving your order. Items must be unused, in their original sealed packaging and in resalable condition.",
            "For hygiene and safety reasons, opened or used supplement bottles cannot be returned unless the product is damaged or defective.",
          ],
        },
        {
          heading: "Damaged or wrong items",
          body: [
            "If you receive a damaged, defective or incorrect item, contact us within 48 hours of delivery with photos. We will arrange a replacement or full refund at no extra cost.",
          ],
        },
        {
          heading: "How to request a return",
          body: [
            "Message us on WhatsApp or use the Contact page with your order details and reason for return. Our team will guide you through the pickup or drop-off process.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Approved refunds are processed within 5–7 business days after we receive the returned item. Refunds are issued via the original payment method or bank transfer for cash-on-delivery orders.",
          ],
        },
      ]}
    />
  ),
});
