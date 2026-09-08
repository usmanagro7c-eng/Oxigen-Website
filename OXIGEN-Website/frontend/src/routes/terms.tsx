import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useLegalPage } from "@/lib/site-content";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  const terms = useLegalPage("terms");
  return (
    <LegalPage
      eyebrow={terms?.eyebrow ?? "Legal"}
      title={terms?.title ?? "Terms & Conditions"}
      updated={terms?.updated ?? "July 2026"}
      intro={terms?.intro ?? "Please read these terms carefully before using our website or placing an order."}
      sections={terms?.sections ?? []}
    />
  );
}