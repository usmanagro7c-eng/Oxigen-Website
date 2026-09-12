import type { Section } from "@/lib/site-store";
import type { SectionType } from "@/lib/template-kits";
import { cn } from "@/lib/utils";

type Ctx = {
  accent: string;
  fontDisplay: string;
  fontBody: string;
  mode: "dark" | "light";
  radius: number;
};

function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6 md:px-10", className)}>{children}</div>;
}
function Eyebrow({ children, ctx }: { children: React.ReactNode; ctx: Ctx }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.22em] font-semibold" style={{ color: ctx.accent }}>
      {children}
    </div>
  );
}
function H({ children, ctx, className }: { children: React.ReactNode; ctx: Ctx; className?: string }) {
  return <h2 className={cn("text-4xl md:text-5xl font-semibold tracking-tight", className)} style={{ fontFamily: ctx.fontDisplay }}>{children}</h2>;
}
function Sub({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-base md:text-lg text-muted-foreground max-w-2xl", className)}>{children}</p>;
}
function Btn({ children, ctx, ghost }: { children: React.ReactNode; ctx: Ctx; ghost?: boolean }) {
  return (
    <button className={cn("h-11 px-5 rounded-full text-sm font-medium transition", ghost ? "border border-white/15 text-foreground hover:bg-white/10" : "text-black")}
      style={ghost ? undefined : { background: ctx.accent }}>
      {children}
    </button>
  );
}

/* ---------- HEROES ---------- */

function HeroSimple({ s, ctx }: { s: Section; ctx: Ctx }) {
  const p = s.props ?? {};
  return (
    <section className="py-24 md:py-32 border-b border-white/[0.06]">
      <Container className="text-center">
        <Eyebrow ctx={ctx}>{p.eyebrow ?? "Section"}</Eyebrow>
        <H ctx={ctx} className="mt-3 mx-auto max-w-3xl">{p.title ?? "Page title"}</H>
        <Sub className="mt-4 mx-auto">{p.body ?? "A short description."}</Sub>
      </Container>
    </section>
  );
}

function HeroFashion({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="grid md:grid-cols-2 min-h-[85vh]">
        <div className="relative p-10 md:p-16 flex flex-col justify-end">
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(600px 400px at 20% 30%, ${ctx.accent}22, transparent)` }} />
          <div className="relative">
            <Eyebrow ctx={ctx}>Drop 07 · Live now</Eyebrow>
            <h1 className="mt-3 text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]" style={{ fontFamily: ctx.fontDisplay }}>
              MOVE<br/>DIFFERENT
            </h1>
            <p className="mt-6 max-w-md text-muted-foreground">Technical outerwear built for the city at night. Limited to 300 pieces.</p>
            <div className="mt-8 flex gap-3">
              <Btn ctx={ctx}>Shop the drop</Btn>
              <Btn ctx={ctx} ghost>Watch film</Btn>
            </div>
          </div>
        </div>
        <div className="relative bg-black">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${ctx.accent}30, transparent 60%), url('https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&auto=format&fit=crop') center/cover` }} />
          <div className="absolute bottom-6 right-6 text-[10px] uppercase tracking-widest text-white/70">SS26 · Look 04</div>
        </div>
      </div>
    </section>
  );
}

function HeroLuxury({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-28 md:py-40 border-b border-white/[0.06]">
      <Container className="text-center">
        <Eyebrow ctx={ctx}>Maison · Est. 1902</Eyebrow>
        <h1 className="mt-6 text-5xl md:text-7xl font-serif italic leading-tight" style={{ fontFamily: `${ctx.fontDisplay}, serif` }}>
          Objects made<br/>to be inherited.
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-muted-foreground italic">Bespoke leather goods, cut and stitched by hand in our Florentine atelier.</p>
        <div className="mt-10 inline-flex gap-3"><Btn ctx={ctx}>Discover collection</Btn><Btn ctx={ctx} ghost>Book atelier visit</Btn></div>
      </Container>
    </section>
  );
}

