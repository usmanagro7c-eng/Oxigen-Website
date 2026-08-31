import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Briefcase, Plus, Check, Users, Store, Shield, Crown, ArrowRight } from "lucide-react";
import { Breadcrumb, Header, GlassCard } from "@/components/dashboard/glass-form";

export const Route = createFileRoute("/dashboard/workspace")({
  head: () => ({ meta: [{ title: "Workspace — OxiGen Admin" }] }),
  component: WorkspacePage,
});

const ORGS = [
  { name: "OxiGen Official", plan: "Enterprise", members: 24, active: true, color: "from-primary to-accent" },
  { name: "OxiGen Wellness PK", plan: "Growth", members: 8, active: false, color: "from-cyan-500 to-emerald-500" },
  { name: "OxiGen Global", plan: "Starter", members: 3, active: false, color: "from-purple-500 to-pink-500" },
];

const STORES = [
  { name: "OxiGen Storefront PK", url: "oxigen.pk", orders: 2148, status: "Live" },
  { name: "OxiGen Wholesale", url: "wholesale.oxigen.pk", orders: 964, status: "Live" },
  { name: "OxiGen UAE", url: "oxigen.ae", orders: 322, status: "Draft" },
];

const PERMISSIONS = [
  { role: "Owner", desc: "Full access, billing, danger zone", count: 1 },
  { role: "Admin", desc: "Manage team, products, orders", count: 4 },
  { role: "Editor", desc: "Edit content, run campaigns", count: 12 },
  { role: "Viewer", desc: "Read-only across workspace", count: 7 },
];

function WorkspacePage() {
  return (
    <div className="space-y-6">
      <Breadcrumb label="Workspace" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header icon={Briefcase} title="Workspace" subtitle="Organizations, stores, and access control." />
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
          <Plus className="h-4 w-4" /> New workspace
        </motion.button>
      </div>

      <GlassCard title="Organizations" desc="Switch between workspaces you belong to">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ORGS.map((o, i) => (
            <motion.button
              key={o.name}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className={`relative overflow-hidden text-left rounded-2xl glass border p-4 transition ${
                o.active ? "border-primary/40 shadow-glow" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${o.color}`} />
              <div className="relative flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${o.color} text-white font-semibold`}>
                  {o.name.slice(0,2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{o.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Crown className="h-3 w-3" /> {o.plan} · {o.members} members
                  </div>
                </div>
                {o.active && <Check className="h-4 w-4 text-primary" />}
              </div>
            </motion.button>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Stores" desc="All storefronts in this organization">
        <div className="divide-y divide-white/[0.06] -mx-2">
          {STORES.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition mx-2"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-gradient/20">
                <Store className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">{s.url} · {s.orders.toLocaleString()} orders</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === "Live" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                {s.status}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Permissions" desc="Roles across this workspace">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PERMISSIONS.map(p => (
            <div key={p.role} className="rounded-2xl glass border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-[11px] text-muted-foreground">{p.count} members</span>
              </div>
              <div className="mt-3 text-sm font-medium">{p.role}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">{p.desc}</div>
            </div>
          ))}
        </div>
        <button className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl glass hover:bg-white/10 text-xs transition">
          <Users className="h-3.5 w-3.5" /> Manage members
        </button>
      </GlassCard>
    </div>
  );
}
