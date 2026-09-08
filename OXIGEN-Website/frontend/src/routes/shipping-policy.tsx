import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useLegalPage } from "@/lib/site-content";

export const Route = createFileRoute("/shipping-policy")({
  component: ShippingPolicyPage,
});

function ShippingPolicyPage() {
  const shipping = useLegalPage("shipping");
  return (
    <LegalPage
      eyebrow={shipping?.eyebrow ?? "Legal"}
      title={shipping?.title ?? "Shipping Policy"}
      updated={shipping?.updated ?? "July 2026"}
      intro={shipping?.intro ?? "Fast, reliable delivery across Pakistan — with cash on delivery available."}
      sections={shipping?.sections ?? []}
    />
  );
}