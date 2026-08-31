import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Send, Search, Users, Megaphone, MessageCircle, Star, PenLine } from "lucide-react";
import { Breadcrumb, Header, GlassCard } from "@/components/dashboard/glass-form";

export const Route = createFileRoute("/dashboard/inbox")({
  head: () => ({ meta: [{ title: "Inbox — OxiGen Admin" }] }),
  component: InboxPage,
});

type Tab = "customers" | "internal" | "announcements";

const THREADS: Record<Tab, { id: string; from: string; subject: string; snippet: string; when: string; unread?: boolean; starred?: boolean; }[]> = {
  customers: [
    { id: "c1", from: "Fatima Ali", subject: "Order #OG-2914 — Vitamin C Gummy inquiry", snippet: "Hi team, when will the Vitamin C gummies be restocked?", when: "12m", unread: true },
    { id: "c2", from: "Hamza Khan", subject: "Question about dosage", snippet: "What is the recommended dosage for the Multivitamin drops?", when: "1h" },
    { id: "c3", from: "Ayesha Malik", subject: "Loved the OxiGen packaging!", snippet: "The bottle quality and fast shipping is amazing 🔥", when: "3h", starred: true },
    { id: "c4", from: "Zubair Ahmed", subject: "Wholesale pharmacy inquiry", snippet: "We are a pharmacy chain in Islamabad looking to distribute…", when: "Yesterday" },
  ],
  internal: [
    { id: "i1", from: "Warehouse Team", subject: "Warehouse batch expiry check", snippet: "Sending the updated stock report for Nov / Dec.", when: "8m", unread: true },
    { id: "i2", from: "Marketing Team", subject: "Winter Health Campaign launch", snippet: "Pushed the banner assets and discount vouchers.", when: "2h" },
  ],
  announcements: [
    { id: "a1", from: "OxiGen Team", subject: "Live ERP synchronization updated", snippet: "Real-time Frappe inventory and customer tracking is active.", when: "1d" },
    { id: "a2", from: "Store Operations", subject: "Same-day dispatch enabled", snippet: "Orders before 3PM dispatched same day.", when: "3d" },
  ],
};

const TAB_META: { key: Tab; label: string; icon: any; count: number }[] = [
  { key: "customers", label: "Customer", icon: Users, count: 4 },
  { key: "internal", label: "Internal", icon: MessageCircle, count: 2 },
  { key: "announcements", label: "Announcements", icon: Megaphone, count: 2 },
];

function InboxPage() {
  const [tab, setTab] = useState<Tab>("customers");
  const [active, setActive] = useState<string>("c1");
  const [compose, setCompose] = useState(false);

  const thread = THREADS[tab].find(t => t.id === active) ?? THREADS[tab][0];

  return (
    <div className="space-y-6">
      <Breadcrumb label="Inbox" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header icon={Mail} title="Inbox" subtitle="Customer messages, internal comms and announcements." />
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setCompose(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
          <PenLine className="h-4 w-4" /> Compose
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TAB_META.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setActive(THREADS[t.key][0].id); }}
            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm transition ${
              tab === t.key ? "bg-primary-gradient text-primary-foreground shadow-glow" : "glass border border-white/10 hover:bg-white/10"
            }`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] px-1.5 ${
              tab === t.key ? "bg-white/20" : "bg-white/10"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-3 border-b border-white/[0.06] relative">
            <Search className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search messages…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm outline-none focus:border-primary/40 focus:shadow-glow transition" />
          </div>
          <ul className="max-h-[560px] overflow-y-auto scrollbar-none">
            {THREADS[tab].map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button onClick={() => setActive(t.id)}
                  className={`w-full text-left p-3.5 border-b border-white/[0.04] transition ${
                    active === t.id ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gradient text-primary-foreground text-[11px] font-semibold">
                      {t.from.split(" ").map(w => w[0]).slice(0,2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${t.unread ? "font-semibold" : ""}`}>{t.from}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{t.when}</span>
                      </div>
                      <div className={`text-[12px] truncate ${t.unread ? "text-foreground" : "text-muted-foreground"}`}>{t.subject}</div>
                    </div>
                    {t.unread && <span className="h-2 w-2 rounded-full bg-primary shadow-glow shrink-0" />}
                    {t.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground line-clamp-1 pl-10">{t.snippet}</div>
                </button>
              </motion.li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col h-full"
            >
              <div className="p-5 border-b border-white/[0.06]">
                <div className="text-xs text-muted-foreground">{thread.from}</div>
                <div className="mt-1 font-display text-lg font-semibold">{thread.subject}</div>
              </div>
              <div className="p-5 space-y-4 flex-1 min-h-[280px]">
                <div className="rounded-2xl glass border border-white/10 p-4 text-sm leading-relaxed">
                  {thread.snippet} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur volutpat porta libero.
                </div>
                <div className="rounded-2xl bg-primary-gradient/10 border border-primary/20 p-4 text-sm leading-relaxed">
                  Thanks for reaching out — I've triaged this to our support squad and you'll hear back within the hour.
                </div>
              </div>
              <div className="p-3 border-t border-white/[0.06]">
                <div className="flex items-end gap-2 rounded-2xl glass border border-white/10 p-2 focus-within:border-primary/40 focus-within:shadow-glow transition">
                  <textarea rows={1} placeholder="Reply…" className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 max-h-40" />
                  <motion.button whileTap={{ scale: 0.96 }} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
                    <Send className="h-3.5 w-3.5" /> Reply
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>

      <AnimatePresence>
        {compose && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" onClick={() => setCompose(false)} />
            <motion.div
              initial={{ y: 30, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full md:w-[min(640px,calc(100%-2rem))] glass-strong border border-white/10 rounded-3xl p-6 shadow-elegant"
            >
              <div className="font-display text-xl font-semibold">New message</div>
              <div className="mt-4 space-y-3">
                <input placeholder="To" className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-primary/40 transition" />
                <input placeholder="Subject" className="w-full h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-primary/40 transition" />
                <textarea rows={6} placeholder="Write your message…" className="w-full p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm outline-none focus:border-primary/40 transition resize-none" />
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={() => setCompose(false)} className="h-9 px-4 rounded-xl glass hover:bg-white/10 text-sm">Cancel</button>
                <button onClick={() => setCompose(false)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
