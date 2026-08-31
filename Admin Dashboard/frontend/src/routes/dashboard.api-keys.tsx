import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Copy, Eye, EyeOff, Plus, Trash2, Check } from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Input, Select } from "@/components/dashboard/glass-form";

export const Route = createFileRoute("/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — OxiGen Admin" }] }),
  component: ApiKeysPage,
});

type Key = { id: string; name: string; scope: "read"|"write"|"admin"; created: string; last: string; token: string };

const INITIAL: Key[] = [
  { id: "k1", name: "Production server", scope: "admin", created: "Jun 12, 2026", last: "2m ago", token: "oxigen_api_live_1a2b3c4d5e6f7g8h9i0jklmnopqrstuv" },
  { id: "k2", name: "Analytics pipeline", scope: "read", created: "Sep 03, 2026", last: "1h ago", token: "oxigen_api_readonly_9z8y7x6w5v4u3t2s1r0q" },
  { id: "k3", name: "Mobile app", scope: "write", created: "Oct 22, 2026", last: "Yesterday", token: "oxigen_api_mobile_qwer1234tyui5678asdf" },
];

function ApiKeysPage() {
  const [keys, setKeys] = useState<Key[]>(INITIAL);
  const [creating, setCreating] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, token: string) => {
    try { await navigator.clipboard.writeText(token); } catch {}
    setCopied(id); setTimeout(() => setCopied(null), 1200);
  };

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "New key");
    const scope = (String(fd.get("scope") || "read") as Key["scope"]);
    const id = "k" + (keys.length + 1);
    setKeys(k => [{ id, name, scope, created: "Just now", last: "—", token: "oxigen_api_" + Math.random().toString(36).slice(2, 26) }, ...k]);
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label="API Keys" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header icon={KeyRound} title="API Keys" subtitle="Create and rotate keys for server, mobile and integrations." />
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
          <Plus className="h-4 w-4" /> New key
        </motion.button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.4fr_.7fr_.9fr_.9fr_1.6fr_auto] items-center gap-3 px-5 py-3 border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted-foreground">
          <div>Name</div><div>Scope</div><div>Created</div><div>Last used</div><div>Token</div><div />
        </div>
        <ul>
          <AnimatePresence initial={false}>
            {keys.map((k, i) => (
              <motion.li
                key={k.id} layout
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-1 md:grid-cols-[1.4fr_.7fr_.9fr_.9fr_1.6fr_auto] items-center gap-3 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition"
              >
                <div className="text-sm font-medium">{k.name}</div>
                <div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    k.scope === "admin" ? "bg-rose-400/10 text-rose-300" :
                    k.scope === "write" ? "bg-amber-400/10 text-amber-300" :
                    "bg-emerald-400/10 text-emerald-300"
                  }`}>{k.scope}</span>
                </div>
                <div className="text-xs text-muted-foreground">{k.created}</div>
                <div className="text-xs text-muted-foreground">{k.last}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-[12px] px-2 py-1 rounded-md glass border border-white/10 truncate">
                    {reveal[k.id] ? k.token : k.token.slice(0, 12) + "•".repeat(14)}
                  </code>
                  <button onClick={() => setReveal(r => ({ ...r, [k.id]: !r[k.id] }))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5" aria-label="Reveal">
                    {reveal[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => copy(k.id, k.token)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5" aria-label="Copy">
                    {copied === k.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button onClick={() => setKeys(ks => ks.filter(x => x.id !== k.id))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 text-destructive" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </GlassCard>

      <AnimatePresence>
        {creating && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" onClick={() => setCreating(false)} />
            <motion.form
              onSubmit={add}
              initial={{ y: 30, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full md:w-[min(520px,calc(100%-2rem))] glass-strong border border-white/10 rounded-3xl p-6 shadow-elegant"
            >
              <div className="font-display text-xl font-semibold">Create API key</div>
              <div className="text-sm text-muted-foreground mt-1">Give it a memorable name and least-privilege scope.</div>
              <div className="mt-5 grid gap-3">
                <FieldGroup label="Name"><Input name="name" placeholder="e.g. Production server" required /></FieldGroup>
                <FieldGroup label="Scope">
                  <Select name="scope" defaultValue="read">
                    <option value="read">Read — safe for analytics</option>
                    <option value="write">Write — create & update</option>
                    <option value="admin">Admin — full access</option>
                  </Select>
                </FieldGroup>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setCreating(false)} className="h-9 px-4 rounded-xl glass hover:bg-white/10 text-sm">Cancel</button>
                <button type="submit" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
                  Create key
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
