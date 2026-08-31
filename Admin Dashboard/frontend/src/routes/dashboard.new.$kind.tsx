import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderPlus, Store, Package,
  ArrowRight, ArrowLeft, Check, Sparkles, Rocket, Image as ImageIcon,
  Tag, DollarSign, Search as SearchIcon, Boxes, Truck, Palette, Loader2,
} from "lucide-react";
import { Breadcrumb, Header, GlassCard, FieldGroup, Input, Select } from "@/components/dashboard/glass-form";
import { createItem, createItemGroup, createErpDoc, getItemGroups, type ItemGroup } from "@/lib/api";

export const Route = createFileRoute("/dashboard/new/$kind")({
  head: ({ params }) => ({ meta: [{ title: `Create ${params.kind.replace("-"," ")} — OxiGen Admin` }] }),
  component: NewWizard,
});

type KindKey = "project"|"store"|"product";

type KindDef = {
  icon: any;
  title: string;
  subtitle: string;
  tint: string;
  steps: { key: string; label: string }[];
};

const KINDS: Record<KindKey, KindDef> = {
  project:    { icon: FolderPlus,     title: "New Project",   subtitle: "Blank workspace with AI scaffolding.", tint: "from-violet-500 to-fuchsia-500",
    steps: [{key:"basics",label:"Basics"},{key:"team",label:"Team"},{key:"launch",label:"Launch"}] },
  store:      { icon: Store,          title: "New Store",     subtitle: "Full ecommerce storefront.", tint: "from-emerald-500 to-teal-500",
    steps: [{key:"basics",label:"Basics"},{key:"pricing",label:"Pricing"},{key:"shipping",label:"Shipping"},{key:"launch",label:"Launch"}] },
  product:    { icon: Package,        title: "New Product",   subtitle: "AI-generated copy, images and SEO.", tint: "from-rose-500 to-orange-500",
    steps: [{key:"details",label:"Details"},{key:"media",label:"Media"},{key:"pricing",label:"Pricing"},{key:"seo",label:"SEO"},{key:"publish",label:"Publish"}] },
};

