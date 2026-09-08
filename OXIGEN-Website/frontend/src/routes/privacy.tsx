import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { useLegalPage } from "@/lib/site-content";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const privacy = useLegalPage("privacy");
  return (
    <LegalPage
      eyebrow={privacy?.eyebrow ?? "Legal"}
      title={privacy?.title ?? "Privacy Policy"}
      updated={privacy?.updated ?? "July 2026"}
      intro={privacy?.intro ?? "Your privacy matters to us. This policy explains what we collect and how we use it."}
      sections={privacy?.sections ?? []}
    />
  );
}