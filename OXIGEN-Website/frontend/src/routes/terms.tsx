import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — OxiGen" },
      {
        name: "description",
        content:
          "The terms and conditions that apply when you browse and shop at OxiGen, Pakistan's premium wellness supplement brand.",
      },
      { property: "og:title", content: "Terms & Conditions — OxiGen" },
      { property: "og:description", content: "Terms that apply when you shop with OxiGen." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      updated="July 2026"
      intro="Please read these terms carefully before using our website or placing an order."
      sections={[
        {
          heading: "Use of our website",
          body: [
            "By accessing this website and placing an order you agree to these terms. You confirm that the information you provide is accurate and that you are able to receive deliveries at the address given.",
          ],
        },
        {
          heading: "Products & pricing",
          body: [
            "We aim to describe our products accurately, including ingredients and usage. Prices are listed in Pakistani Rupees (PKR) and may change from time to time. Promotional offers apply while stocks last.",
            "Our supplements are intended to support general wellbeing and are not a substitute for medical advice. Consult a healthcare professional before use if you are pregnant, nursing, or taking medication.",
          ],
        },
        {
          heading: "Orders",
          body: [
            "Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order and to limit quantities. You will receive confirmation once your order is accepted.",
          ],
        },
        {
          heading: "Limitation of liability",
          body: [
            "To the extent permitted by law, OxiGen is not liable for any indirect or consequential loss arising from the use of our products or website.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about these terms can be directed to our team via WhatsApp or the Contact page.",
          ],
        },
      ]}
    />
  ),
});