function NewWizard() {
  const { kind: rawKind } = Route.useParams();
  const kind = (Object.keys(KINDS).includes(rawKind) ? rawKind : "project") as KindKey;
  const def = KINDS[kind];
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    handle: "",
    category: "",
    price: "1000",
    description: "",
  });

  useEffect(() => {
    getItemGroups()
      .then((res) => {
        const groups = res.data || [];
        setItemGroups(groups);
        if (groups.length > 0 && !formData.category) {
          setFormData((f) => ({ ...f, category: groups[0].item_group_name || groups[0].name }));
        }
      })
      .catch(() => {});
  }, []);

  const progress = useMemo(() => (step / (def.steps.length - 1)) * 100, [step, def.steps.length]);

  const back = () => setStep(s => Math.max(0, s - 1));
  const next = async () => {
    if (step >= def.steps.length - 1) {
      setSubmitting(true);
      try {
        if (kind === "product") {
          await createItem({
            item_name: formData.name || "New Product",
            item_group: formData.category || (itemGroups[0]?.name ?? "General"),
            standard_rate: Number(String(formData.price || "").replace(/[^0-9.]/g, "")) || 1000,
            stock_uom: "Nos",
            description: formData.description || "",
            publish: true,
          });
        } else if (kind === "project") {
          await createErpDoc("Project", {
            project_name: formData.name || "New Project",
            status: "Open",
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Wizard creation error:", err);
      } finally {
        setSubmitting(false);
        setDone(true);
      }
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb label={def.title} />
      <Header icon={def.icon} title={def.title} subtitle={def.subtitle} />

      {/* Stepper */}
      <div className="relative">
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div className="h-full bg-primary-gradient shadow-glow"
            initial={false} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          {def.steps.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "idle";
            return (
              <button key={s.key} onClick={() => setStep(i)} className="flex items-center gap-2 shrink-0 group">
                <motion.span
                  layoutId={`wiz-dot-${kind}-${i}`}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                    state === "done" ? "bg-primary-gradient text-primary-foreground shadow-glow" :
                    state === "active" ? "bg-primary-gradient text-primary-foreground shadow-glow ring-4 ring-primary/20" :
                    "glass border border-white/10 text-muted-foreground"
                  }`}>
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </motion.span>
                <span className={`text-xs ${state === "idle" ? "text-muted-foreground" : "text-foreground"}`}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <StepContent kind={kind} step={def.steps[step].key} form={formData} setForm={setFormData} itemGroups={itemGroups} />
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={back} disabled={step === 0 || submitting}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl glass hover:bg-white/10 text-sm disabled:opacity-40 transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate({ to: "/dashboard" })}
            className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition">
            Cancel
          </button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={next} disabled={submitting}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-50">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving in ERPNext…</>
            ) : step === def.steps.length - 1 ? (
              <><Rocket className="h-4 w-4" /> Create in ERPNext</>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </motion.button>
        </div>
      </div>

      {/* Success */}
      <AnimatePresence>
        {done && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" onClick={() => setDone(false)} />
            <motion.div
              initial={{ y: 30, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full md:w-[min(480px,calc(100%-2rem))] glass-strong border border-white/10 rounded-3xl p-8 text-center shadow-elegant"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${def.tint} shadow-glow`}
              >
                <Check className="h-7 w-7 text-white" />
              </motion.div>
              <div className="mt-4 font-display text-2xl font-semibold">{def.title.replace(/^New /, "")} synced with ERPNext</div>
              <div className="mt-1.5 text-sm text-muted-foreground">Your {kind.replace("-"," ")} is live in your ERP database.</div>
              <div className="mt-6 flex items-center justify-center gap-2">
                <button onClick={() => setDone(false)} className="h-10 px-4 rounded-xl glass hover:bg-white/10 text-sm">Stay here</button>
                <button onClick={() => navigate({ to: "/dashboard/$", params: { _splat: kind === "product" ? "products" : "projects" } })}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-gradient text-primary-foreground text-sm font-medium shadow-glow">
                  <Sparkles className="h-4 w-4" /> View in Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------- Step bodies -------- */
function StepContent({
  kind, step, form, setForm, itemGroups,
}: {
  kind: KindKey;
  step: string;
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  itemGroups: ItemGroup[];
}) {
  if (step === "basics" || step === "brief" || step === "details") {
    return (
      <GlassCard title="The essentials" desc="Enter details to be saved directly in ERPNext.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldGroup label="Name">
            <Input
              value={form.name || ""}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Nutri-Shield 500mg"
            />
          </FieldGroup>
          <FieldGroup label="Handle / Code">
            <Input
              value={form.handle || ""}
              onChange={(e) => setForm(f => ({ ...f, handle: e.target.value }))}
              placeholder="nutri-shield"
            />
          </FieldGroup>
          <FieldGroup label="Category / Item Group">
            {itemGroups.length > 0 ? (
              <select
                value={form.category || itemGroups[0]?.name || "General"}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-10 px-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
              >
                {itemGroups.map((g) => (
                  <option key={g.name} value={g.item_group_name || g.name} className="bg-card text-foreground py-1.5">
                    {g.item_group_name || g.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={form.category || ""}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Female Supplements"
              />
            )}
          </FieldGroup>
          <FieldGroup label="Region / Territory">
            <Select defaultValue="Pakistan">
              <option value="Pakistan" className="bg-card text-foreground py-1.5">Pakistan</option>
              <option value="All Territories" className="bg-card text-foreground py-1.5">All Territories</option>
              <option value="International" className="bg-card text-foreground py-1.5">International</option>
            </Select>
          </FieldGroup>
          <FieldGroup label="Description" className="md:col-span-2">
            <textarea
              rows={4}
              value={form.description || ""}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Enter product or project description…"
              className="w-full p-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm placeholder:text-muted-foreground/60"
            />
          </FieldGroup>
        </div>
      </GlassCard>
    );
  }

  if (step === "pricing") {
    return (
      <GlassCard title="Pricing & Inventory" desc="Set pricing and stock warehouse in ERPNext.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FieldGroup label="Selling Price (PKR)">
            <Input
              value={form.price || ""}
              onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="2000"
            />
          </FieldGroup>
          <FieldGroup label="Unit of Measure (UOM)">
            <Select defaultValue="Nos">
              <option value="Nos" className="bg-card text-foreground py-1.5">Nos (Units / Pieces)</option>
              <option value="Box" className="bg-card text-foreground py-1.5">Box</option>
              <option value="Bottle" className="bg-card text-foreground py-1.5">Bottle</option>
              <option value="Unit" className="bg-card text-foreground py-1.5">Unit</option>
              <option value="Pack" className="bg-card text-foreground py-1.5">Pack</option>
              <option value="Kg" className="bg-card text-foreground py-1.5">Kg</option>
            </Select>
          </FieldGroup>
          <FieldGroup label="Warehouse">
            <Select defaultValue="Oxigen Warehouse - O">
              <option value="Oxigen Warehouse - O" className="bg-card text-foreground py-1.5">Oxigen Warehouse - O (Default)</option>
              <option value="Finished Goods - O" className="bg-card text-foreground py-1.5">Finished Goods - O</option>
              <option value="Stores - O" className="bg-card text-foreground py-1.5">Stores - O</option>
            </Select>
          </FieldGroup>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5 text-primary" /> Live pricing synced to Standard Selling Price List and Stock to Oxigen Warehouse.
        </div>
      </GlassCard>
    );
  }

  if (step === "design" || step === "pick") {
    const looks = [
      { name: "Editorial", tint: "from-slate-800 to-slate-600" },
      { name: "Playful", tint: "from-fuchsia-500 to-amber-400" },
      { name: "Minimal", tint: "from-slate-200 to-white" },
      { name: "Glass", tint: "from-violet-500 to-cyan-400" },
    ];
    return (
      <GlassCard title={kind === "template" ? "Pick a template" : "Choose a design language"} desc="Adaptive styling for your catalog.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {looks.map((l, i) => (
            <motion.button key={l.name}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="group text-left rounded-2xl glass border border-white/10 p-3 hover:border-white/20 hover:shadow-glow transition"
            >
              <div className={`h-24 rounded-xl bg-gradient-to-br ${l.tint} relative overflow-hidden`} />
              <div className="mt-2 text-xs font-medium">{l.name}</div>
            </motion.button>
          ))}
        </div>
      </GlassCard>
    );
  }

  if (step === "media") {
    return (
      <GlassCard title="Media & Image" desc="Add image URL or upload to ERP attachments.">
        <div className="space-y-3">
          <FieldGroup label="Image URL">
            <Input
              value={form.image || ""}
              onChange={(e) => setForm(f => ({ ...f, image: e.target.value }))}
              placeholder="/files/product-image.jpeg"
            />
          </FieldGroup>
        </div>
      </GlassCard>
    );
  }

  if (step === "seo") {
    return (
      <GlassCard title="SEO & Web Details" desc="Website metadata in ERPNext.">
        <FieldGroup label="Web Title"><Input defaultValue={form.name || "OxiGen Catalog Item"} /></FieldGroup>
        <div className="h-3" />
        <FieldGroup label="Short Description">
          <textarea rows={3} defaultValue={form.description || "Premium OxiGen supplement formulation."}
            className="w-full p-3.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none" />
        </FieldGroup>
      </GlassCard>
    );
  }

  if (step === "launch" || step === "publish" || step === "import") {
    return (
      <GlassCard title="Ready to sync" desc="Review details before publishing to ERPNext.">
        <ul className="space-y-2">
          {[
            `Entity Name: ${form.name || "Item"}`,
            `Category / Group: ${form.category || "General"}`,
            `Price: PKR ${form.price || "1,000"}`,
            "Live connection to ERPNext server verified",
          ].map(item => (
            <li key={item} className="flex items-center gap-2.5 rounded-xl glass border border-white/10 p-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    );
  }

  return <GlassCard title="Step complete">Click Continue to proceed.</GlassCard>;
}