function HeroElectronics({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="relative py-24 md:py-32 border-b border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ background: `conic-gradient(from 220deg at 70% 40%, ${ctx.accent}, transparent 60%)` }} />
      <Container className="relative grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] rounded-full border border-white/15 px-3 py-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: ctx.accent }}/> New · Pulse Pro X</div>
          <h1 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: ctx.fontDisplay }}>Engineered to disappear.</h1>
          <p className="mt-5 max-w-lg text-muted-foreground">Titanium chassis. 42-hour battery. Studio-grade drivers. Available in three finishes.</p>
          <div className="mt-8 flex gap-3"><Btn ctx={ctx}>Buy — $329</Btn><Btn ctx={ctx} ghost>Compare models</Btn></div>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-md text-sm">
            {[["42h","Battery"],["<9ms","Latency"],["IP67","Rated"]].map(([n,l])=>(
              <div key={l}><div className="text-2xl font-semibold" style={{ color: ctx.accent }}>{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="relative aspect-square rounded-3xl border border-white/10 overflow-hidden">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 55%, ${ctx.accent}66, transparent 55%), #0a0a0a` }} />
          <div className="absolute inset-8 rounded-2xl border border-white/10 grid place-items-center">
            <div className="h-40 w-40 rounded-full border border-white/10 grid place-items-center" style={{ background: `radial-gradient(circle, ${ctx.accent}44, transparent 70%)` }}>
              <div className="h-20 w-20 rounded-full bg-black border border-white/20" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function HeroRestaurant({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="relative min-h-[85vh] grid place-items-center border-b border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&auto=format&fit=crop') center/cover` }} />
      <Container className="relative text-center py-20">
        <Eyebrow ctx={ctx}>Trattoria · Since 1972</Eyebrow>
        <h1 className="mt-4 text-6xl md:text-7xl italic" style={{ fontFamily: `${ctx.fontDisplay}, serif` }}>Sable & Smoke</h1>
        <p className="mt-4 max-w-lg mx-auto text-white/70">A wood-fired kitchen tucked into a converted grain mill. Six-course tasting menu nightly.</p>
        <div className="mt-8 inline-flex gap-3">
          <Btn ctx={ctx}>Reserve a table</Btn>
          <Btn ctx={ctx} ghost>View menu</Btn>
        </div>
        <div className="mt-10 flex justify-center gap-8 text-xs text-white/60">
          <div>★ ★ ★ Michelin</div><div>Open Tue–Sun</div><div>17:30 – 23:00</div>
        </div>
      </Container>
    </section>
  );
}

function HeroMedical({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-24 md:py-32 border-b border-white/[0.06]" style={{ background: `linear-gradient(180deg, ${ctx.accent}10, transparent)` }}>
      <Container className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <Eyebrow ctx={ctx}>Vitals · Family Health</Eyebrow>
          <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight" style={{ fontFamily: ctx.fontDisplay }}>Care that shows up.</h1>
          <p className="mt-5 text-muted-foreground max-w-md">Same-day appointments, transparent pricing, and a team that actually returns calls.</p>
          <div className="mt-6 flex gap-3"><Btn ctx={ctx}>Book appointment</Btn><Btn ctx={ctx} ghost>Meet the doctors</Btn></div>
          <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
            <div>✓ Accepts most insurance</div><div>✓ Telehealth available</div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 p-6 bg-white/[0.02]">
          <div className="text-sm font-medium">Quick appointment</div>
          <div className="mt-4 space-y-3">
            {["Specialty","Preferred date","Contact"].map((l) => (
              <div key={l}><div className="text-[11px] text-muted-foreground mb-1">{l}</div><div className="h-10 rounded-lg bg-white/5 border border-white/10" /></div>
            ))}
            <button className="w-full h-11 rounded-lg text-sm font-medium text-black" style={{ background: ctx.accent }}>Request appointment</button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function HeroCorporate({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-28 md:py-40 border-b border-white/[0.06]">
      <Container>
        <div className="max-w-3xl">
          <Eyebrow ctx={ctx}>Orbit · Platform</Eyebrow>
          <h1 className="mt-4 text-6xl md:text-7xl font-bold tracking-tighter leading-[1]" style={{ fontFamily: ctx.fontDisplay }}>
            The operating system for modern operations.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">Unify sales, finance, and ops in one platform. Deployed by 1,200+ teams.</p>
          <div className="mt-8 flex gap-3"><Btn ctx={ctx}>Start free trial</Btn><Btn ctx={ctx} ghost>Book a demo</Btn></div>
        </div>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
          {["ACME","Northwind","Contoso","Initech"].map((l)=><div key={l} className="text-xl font-semibold tracking-tight">{l}</div>)}
        </div>
      </Container>
    </section>
  );
}

function HeroPortfolio({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-28 md:py-40 border-b border-white/[0.06]">
      <Container>
        <Eyebrow ctx={ctx}>Independent designer</Eyebrow>
        <h1 className="mt-6 text-6xl md:text-8xl leading-[0.95]" style={{ fontFamily: ctx.fontDisplay }}>
          Quinn Vasquez.<br/><span className="italic text-muted-foreground">Brand · Motion · Web.</span>
        </h1>
        <div className="mt-10 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Currently @ Field Studio</span><span>·</span><span>Available Q3 2026</span><span>·</span><span>Brooklyn, NY</span>
        </div>
      </Container>
    </section>
  );
}

function HeroAgency({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="relative py-32 md:py-48 border-b border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(1000px 500px at 80% 20%, ${ctx.accent}44, transparent)` }} />
      <Container className="relative">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Kinetic · Independent studio</div>
        <h1 className="mt-6 text-7xl md:text-[9rem] font-black tracking-tighter leading-[0.85]" style={{ fontFamily: ctx.fontDisplay }}>
          We build<br/><span style={{ color: ctx.accent }}>momentum.</span>
        </h1>
        <p className="mt-8 text-lg text-muted-foreground max-w-xl">Brand systems, motion identities, and interactive stories for ambitious teams.</p>
      </Container>
    </section>
  );
}

function HeroBeauty({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-24 md:py-32 border-b border-white/[0.06]" style={{ background: `linear-gradient(180deg, ${ctx.accent}18, transparent)` }}>
      <Container className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <Eyebrow ctx={ctx}>Lumen · Skin</Eyebrow>
          <h1 className="mt-4 text-5xl md:text-6xl leading-tight" style={{ fontFamily: `${ctx.fontDisplay}, serif` }}>The five-step ritual for luminous skin.</h1>
          <p className="mt-5 text-muted-foreground">Clean formulas. Clinical results. Every ingredient disclosed.</p>
          <div className="mt-6 flex gap-3"><Btn ctx={ctx}>Shop the ritual</Btn><Btn ctx={ctx} ghost>Take the quiz</Btn></div>
        </div>
        <div className="aspect-[4/5] rounded-3xl" style={{ background: `linear-gradient(135deg, ${ctx.accent}55, #f5e6d0)` }} />
      </Container>
    </section>
  );
}

function HeroRealEstate({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="relative min-h-[80vh] grid place-items-end border-b border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop') center/cover` }} />
      <Container className="relative pb-16 pt-32">
        <Eyebrow ctx={ctx}>Brix · Homes</Eyebrow>
        <h1 className="mt-3 text-5xl md:text-7xl font-semibold tracking-tight max-w-3xl" style={{ fontFamily: ctx.fontDisplay }}>Find the address you've been picturing.</h1>
        <div className="mt-8 rounded-2xl border border-white/15 bg-black/60 backdrop-blur p-4 flex flex-wrap gap-3 max-w-3xl">
          {["Neighborhood","Bedrooms","Price","Type"].map((l)=><div key={l} className="flex-1 min-w-[140px]"><div className="text-[10px] uppercase tracking-widest text-white/60 mb-1">{l}</div><div className="h-10 rounded-lg bg-white/10 border border-white/10" /></div>)}
          <button className="h-10 px-6 rounded-lg text-sm font-medium text-black self-end" style={{ background: ctx.accent }}>Search</button>
        </div>
      </Container>
    </section>
  );
}

function HeroFurniture({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-16 md:py-24 border-b border-white/[0.06]">
      <Container className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-end">
        <div>
          <Eyebrow ctx={ctx}>Hearth · Autumn 26</Eyebrow>
          <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight" style={{ fontFamily: ctx.fontDisplay }}>Rooms that hold a life.</h1>
          <p className="mt-5 text-muted-foreground max-w-md">Sofas, tables, and beds — made by hand in North Carolina, delivered in weeks not months.</p>
          <div className="mt-6 flex gap-3"><Btn ctx={ctx}>Shop rooms</Btn><Btn ctx={ctx} ghost>Book a designer</Btn></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="aspect-[4/5] rounded-2xl" style={{ background: `linear-gradient(${120+i*60}deg, ${ctx.accent}44, #2a1f16)` }} />)}
        </div>
      </Container>
    </section>
  );
}

function HeroEducation({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-24 md:py-32 border-b border-white/[0.06]" style={{ background: `linear-gradient(135deg, ${ctx.accent}18, transparent)` }}>
      <Container>
        <Eyebrow ctx={ctx}>Campus · Learn anything</Eyebrow>
        <h1 className="mt-4 text-5xl md:text-7xl font-bold tracking-tight max-w-4xl" style={{ fontFamily: ctx.fontDisplay }}>Skills that compound. Courses that finish.</h1>
        <p className="mt-6 text-muted-foreground text-lg max-w-2xl">Bite-sized courses from working practitioners. Cohort-based when it matters, self-paced when it doesn't.</p>
        <div className="mt-8 flex gap-3"><Btn ctx={ctx}>Browse courses</Btn><Btn ctx={ctx} ghost>How it works</Btn></div>
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
          {["120k+ learners","4.8★ rated","350+ courses","Cert on complete"].map((s)=>(
            <div key={s} className="rounded-xl border border-white/10 p-4 text-sm">{s}</div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- CONTENT BLOCKS ---------- */

function Banner({ s, ctx }: { s: Section; ctx: Ctx }) {
  const text = s.props?.text ?? "Free shipping this weekend · Use code AETHER";
  return <div className="py-3 text-center text-sm font-medium" style={{ background: ctx.accent, color: "#0a0a0a" }}>{text}</div>;
}

function FeaturedCollections({ ctx }: { s: Section; ctx: Ctx }) {
  const items = [
    { name: "Nightshift", n: "18 pieces" }, { name: "Off-grid", n: "12 pieces" }, { name: "Studio", n: "9 pieces" }
  ];
  return (
    <section className="py-20"><Container>
      <div className="flex items-end justify-between mb-8"><div><Eyebrow ctx={ctx}>Collections</Eyebrow><H ctx={ctx} className="mt-2">Shop by story</H></div></div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((c, i) => (
          <div key={c.name} className="group relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0" style={{ background: `linear-gradient(${45+i*30}deg, ${ctx.accent}55, #0a0a0a)` }} />
            <div className="absolute bottom-6 left-6 right-6"><div className="text-2xl font-semibold" style={{ fontFamily: ctx.fontDisplay }}>{c.name}</div><div className="text-sm text-white/70">{c.n}</div></div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Lookbook({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Lookbook</Eyebrow><H ctx={ctx} className="mt-2">SS26 · In motion</H>
      <div className="mt-8 grid grid-cols-4 md:grid-cols-6 gap-2 auto-rows-[120px] md:auto-rows-[180px]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={cn("rounded-2xl", i % 5 === 0 && "col-span-2 row-span-2", i % 7 === 0 && "col-span-2")}
            style={{ background: `linear-gradient(${(i*45)%360}deg, ${ctx.accent}55, #111)` }} />
        ))}
      </div>
    </Container></section>
  );
}

function InstagramFeed({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="text-center mb-8"><Eyebrow ctx={ctx}>@aether.runner</Eyebrow><H ctx={ctx} className="mt-2">Follow along</H></div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square" style={{ background: `linear-gradient(${(i*30)%360}deg, ${ctx.accent}44, #222)` }} />
        ))}
      </div>
    </Container></section>
  );
}

function ProductComparison({ ctx }: { s: Section; ctx: Ctx }) {
  const rows = [
    ["Battery","42 hr","28 hr","18 hr"],["Weight","221 g","198 g","174 g"],["Drivers","40 mm","36 mm","32 mm"],["Water","IP67","IP54","—"],["Price","$329","$229","$149"],
  ];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Compare</Eyebrow><H ctx={ctx} className="mt-2">Pick your Pulse</H>
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-4 bg-white/[0.03]">
          {["","Pro X","Standard","Lite"].map((n, i) => (
            <div key={i} className={cn("p-4 text-sm font-medium", i === 0 && "text-muted-foreground")} style={i === 1 ? { color: ctx.accent } : undefined}>{n}</div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={i} className={cn("grid grid-cols-4 border-t border-white/[0.06]", i % 2 && "bg-white/[0.02]")}>
            {r.map((c, j) => <div key={j} className={cn("p-4 text-sm", j === 0 && "text-muted-foreground")}>{c}</div>)}
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function FeaturedGadgets({ s, ctx }: { s: Section; ctx: Ctx }) {
  const title = s.props?.title ?? "Featured";
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Editors picks</Eyebrow><H ctx={ctx} className="mt-2">{title}</H>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {[0,1,2].map(i => (
          <div key={i} className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="aspect-[4/3]" style={{ background: `radial-gradient(circle at 50% 50%, ${ctx.accent}55, #111)` }} />
            <div className="p-5"><div className="text-lg font-semibold" style={{ fontFamily: ctx.fontDisplay }}>Item {i+1}</div><div className="text-sm text-muted-foreground mt-1">Short description of the product or listing.</div><div className="mt-3 font-medium" style={{ color: ctx.accent }}>${(199+i*50).toFixed(2)}</div></div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function CategoriesGrid({ s, ctx }: { s: Section; ctx: Ctx }) {
  const title = s.props?.title ?? "Shop by category";
  const cats = ["Audio","Wearables","Home","Mobile","Cameras","Gaming"];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Browse</Eyebrow><H ctx={ctx} className="mt-2">{title}</H>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        {cats.map((c, i) => (
          <div key={c} className="aspect-[4/3] rounded-2xl border border-white/10 p-6 flex flex-col justify-end"
            style={{ background: `linear-gradient(${45+i*30}deg, ${ctx.accent}22, transparent)` }}>
            <div className="text-xl font-semibold" style={{ fontFamily: ctx.fontDisplay }}>{c}</div>
            <div className="text-sm text-muted-foreground">Explore →</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Products({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Shop</Eyebrow><H ctx={ctx} className="mt-2">All pieces</H>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] rounded-2xl" style={{ background: `linear-gradient(${(i*45)%360}deg, ${ctx.accent}44, #1a1a1a)` }} />
            <div className="mt-2 text-sm">Product {i+1}</div>
            <div className="text-xs text-muted-foreground">${89 + i*20}</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function FoodMenu({ ctx }: { s: Section; ctx: Ctx }) {
  const sections = [
    { name: "To start", items: [["Grilled focaccia","charred rosemary oil","9"],["Beet tartare","horseradish, rye","14"],["Burrata","stone fruit, basil","16"]] },
    { name: "Mains", items: [["Wood-fired branzino","fennel, lemon","38"],["Braised short rib","polenta, marrow","42"],["Handmade tagliatelle","brown butter, sage","28"]] },
    { name: "Sweet", items: [["Olive oil cake","citrus, sea salt","12"],["Affogato","espresso, vanilla","10"]] },
  ];
  return (
    <section className="py-20"><Container className="max-w-3xl">
      <div className="text-center"><Eyebrow ctx={ctx}>Tonight</Eyebrow><H ctx={ctx} className="mt-2 italic" >The menu</H></div>
      <div className="mt-10 space-y-10">
        {sections.map(sec => (
          <div key={sec.name}>
            <div className="text-lg font-semibold uppercase tracking-widest" style={{ color: ctx.accent }}>{sec.name}</div>
            <div className="mt-4 divide-y divide-white/[0.06]">
              {sec.items.map(([n,d,p]) => (
                <div key={n} className="py-3 flex items-baseline gap-4">
                  <div><div className="text-base font-medium">{n}</div><div className="text-sm text-muted-foreground italic">{d}</div></div>
                  <div className="flex-1 border-b border-dotted border-white/20" />
                  <div className="text-sm">${p}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Chef({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
      <div className="aspect-[4/5] rounded-3xl" style={{ background: `linear-gradient(160deg, ${ctx.accent}55, #2a1810)` }} />
      <div>
        <Eyebrow ctx={ctx}>Our kitchen</Eyebrow>
        <H ctx={ctx} className="mt-2 italic">Chef Elena Marchetti</H>
        <p className="mt-4 text-muted-foreground">Trained in Modena, Elena spent a decade with Bottura before returning home to open the trattoria. Her cooking is rooted in memory and market.</p>
        <p className="mt-3 text-muted-foreground">"I cook the food I want to eat with the people I love."</p>
      </div>
    </Container></section>
  );
}

function OpeningHours({ ctx }: { s: Section; ctx: Ctx }) {
  const days = [["Monday","Closed"],["Tue – Thu","17:30 – 22:30"],["Fri – Sat","17:30 – 23:30"],["Sunday","12:00 – 21:00"]];
  return (
    <section className="py-20"><Container className="max-w-xl text-center">
      <Eyebrow ctx={ctx}>Visit</Eyebrow><H ctx={ctx} className="mt-2 italic">Hours</H>
      <div className="mt-8 space-y-2">
        {days.map(([d,h]) => <div key={d} className="flex justify-between border-b border-white/[0.08] py-3"><span className="text-muted-foreground">{d}</span><span>{h}</span></div>)}
      </div>
      <div className="mt-8 text-sm text-muted-foreground">14 Riverbank Ln · Portland, OR · +1 (555) 219-4444</div>
    </Container></section>
  );
}

function ReservationForm({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20" style={{ background: `linear-gradient(180deg, ${ctx.accent}10, transparent)` }}><Container className="max-w-2xl">
      <div className="text-center"><Eyebrow ctx={ctx}>Book a table</Eyebrow><H ctx={ctx} className="mt-2 italic">Reserve</H></div>
      <div className="mt-8 rounded-3xl border border-white/10 p-6 grid md:grid-cols-2 gap-3 bg-white/[0.02]">
        {["Party size","Date","Time","Occasion","Name","Phone"].map(l => (
          <div key={l}><div className="text-[11px] text-muted-foreground mb-1">{l}</div><div className="h-11 rounded-lg bg-white/5 border border-white/10" /></div>
        ))}
        <button className="md:col-span-2 h-12 rounded-lg font-medium text-black" style={{ background: ctx.accent }}>Request reservation</button>
      </div>
    </Container></section>
  );
}

function Doctors({ ctx }: { s: Section; ctx: Ctx }) {
  const doctors = [
    { n: "Dr. Amara Chen", s: "Family medicine" }, { n: "Dr. Luis Ortega", s: "Pediatrics" }, { n: "Dr. Priya Rao", s: "Cardiology" }, { n: "Dr. Sam Al-Hadi", s: "Dermatology" }
  ];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Our team</Eyebrow><H ctx={ctx} className="mt-2">Doctors on staff</H>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {doctors.map((d, i) => (
          <div key={d.n} className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="aspect-square" style={{ background: `linear-gradient(${45+i*40}deg, ${ctx.accent}55, #1a2432)` }} />
            <div className="p-4"><div className="text-sm font-semibold">{d.n}</div><div className="text-xs text-muted-foreground">{d.s}</div><div className="mt-3 text-xs" style={{ color: ctx.accent }}>Book →</div></div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function AppointmentForm({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container className="max-w-3xl">
      <div className="text-center"><Eyebrow ctx={ctx}>Book online</Eyebrow><H ctx={ctx} className="mt-2">Appointment request</H></div>
      <div className="mt-8 rounded-3xl border border-white/10 p-6 bg-white/[0.02] grid md:grid-cols-2 gap-3">
        {["Full name","Date of birth","Insurance","Reason for visit","Preferred date","Preferred time"].map(l => (
          <div key={l}><div className="text-[11px] text-muted-foreground mb-1">{l}</div><div className="h-11 rounded-lg bg-white/5 border border-white/10" /></div>
        ))}
        <div className="md:col-span-2"><div className="text-[11px] text-muted-foreground mb-1">Notes</div><div className="h-24 rounded-lg bg-white/5 border border-white/10" /></div>
        <button className="md:col-span-2 h-12 rounded-lg font-medium text-black" style={{ background: ctx.accent }}>Submit request</button>
      </div>
    </Container></section>
  );
}

function Services({ s, ctx }: { s: Section; ctx: Ctx }) {
  const title = s.props?.title ?? "Services";
  const services = ["Strategy","Brand identity","Product design","Web engineering","Motion","Systems"];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>What we do</Eyebrow><H ctx={ctx} className="mt-2">{title}</H>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {services.map((n, i) => (
          <div key={n} className="rounded-2xl border border-white/10 p-6">
            <div className="h-10 w-10 rounded-lg grid place-items-center font-semibold" style={{ background: `${ctx.accent}22`, color: ctx.accent }}>{String(i+1).padStart(2,"0")}</div>
            <div className="mt-4 text-lg font-semibold" style={{ fontFamily: ctx.fontDisplay }}>{n}</div>
            <div className="mt-1 text-sm text-muted-foreground">One-line description of the offering and typical engagement shape.</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Team({ s, ctx }: { s: Section; ctx: Ctx }) {
  const title = s.props?.title ?? "Team";
  const people = ["Alex Rivera","Sam Cho","Kira Patel","Jordan Ng","Mila Weber","Theo Adeyemi"];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Studio</Eyebrow><H ctx={ctx} className="mt-2">{title}</H>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        {people.map((p, i) => (
          <div key={p}>
            <div className="aspect-[4/5] rounded-2xl" style={{ background: `linear-gradient(${45+i*35}deg, ${ctx.accent}44, #1a1a1a)` }} />
            <div className="mt-2 text-sm font-medium">{p}</div><div className="text-xs text-muted-foreground">Role · Location</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Testimonials({ ctx }: { s: Section; ctx: Ctx }) {
  const q = [
    { t: "Fastest ship of our year. Design carried the launch.", a: "Head of Product, Northwind" },
    { t: "They built a system we still use two years later.", a: "CEO, Meridian" },
    { t: "Made our team look 3× bigger than we are.", a: "Founder, Fable" },
  ];
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>What clients say</Eyebrow><H ctx={ctx} className="mt-2">Testimonials</H>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {q.map((x, i) => (
          <blockquote key={i} className="rounded-2xl border border-white/10 p-6">
            <div className="text-2xl leading-none" style={{ color: ctx.accent }}>"</div>
            <p className="mt-3 text-sm">{x.t}</p>
            <div className="mt-4 text-xs text-muted-foreground">— {x.a}</div>
          </blockquote>
        ))}
      </div>
    </Container></section>
  );
}

function PortfolioGrid({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Selected work</Eyebrow><H ctx={ctx} className="mt-2">Recent projects</H>
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="group">
            <div className="aspect-[4/3] rounded-2xl" style={{ background: `linear-gradient(${(i*60)%360}deg, ${ctx.accent}55, #111)` }} />
            <div className="mt-3 flex items-baseline justify-between"><div className="font-medium">Project {i+1}</div><div className="text-xs text-muted-foreground">Brand · 2026</div></div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Timeline({ ctx }: { s: Section; ctx: Ctx }) {
  const items = [["2018","Founded in Brooklyn"],["2020","Shipped Version 2"],["2022","30-person team"],["2024","Opened Berlin studio"],["2026","Launching Aether OS"]];
  return (
    <section className="py-20"><Container className="max-w-2xl">
      <Eyebrow ctx={ctx}>History</Eyebrow><H ctx={ctx} className="mt-2">Timeline</H>
      <div className="mt-8 relative pl-6 border-l border-white/10 space-y-6">
        {items.map(([y, t]) => (
          <div key={y} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full" style={{ background: ctx.accent }} />
            <div className="text-sm" style={{ color: ctx.accent }}>{y}</div>
            <div className="text-lg">{t}</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function CaseStudies({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <Eyebrow ctx={ctx}>Case studies</Eyebrow><H ctx={ctx} className="mt-2">Selected work with numbers</H>
      <div className="mt-8 space-y-4">
        {[0,1,2].map(i => (
          <div key={i} className="grid md:grid-cols-[1fr_1fr] gap-6 rounded-3xl border border-white/10 p-6">
            <div className="aspect-[16/10] rounded-2xl" style={{ background: `linear-gradient(${45+i*60}deg, ${ctx.accent}55, #111)` }} />
            <div className="flex flex-col justify-center">
              <Eyebrow ctx={ctx}>Client {i+1} · 2026</Eyebrow>
              <div className="mt-2 text-2xl font-semibold" style={{ fontFamily: ctx.fontDisplay }}>Rebuilt onboarding, doubled activation.</div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {[["+124%","Activation"],["-38%","Time to value"],["4.9","CSAT"]].map(([n,l]) => (
                  <div key={l}><div className="text-xl font-semibold" style={{ color: ctx.accent }}>{n}</div><div className="text-xs text-muted-foreground">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Gallery({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg" style={{ background: `linear-gradient(${(i*40)%360}deg, ${ctx.accent}44, #222)` }} />
        ))}
      </div>
    </Container></section>
  );
}

function Video({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="aspect-video rounded-3xl grid place-items-center relative overflow-hidden border border-white/10" style={{ background: `linear-gradient(135deg, ${ctx.accent}66, #000)` }}>
        <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur border border-white/30 grid place-items-center">
          <div className="ml-1 h-0 w-0 border-t-8 border-b-8 border-l-[14px] border-t-transparent border-b-transparent border-l-white" />
        </div>
      </div>
    </Container></section>
  );
}

function Countdown({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container className="text-center">
      <Eyebrow ctx={ctx}>Launching soon</Eyebrow><H ctx={ctx} className="mt-2">The drop begins in</H>
      <div className="mt-8 flex justify-center gap-3">
        {[["03","Days"],["12","Hours"],["44","Mins"],["09","Secs"]].map(([n,l])=>(
          <div key={l} className="rounded-2xl border border-white/10 px-6 py-4 min-w-[96px]">
            <div className="text-4xl font-bold tabular-nums" style={{ color: ctx.accent, fontFamily: ctx.fontDisplay }}>{n}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function FAQ({ ctx }: { s: Section; ctx: Ctx }) {
  const items = [["Do you offer refunds?","30-day returns on unused items."],["Do you ship internationally?","Yes, to 60+ countries."],["Can I request a custom order?","For orders over 20 units, absolutely."],["Where are you based?","Portland, OR with a studio in Berlin."]];
  return (
    <section className="py-20"><Container className="max-w-3xl">
      <Eyebrow ctx={ctx}>Support</Eyebrow><H ctx={ctx} className="mt-2">Frequently asked</H>
      <div className="mt-8 divide-y divide-white/[0.08] rounded-2xl border border-white/10">
        {items.map(([q,a]) => (
          <details key={q} className="p-5 group">
            <summary className="flex justify-between cursor-pointer list-none"><span className="font-medium">{q}</span><span className="text-muted-foreground group-open:rotate-45 transition" style={{ color: ctx.accent }}>+</span></summary>
            <p className="mt-3 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </Container></section>
  );
}

function Pricing({ ctx }: { s: Section; ctx: Ctx }) {
  const plans = [
    { n: "Starter", p: "$0", f: ["1 project","Community support"] },
    { n: "Pro", p: "$29", f: ["Unlimited projects","Priority support","Team features"], highlight: true },
    { n: "Studio", p: "$99", f: ["Everything in Pro","White label","SSO"] },
  ];
  return (
    <section className="py-20"><Container>
      <div className="text-center"><Eyebrow ctx={ctx}>Pricing</Eyebrow><H ctx={ctx} className="mt-2">Simple, honest pricing</H></div>
      <div className="mt-10 grid md:grid-cols-3 gap-4">
        {plans.map(pl => (
          <div key={pl.n} className={cn("rounded-3xl border p-6", pl.highlight ? "border-transparent" : "border-white/10")} style={pl.highlight ? { boxShadow: `0 0 0 1px ${ctx.accent}80, 0 20px 60px -20px ${ctx.accent}55` } : undefined}>
            <div className="text-sm font-semibold" style={{ color: ctx.accent }}>{pl.n}</div>
            <div className="mt-3 text-4xl font-bold" style={{ fontFamily: ctx.fontDisplay }}>{pl.p}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
            <ul className="mt-5 space-y-2 text-sm">{pl.f.map(x => <li key={x} className="flex items-center gap-2"><span style={{ color: ctx.accent }}>✓</span>{x}</li>)}</ul>
            <button className={cn("mt-6 w-full h-11 rounded-lg text-sm font-medium", pl.highlight ? "text-black" : "border border-white/15")} style={pl.highlight ? { background: ctx.accent } : undefined}>Choose {pl.n}</button>
          </div>
        ))}
      </div>
    </Container></section>
  );
}

function Newsletter({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="rounded-3xl border border-white/10 p-10 md:p-16 text-center" style={{ background: `radial-gradient(600px 300px at 50% 100%, ${ctx.accent}22, transparent)` }}>
        <Eyebrow ctx={ctx}>Stay in the loop</Eyebrow>
        <H ctx={ctx} className="mt-2 mx-auto">Get notified when new drops go live</H>
        <div className="mt-6 max-w-md mx-auto flex gap-2">
          <input placeholder="you@domain.com" className="flex-1 h-12 rounded-full bg-white/5 border border-white/10 px-4 text-sm outline-none" />
          <button className="h-12 px-6 rounded-full text-sm font-medium text-black" style={{ background: ctx.accent }}>Subscribe</button>
        </div>
      </div>
    </Container></section>
  );
}

function ContactForm({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container className="max-w-2xl">
      <Eyebrow ctx={ctx}>Contact</Eyebrow><H ctx={ctx} className="mt-2">Send us a note</H>
      <div className="mt-8 rounded-3xl border border-white/10 p-6 grid gap-3 bg-white/[0.02]">
        {["Name","Email","Subject"].map(l => <div key={l}><div className="text-[11px] text-muted-foreground mb-1">{l}</div><div className="h-11 rounded-lg bg-white/5 border border-white/10" /></div>)}
        <div><div className="text-[11px] text-muted-foreground mb-1">Message</div><div className="h-32 rounded-lg bg-white/5 border border-white/10" /></div>
        <button className="h-12 rounded-lg font-medium text-black" style={{ background: ctx.accent }}>Send message</button>
      </div>
    </Container></section>
  );
}

function MapBlock({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="rounded-3xl border border-white/10 aspect-[16/8] overflow-hidden relative" style={{ background: "linear-gradient(45deg, #1a1a1a, #0a0a0a)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke={ctx.accent} strokeOpacity="0.3" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-6 w-6 rounded-full ring-4 ring-black" style={{ background: ctx.accent, boxShadow: `0 0 0 10px ${ctx.accent}22` }} />
        </div>
      </div>
    </Container></section>
  );
}

function CTA({ ctx }: { s: Section; ctx: Ctx }) {
  return (
    <section className="py-20"><Container>
      <div className="rounded-3xl p-10 md:p-16 text-center border border-white/10" style={{ background: `linear-gradient(135deg, ${ctx.accent}44, transparent)` }}>
        <H ctx={ctx} className="mx-auto max-w-2xl">Ready when you are.</H>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto">Start free, upgrade when it clicks. No credit card required.</p>
        <div className="mt-6 inline-flex gap-3"><Btn ctx={ctx}>Get started</Btn><Btn ctx={ctx} ghost>Talk to sales</Btn></div>
      </div>
    </Container></section>
  );
}

function TextBlock({ ctx }: { s: Section; ctx: Ctx }) {
  return <section className="py-20"><Container className="max-w-2xl prose prose-invert"><H ctx={ctx}>{ (ctx as any) ? "Section heading" : ""}</H><p className="mt-4 text-muted-foreground">Add long-form copy here. This block is perfect for policies, terms, or extended narratives.</p></Container></section>;
}

/* ---------- REGISTRY ---------- */

const REG: Record<SectionType, (p: { s: Section; ctx: Ctx }) => React.ReactElement> = {
  "hero-simple": HeroSimple, "hero-fashion": HeroFashion, "hero-luxury": HeroLuxury,
  "hero-electronics": HeroElectronics, "hero-restaurant": HeroRestaurant, "hero-medical": HeroMedical,
  "hero-corporate": HeroCorporate, "hero-portfolio": HeroPortfolio, "hero-agency": HeroAgency,
  "hero-beauty": HeroBeauty, "hero-realestate": HeroRealEstate, "hero-furniture": HeroFurniture,
  "hero-education": HeroEducation,
  banner: Banner, cta: CTA, newsletter: Newsletter, countdown: Countdown,
  "featured-collections": FeaturedCollections, lookbook: Lookbook, instagram: InstagramFeed,
  "product-comparison": ProductComparison, "featured-gadgets": FeaturedGadgets, "categories-grid": CategoriesGrid,
  products: Products, pricing: Pricing,
  "food-menu": FoodMenu, chef: Chef, "opening-hours": OpeningHours, "reservation-form": ReservationForm,
  doctors: Doctors, "appointment-form": AppointmentForm,
  services: Services, team: Team, testimonials: Testimonials,
  "portfolio-grid": PortfolioGrid, timeline: Timeline, "case-studies": CaseStudies,
  gallery: Gallery, video: Video, faq: FAQ,
  "contact-form": ContactForm, map: MapBlock, "text-block": TextBlock,
};

export function renderSection(s: Section, ctx: Ctx) {
  const C = REG[s.type] ?? HeroSimple;
  return <C s={s} ctx={ctx} />;
}
