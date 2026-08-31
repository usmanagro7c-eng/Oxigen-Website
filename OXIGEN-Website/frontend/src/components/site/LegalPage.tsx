import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Reveal } from "@/components/site/Reveal";

export type LegalSection = { heading: string; body: string[] };

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <SiteLayout>
      <PageHeader eyebrow={eyebrow} title={title} sub={intro} />
      <section className="px-4 pb-24 sm:px-5">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="mb-8 text-sm text-muted-foreground">Last updated: {updated}</p>
          </Reveal>
          <div className="space-y-8">
            {sections.map((s, i) => (
              <Reveal key={s.heading} delay={i * 0.04}>
                <article className="rounded-2xl glass p-6 sm:p-8">
                  <h2 className="font-display text-xl font-bold text-ink">{s.heading}</h2>
                  <div className="mt-3 space-y-3">
                    {s.body.map((p, j) => (
                      <p key={j} className="text-sm leading-relaxed text-muted-foreground">
                        {p}
                      </p>
                    ))}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 text-center text-xs text-muted-foreground">
              This page is maintained by OxiGen. Questions? Reach us on WhatsApp or via the{" "}
              <a href="/contact" className="font-semibold text-primary hover:underline">
                Contact
              </a>{" "}
              page.
            </p>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
}
