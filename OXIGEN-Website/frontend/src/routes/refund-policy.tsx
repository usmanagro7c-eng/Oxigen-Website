import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useLegalPage } from "@/lib/site-content";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  const refund = useLegalPage("refund");
  return (
    <LegalPage
      eyebrow={refund?.eyebrow ?? "Legal"}
      title={refund?.title ?? "Refund & Return Policy"}
      updated={refund?.updated ?? "July 2026"}
      intro={refund?.intro ?? "We want you to shop with confidence. Here's how returns and refunds work."}
      sections={refund?.sections ?? []}
    />
  );
}