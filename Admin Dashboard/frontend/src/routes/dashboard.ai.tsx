import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, Wand2, Globe, Package, Palette, Megaphone, MessageSquare,
  Plus, History, Star, Bot, ArrowUpRight, Command, Paperclip, Mic,
} from "lucide-react";
import { Breadcrumb, Header, GlassCard } from "@/components/dashboard/glass-form";

export const Route = createFileRoute("/dashboard/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — OxiGen Admin" }] }),
  component: AIAssistant,
});

const QUICK = [
  { icon: Globe, label: "Generate Website", prompt: "Design a landing page for my new brand." },
  { icon: Package, label: "Generate Product", prompt: "Create a product listing with copy and pricing." },
  { icon: Palette, label: "Generate Theme", prompt: "Build a clean, light health & wellness theme with royal & cyan accents." },
  { icon: Megaphone, label: "Generate Marketing", prompt: "Write a launch email for our newest vitamin drop." },
];

const TEMPLATES = [
  "Summarize last week's revenue and outliers",
  "Draft SEO meta for my top 10 products",
  "Write a 3-email welcome series",
  "Suggest 5 bundles from my catalogue",
  "Turn this brief into a hero section",
  "Localize my checkout for Pakistan & UAE",
];

const HISTORY = [
  { title: "Launch email — Vitamin D3 Drops", when: "2h ago" },
  { title: "SEO refresh — Multivitamins collection", when: "Yesterday" },
  { title: "Homepage rewrite", when: "3 days ago" },
  { title: "Bundle ideas for Q4", when: "Last week" },
];

type Msg = { role: "user" | "ai"; text: string };

function AIAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi Admin — I'm your OxiGen AI. Ask me to generate product descriptions, analyze sales, or optimize your store." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, typing]);

  const send = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t) return;
    setMsgs(m => [...m, { role: "user", text: t }]);
    setInput(""); setTyping(true);
    setTimeout(() => {
      setMsgs(m => [...m, { role: "ai", text: "Here's a draft — I've optimized for tone, brand voice, and conversion. Want me to refine, translate, or publish to ERPNext?" }]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="AI Assistant" />
      <Header icon={Sparkles} title="AI Assistant" subtitle="Generate, analyze, and optimize your OxiGen catalog." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Chat */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-secondary/30">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-accent shadow-sm">
              <Bot className="h-3.5 w-3.5 text-white" />
            </span>
            <div className="text-sm font-bold text-foreground">OxiGen AI</div>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
            </span>
            <button className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-secondary transition">
              <Plus className="h-3.5 w-3.5" /> New chat
            </button>
          </div>

          <div ref={scrollRef} className="h-[440px] overflow-y-auto p-4 md:p-6 space-y-3 scrollbar-none">
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary-gradient text-primary-foreground shadow-glow"
                      : "glass border border-white/10"
                  }`}>{m.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 pl-1">
                {[0,1,2].map(i => (
                  <motion.span key={i}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-4 pt-2 pb-3 flex flex-wrap gap-2 border-t border-white/[0.06]">
            {QUICK.map(q => (
              <motion.button
                key={q.label}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => send(q.prompt)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg glass border border-white/10 text-xs hover:border-white/20 hover:shadow-glow transition"
              >
                <q.icon className="h-3.5 w-3.5 text-primary" /> {q.label}
              </motion.button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex items-end gap-2 rounded-2xl glass border border-white/10 p-2 focus-within:border-primary/40 focus-within:shadow-glow transition">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5" aria-label="Attach">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Ask AI to generate, edit, translate, analyze…"
                className="flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/60 max-h-40"
              />
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5" aria-label="Voice">
                <Mic className="h-4 w-4 text-muted-foreground" />
              </button>
              <motion.button
                whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                onClick={() => send()}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </motion.button>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground px-2">
              <Command className="h-3 w-3" /> Enter to send · Shift+Enter for newline
            </div>
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-4">
          <GlassCard title="Recent history" desc="Pick up where you left off">
            <ul className="space-y-1">
              {HISTORY.map((h, i) => (
                <motion.li
                  key={h.title}
                  initial={{ opacity: 0, x: 6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <button className="group w-full flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/5 transition text-left">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg glass shrink-0">
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{h.title}</div>
                      <div className="text-[11px] text-muted-foreground">{h.when}</div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard title="Templates" desc="Curated prompts to start fast">
            <div className="grid gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t}
                  onClick={() => send(t)}
                  className="group flex items-start gap-2.5 rounded-xl glass border border-white/10 p-2.5 text-left hover:border-white/20 hover:shadow-glow transition"
                >
                  <Wand2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-[12.5px] leading-snug">{t}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Suggestions" desc="Based on your workspace">
            <div className="space-y-2">
              {["Rewrite low-CTR product titles", "A/B test hero copy", "Auto-tag 42 new photos"].map(s => (
                <div key={s} className="flex items-center gap-2 rounded-lg p-2 hover:bg-white/5 transition">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[12.5px]">{s}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
