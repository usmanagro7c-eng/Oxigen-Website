import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MessageCircle, HelpCircle, ChevronDown } from "lucide-react";
import { DashCard, SectionHeader, StatusBadge } from "@/components/dashboard/DashboardShell";
import { mockTickets, mockFaqs } from "@/lib/dashboard-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/support")({
  head: () => ({ meta: [{ title: "Support — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: SupportPage,
});

function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <DashCard className="lg:col-span-2">
        <SectionHeader
          title="Create a Ticket"
          action={
            <button
              onClick={() => toast("Chat support opens here")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-inset ring-border hover:bg-white"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Live Chat
            </button>
          }
        />
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Ticket submitted");
            (e.currentTarget as HTMLFormElement).reset();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Subject</span>
            <input required className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm outline-none ring-1 ring-inset ring-border focus:ring-primary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Category</span>
            <select className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm outline-none ring-1 ring-inset ring-border focus:ring-primary">
              <option>Order Issue</option>
              <option>Refund Request</option>
              <option>Product Question</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Message</span>
            <textarea required rows={5} className="w-full rounded-xl bg-white/70 px-3 py-2 text-sm outline-none ring-1 ring-inset ring-border focus:ring-primary" />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25"
          >
            <Plus className="h-4 w-4" /> Submit Ticket
          </button>
        </form>
      </DashCard>

      <DashCard>
        <SectionHeader title="Ticket History" />
        {mockTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't opened any tickets.</p>
        ) : (
          <ul className="space-y-3">
            {mockTickets.map((t) => (
              <li key={t.id} className="rounded-xl bg-white/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink">{t.id}</p>
                  <StatusBadge
                    status={t.status}
                    tone={t.status === "Resolved" ? "success" : t.status === "Pending" ? "warning" : "info"}
                  />
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-ink">{t.subject}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Updated {t.updated}</p>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      <DashCard className="lg:col-span-3">
        <SectionHeader title="Frequently Asked Questions" />
        <div className="space-y-2">
          {mockFaqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="overflow-hidden rounded-xl bg-white/60">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-sm font-semibold text-ink">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && <p className="px-4 pb-4 pl-11 text-sm text-muted-foreground">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </DashCard>
    </div>
  );
}
