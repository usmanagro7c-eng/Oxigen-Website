import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping Policy — OxiGen" },
      {
        name: "description",
        content:
          "OxiGen shipping information: free delivery, cash on delivery and estimated delivery times across Pakistan.",
      },
      { property: "og:title", content: "Shipping Policy — OxiGen" },
      {
        property: "og:description",
        content: "Delivery times, charges and coverage across Pakistan.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/shipping-policy" },
    ],
    links: [{ rel: "canonical", href: "/shipping-policy" }],
  }),
  component: () => (
    <LegalPage
      eyebrow="Legal"
      title="Shipping Policy"
      updated="July 2026"
      intro="Fast, reliable delivery across Pakistan — with cash on delivery available."
      sections={[
        {
          heading: "Delivery coverage",
          body: [
            "We deliver nationwide across Pakistan through trusted courier partners, including major cities and most towns.",
          ],
        },
        {
          heading: "Shipping charges",
          body: [
            "Enjoy free shipping on your order during our current promotion. Any applicable charges will always be shown clearly at checkout before you confirm.",
          ],
        },
        {
          heading: "Delivery times",
          body: [
            "Orders are typically dispatched within 1–2 business days. Delivery usually takes 2–5 business days depending on your location. You will receive tracking details once your order ships.",
          ],
        },
        {
          heading: "Cash on delivery",
          body: [
            "Prefer to pay when your order arrives? Cash on delivery is available across Pakistan. Please keep the exact amount ready for the courier.",
          ],
        },
      ]}
    />
  ),
});
