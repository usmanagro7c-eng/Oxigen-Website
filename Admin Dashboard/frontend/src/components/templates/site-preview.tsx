import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates-data";
import type { ThemeColor } from "@/lib/theme-colors";
import {
  Search, ShoppingBag, User, Heart, Star, Minus, Plus, Check, ArrowRight,
  Mail, Phone, MapPin, ChevronRight,
} from "lucide-react";

export type PreviewPage =
  | "home" | "shop" | "product" | "cart" | "checkout" | "account"
  | "login" | "about" | "contact" | "blog" | "blog-detail" | "404";

export const PREVIEW_PAGES: { id: PreviewPage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "shop", label: "Shop" },
  { id: "product", label: "Product" },
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "account", label: "Account" },
  { id: "login", label: "Login" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "blog", label: "Blog" },
  { id: "blog-detail", label: "Article" },
  { id: "404", label: "404" },
];

type Device = "desktop" | "tablet" | "mobile";

export function SitePreview({
  template: t, theme, page = "home", device = "desktop",
}: { template: Template; theme: ThemeColor; page?: PreviewPage; device?: Device }) {
  const isMobile = device === "mobile";
  const cols = isMobile ? 2 : device === "tablet" ? 3 : 4;
  const bodyText = theme.id === "light" ? "text-neutral-800" : "text-white/85";
  const softText = theme.id === "light" ? "text-neutral-500" : "text-white/60";
  const surface = theme.id === "light" ? "bg-white" : "bg-black/40";
  const cardBg = theme.id === "light" ? "bg-neutral-100" : "bg-white/[0.08]";
  const border = theme.id === "light" ? "border-neutral-200" : "border-white/10";
  const inkOnAccent = theme.ink;

  return (
    <motion.div
      key={`${page}-${theme.id}-${t.id}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={cn("rounded-2xl overflow-hidden border shadow-elegant bg-gradient-to-br", t.tint, border)}
      style={{ fontFamily: `"${t.fontBody}", ui-sans-serif` }}
    >
      <TopBar t={t} theme={theme} device={device} bodyText={bodyText} softText={softText} inkOnAccent={inkOnAccent} />

      <div className={cn(theme.id === "light" ? "bg-neutral-50" : "bg-black/25")}>
        {page === "home" && <HomePage t={t} theme={theme} isMobile={isMobile} cols={cols} bodyText={bodyText} softText={softText} cardBg={cardBg} inkOnAccent={inkOnAccent} />}
        {page === "shop" && <ShopPage t={t} theme={theme} cols={cols} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "product" && <ProductPage t={t} theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "cart" && <CartPage t={t} theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "checkout" && <CheckoutPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "account" && <AccountPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} />}
        {page === "login" && <LoginPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "about" && <AboutPage t={t} theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} />}
        {page === "contact" && <ContactPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} border={border} inkOnAccent={inkOnAccent} />}
        {page === "blog" && <BlogPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} />}
        {page === "blog-detail" && <BlogDetailPage theme={theme} bodyText={bodyText} softText={softText} cardBg={cardBg} />}
        {page === "404" && <NotFoundPage theme={theme} bodyText={bodyText} softText={softText} inkOnAccent={inkOnAccent} />}
      </div>

      <FooterBar t={t} theme={theme} softText={softText} bodyText={bodyText} border={border} />
    </motion.div>
  );
}

/* ---------- Chrome ---------- */

function TopBar({ t, theme, device, bodyText, softText, inkOnAccent }: any) {
  const nav = ["Shop", "Collections", "About", "Blog", "Contact"];
  return (
    <div className={cn("flex items-center justify-between px-4 md:px-8 py-3 border-b", theme.id === "light" ? "border-neutral-200 bg-white/70" : "border-white/10 bg-black/20", "backdrop-blur")}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-6 w-6 rounded-md shrink-0" style={{ background: theme.accent }} />
        <span className={cn("text-xs font-semibold truncate", bodyText)} style={{ fontFamily: `"${t.fontDisplay}"` }}>{t.name}</span>
      </div>
      {device !== "mobile" && (
        <div className={cn("flex items-center gap-4 text-[11px]", softText)}>
          {nav.map(n => <span key={n} className="hover:opacity-100 cursor-pointer">{n}</span>)}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <IconChip theme={theme}><Search className="h-3 w-3" /></IconChip>
        <IconChip theme={theme}><Heart className="h-3 w-3" /></IconChip>
        <IconChip theme={theme}><User className="h-3 w-3" /></IconChip>
        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold"
          style={{ background: theme.accent, color: inkOnAccent }}>
          <ShoppingBag className="h-3 w-3" /> 2
        </span>
      </div>
    </div>
  );
}

function IconChip({ children, theme }: any) {
  return (
    <span className={cn("h-6 w-6 rounded-md grid place-items-center border",
      theme.id === "light" ? "border-neutral-200 text-neutral-700 bg-white" : "border-white/10 text-white/70 bg-white/5"
    )}>{children}</span>
  );
}

function FooterBar({ t, theme, softText, border }: any) {
  return (
    <div className={cn("px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-t", border, theme.id === "light" ? "bg-white" : "bg-black/30")}>
      {["Shop","Company","Support","Follow"].map((h, i) => (
        <div key={h}>
          <div className="text-[11px] font-semibold mb-2" style={{ color: theme.accent }}>{h}</div>
          <div className={cn("space-y-1 text-[10px]", softText)}>
            {["Link one","Link two","Link three"].map((l, j) => <div key={j}>{l}</div>)}
          </div>
        </div>
      ))}
      <div className={cn("md:col-span-4 pt-3 flex items-center justify-between text-[10px] border-t", softText, border)}>
        <span>© {new Date().getFullYear()} {t.name}</span>
        <span>Privacy · Terms · Cookies</span>
      </div>
    </div>
  );
}

/* ---------- Reusable ---------- */

function Btn({ theme, children, variant = "solid" }: { theme: ThemeColor; children: any; variant?: "solid" | "outline" }) {
  if (variant === "outline") {
    return (
      <span className="inline-flex items-center gap-1 h-9 px-4 rounded-xl border text-[11px] font-semibold"
        style={{ borderColor: theme.accent, color: theme.accent }}>{children}</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 h-9 px-4 rounded-xl text-[11px] font-semibold shadow"
      style={{ background: theme.accent, color: theme.ink }}>{children}</span>
  );
}

function ProductCard({ i, theme, cardBg, softText, bodyText }: any) {
  return (
    <div className={cn("rounded-xl overflow-hidden border group", cardBg, "border-white/10")}>
      <div className="aspect-[4/5] relative" style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accentSoft}22)` }}>
        <span className="absolute top-2 left-2 text-[9px] px-1.5 h-4 inline-flex items-center rounded-md font-semibold"
          style={{ background: theme.accent, color: theme.ink }}>New</span>
        <Heart className="absolute top-2 right-2 h-3.5 w-3.5 text-white/70" />
      </div>
      <div className="p-2.5">
        <div className={cn("text-[11px] font-semibold truncate", bodyText)}>Piece 0{i+1}</div>
        <div className="flex items-center justify-between mt-0.5">
          <span className={cn("text-[10px]", softText)}>Essentials</span>
          <span className="text-[11px] font-semibold" style={{ color: theme.accent }}>${(i+1) * 29}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Pages ---------- */

function HomePage({ t, theme, cols, bodyText, softText, cardBg, inkOnAccent }: any) {
  void inkOnAccent;
  return (
    <div>
      {/* Hero */}
      <div className="px-4 md:px-10 py-10 md:py-16 relative overflow-hidden">
        <div className="absolute -top-20 right-0 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: theme.accent }} />
        <div className="max-w-xl relative">
          <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Featured drop · SS26</div>
          <div className={cn("mt-2 text-3xl md:text-5xl font-semibold leading-[1.05]", bodyText)}
            style={{ fontFamily: `"${t.fontDisplay}", ui-sans-serif` }}>
            A season made <span style={{ color: theme.accent }}>to move</span> with you.
          </div>
          <div className={cn("mt-3 text-xs md:text-sm max-w-md", softText)}>
            Meticulously crafted pieces engineered for everyday motion — designed with intention, made to last.
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Btn theme={theme}>Shop the drop <ArrowRight className="h-3 w-3" /></Btn>
            <Btn theme={theme} variant="outline">Watch film</Btn>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 md:px-10 pb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {["Outerwear","Knits","Denim","Accessories"].map((c) => (
          <div key={c} className={cn("h-24 rounded-2xl relative overflow-hidden border border-white/10")}
            style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accentSoft}22)` }}>
            <span className={cn("absolute left-3 bottom-3 text-xs font-semibold", bodyText)}>{c}</span>
            <ChevronRight className="absolute right-3 bottom-3 h-4 w-4" style={{ color: theme.accent }} />
          </div>
        ))}
      </div>

      {/* Featured products */}
      <div className="px-4 md:px-10 py-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Trending</div>
            <div className={cn("text-lg font-semibold", bodyText)} style={{ fontFamily: `"${t.fontDisplay}"` }}>Bestsellers this week</div>
          </div>
          <span className="text-[11px] font-semibold" style={{ color: theme.accent }}>View all →</span>
        </div>
        <div className={cn("grid gap-3", cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {Array.from({ length: cols }).map((_, i) => (
            <ProductCard key={i} i={i} theme={theme} cardBg={cardBg} softText={softText} bodyText={bodyText} />
          ))}
        </div>
      </div>

      {/* Newsletter band */}
      <div className="mx-4 md:mx-10 my-6 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})` }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: theme.ink, opacity: 0.7 }}>Journal</div>
          <div className="text-lg md:text-2xl font-semibold" style={{ color: theme.ink, fontFamily: `"${t.fontDisplay}"` }}>Get the drop, first.</div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="h-9 flex-1 md:w-56 rounded-xl bg-white/70 border border-white/50 px-3 text-[11px] flex items-center text-neutral-500">your@email.com</div>
          <span className="h-9 inline-flex items-center px-4 rounded-xl text-[11px] font-semibold" style={{ background: theme.ink, color: theme.accent }}>Subscribe</span>
        </div>
      </div>
    </div>
  );
}

function ShopPage({ t, theme, cols, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-4">
        <div>
          <div className={cn("text-[10px] uppercase tracking-widest mb-2", softText)}>Category</div>
          {["All","Outerwear","Knits","Denim","Shoes"].map((c, i) => (
            <div key={c} className={cn("h-8 px-2 rounded-lg text-[11px] flex items-center",
              i === 0 ? "" : cn("", softText))}
              style={i === 0 ? { background: theme.accent, color: inkOnAccent, fontWeight: 600 } : {}}>{c}</div>
          ))}
        </div>
        <div>
          <div className={cn("text-[10px] uppercase tracking-widest mb-2", softText)}>Price</div>
          <div className={cn("h-1 rounded-full relative", theme.id === "light" ? "bg-neutral-200" : "bg-white/10")}>
            <span className="absolute inset-y-0 left-[15%] right-[35%] rounded-full" style={{ background: theme.accent }} />
          </div>
          <div className={cn("text-[10px] mt-1", softText)}>$29 – $189</div>
        </div>
      </aside>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={cn("text-sm font-semibold", bodyText)} style={{ fontFamily: `"${t.fontDisplay}"` }}>All products · 128</div>
          <div className={cn("text-[11px] px-2 h-7 inline-flex items-center rounded-lg border", border, softText)}>Sort: Newest</div>
        </div>
        <div className={cn("grid gap-3", cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {Array.from({ length: cols * 2 }).map((_, i) => (
            <ProductCard key={i} i={i} theme={theme} cardBg={cardBg} softText={softText} bodyText={bodyText} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductPage({ theme, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-2">
        <div className="aspect-square rounded-2xl border" style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accentSoft}22)`, borderColor: theme.accent + "22" }} />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("aspect-square rounded-lg border", cardBg, border)} />
          ))}
        </div>
      </div>
      <div>
        <div className={cn("text-[10px] uppercase tracking-widest", softText)}>New arrival</div>
        <div className={cn("text-2xl md:text-3xl font-semibold mt-1", bodyText)}>The Movement Coat</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-semibold" style={{ color: theme.accent }}>$289</span>
          <span className={cn("line-through text-xs", softText)}>$349</span>
          <span className="inline-flex items-center gap-0.5 text-[10px]"><Star className="h-3 w-3 fill-amber-300 text-amber-300" /> <span className={softText}>4.9 · 231 reviews</span></span>
        </div>
        <div className={cn("mt-4 text-xs leading-relaxed", softText)}>
          A featherweight shell built from recycled fibers with sealed seams and a considered silhouette. Cut for everyday motion.
        </div>
        <div className="mt-5">
          <div className={cn("text-[10px] uppercase tracking-widest mb-2", softText)}>Size</div>
          <div className="flex flex-wrap gap-1.5">
            {["XS","S","M","L","XL"].map((s, i) => (
              <span key={s} className={cn("h-8 w-8 rounded-lg grid place-items-center text-[11px] border",
                i === 2 ? "" : border, i === 2 ? "" : softText)}
                style={i === 2 ? { background: theme.accent, color: inkOnAccent, borderColor: theme.accent } : {}}>{s}</span>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <Btn theme={theme}><ShoppingBag className="h-3 w-3" /> Add to bag</Btn>
          <Btn theme={theme} variant="outline"><Heart className="h-3 w-3" /> Wishlist</Btn>
        </div>
        <div className={cn("mt-6 grid grid-cols-3 gap-2 text-[10px]", softText)}>
          {["Free shipping","Easy returns","2-yr warranty"].map(f => (
            <div key={f} className={cn("h-10 rounded-lg border grid place-items-center", border)}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartPage({ theme, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
      <div>
        <div className={cn("text-lg font-semibold mb-3", bodyText)}>Your bag · 3 items</div>
        <div className="space-y-2">
          {[0,1,2].map(i => (
            <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl border", cardBg, border)}>
              <div className="h-14 w-14 rounded-lg" style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accentSoft}22)` }} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-xs font-semibold truncate", bodyText)}>Piece 0{i+1} — Onyx</div>
                <div className={cn("text-[10px]", softText)}>Size M · Qty 1</div>
              </div>
              <div className="inline-flex items-center gap-1">
                <span className={cn("h-6 w-6 grid place-items-center rounded-md border", border, softText)}><Minus className="h-3 w-3" /></span>
                <span className={cn("text-xs w-4 text-center", bodyText)}>1</span>
                <span className={cn("h-6 w-6 grid place-items-center rounded-md border", border, softText)}><Plus className="h-3 w-3" /></span>
              </div>
              <div className="text-xs font-semibold" style={{ color: theme.accent }}>${(i+1)*29}</div>
            </div>
          ))}
        </div>
      </div>
      <aside className={cn("rounded-xl border p-4 h-fit", cardBg, border)}>
        <div className={cn("text-[10px] uppercase tracking-widest mb-3", softText)}>Summary</div>
        {[["Subtotal","$174"],["Shipping","Free"],["Tax","$14"]].map(([k,v]) => (
          <div key={k} className={cn("flex items-center justify-between text-[11px] py-1", softText)}>
            <span>{k}</span><span className={bodyText}>{v}</span>
          </div>
        ))}
        <div className={cn("h-px my-3", theme.id === "light" ? "bg-neutral-200" : "bg-white/10")} />
        <div className={cn("flex items-center justify-between text-sm font-semibold", bodyText)}>
          <span>Total</span><span style={{ color: theme.accent }}>$188</span>
        </div>
        <div className="mt-4 h-10 rounded-xl grid place-items-center text-[11px] font-semibold"
          style={{ background: theme.accent, color: inkOnAccent }}>Proceed to checkout</div>
      </aside>
    </div>
  );
}

function CheckoutPage({ theme, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        {["Contact","Shipping","Payment"].map((s, i) => (
          <div key={s} className={cn("rounded-xl border p-4", cardBg, border)}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-5 w-5 rounded-full grid place-items-center text-[10px] font-semibold"
                style={{ background: theme.accent, color: inkOnAccent }}>{i+1}</span>
              <span className={cn("text-xs font-semibold", bodyText)}>{s}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[0,1,2,3].map(j => (
                <div key={j} className={cn("h-8 rounded-lg border", border, theme.id === "light" ? "bg-white" : "bg-white/5")} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <aside className={cn("rounded-xl border p-4 h-fit", cardBg, border)}>
        <div className={cn("text-[10px] uppercase tracking-widest mb-2", softText)}>Order</div>
        {[0,1].map(i => (
          <div key={i} className={cn("flex items-center gap-2 py-1.5 text-[11px]", softText)}>
            <div className="h-8 w-8 rounded-md" style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accentSoft}22)` }} />
            <span className={cn("flex-1", bodyText)}>Piece 0{i+1}</span>
            <span>${(i+1)*29}</span>
          </div>
        ))}
        <div className={cn("mt-3 flex items-center justify-between text-sm font-semibold", bodyText)}>
          <span>Total</span><span style={{ color: theme.accent }}>$188</span>
        </div>
        <div className="mt-4 h-10 rounded-xl grid place-items-center text-[11px] font-semibold"
          style={{ background: theme.accent, color: inkOnAccent }}>Pay now</div>
      </aside>
    </div>
  );
}

function AccountPage({ theme, bodyText, softText, cardBg, border }: any) {
  return (
    <div className="px-4 md:px-10 py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1">
        {["Overview","Orders","Wishlist","Addresses","Payment","Settings"].map((s, i) => (
          <div key={s} className={cn("h-8 px-2.5 rounded-lg text-[11px] flex items-center",
            i === 0 ? "" : softText)}
            style={i === 0 ? { background: theme.accent + "22", color: theme.accent, fontWeight: 600 } : {}}>{s}</div>
        ))}
      </aside>
      <div>
        <div className={cn("text-lg font-semibold mb-3", bodyText)}>Welcome back, Alex.</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[["12","Orders"],["4","Wishlist"],["$1,240","Lifetime spend"]].map(([v,l]) => (
            <div key={l} className={cn("rounded-xl border p-4", cardBg, border)}>
              <div className={cn("text-[10px] uppercase tracking-widest", softText)}>{l}</div>
              <div className="text-2xl font-semibold" style={{ color: theme.accent }}>{v}</div>
            </div>
          ))}
        </div>
        <div className={cn("mt-4 rounded-xl border p-4", cardBg, border)}>
          <div className={cn("text-xs font-semibold mb-2", bodyText)}>Recent orders</div>
          {[0,1,2].map(i => (
            <div key={i} className={cn("flex items-center justify-between py-2 text-[11px] border-t", border, softText)}>
              <span>#AE-{1042 + i}</span>
              <span className={bodyText}>Piece 0{i+1}</span>
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" style={{ color: theme.accent }} /> Delivered</span>
              <span>${(i+1)*29}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ theme, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-14 grid place-items-center">
      <div className={cn("w-full max-w-sm rounded-2xl border p-6", cardBg, border)}>
        <div className={cn("text-lg font-semibold", bodyText)}>Welcome back</div>
        <div className={cn("text-[11px]", softText)}>Sign in to continue shopping</div>
        <div className="mt-4 space-y-2">
          <div className={cn("h-9 rounded-lg border px-3 text-[11px] flex items-center", border, softText)}>you@example.com</div>
          <div className={cn("h-9 rounded-lg border px-3 text-[11px] flex items-center", border, softText)}>••••••••</div>
        </div>
        <div className="mt-4 h-10 rounded-xl grid place-items-center text-[11px] font-semibold"
          style={{ background: theme.accent, color: inkOnAccent }}>Sign in</div>
        <div className={cn("mt-3 text-center text-[10px]", softText)}>New here? <span style={{ color: theme.accent }}>Create account</span></div>
      </div>
    </div>
  );
}

function AboutPage({ t, theme, bodyText, softText, cardBg }: any) {
  return (
    <div className="px-4 md:px-10 py-10">
      <div className={cn("text-[10px] uppercase tracking-widest", softText)}>About us</div>
      <div className={cn("mt-1 text-2xl md:text-4xl font-semibold max-w-2xl", bodyText)} style={{ fontFamily: `"${t.fontDisplay}"` }}>
        We build considered goods for people in <span style={{ color: theme.accent }}>motion</span>.
      </div>
      <div className={cn("mt-4 text-xs md:text-sm max-w-2xl", softText)}>
        Founded in 2021 by a small team of designers and makers. Every piece is engineered end-to-end in our atelier.
      </div>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["12","Countries"],["48","Team"],["2019","Founded"],["4.9★","Rating"]].map(([v,l]) => (
          <div key={l} className={cn("rounded-xl p-4", cardBg)}>
            <div className="text-2xl font-semibold" style={{ color: theme.accent }}>{v}</div>
            <div className={cn("text-[11px]", softText)}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPage({ theme, bodyText, softText, cardBg, border, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Contact</div>
        <div className={cn("mt-1 text-2xl font-semibold", bodyText)}>Let's talk.</div>
        <div className={cn("mt-3 text-xs", softText)}>We reply within one business day.</div>
        <div className="mt-5 space-y-2">
          {[[Mail,"hello@aether.co"],[Phone,"+1 (415) 555-0132"],[MapPin,"221 Market St, San Francisco"]].map(([I, v]: any, i) => (
            <div key={i} className={cn("flex items-center gap-2 text-[11px]", bodyText)}>
              <I className="h-3.5 w-3.5" style={{ color: theme.accent }} /> {v}
            </div>
          ))}
        </div>
      </div>
      <div className={cn("rounded-2xl border p-5", cardBg, border)}>
        <div className="grid grid-cols-2 gap-2">
          {["Name","Email","Subject","Company"].map(f => (
            <div key={f}>
              <div className={cn("text-[10px] mb-1", softText)}>{f}</div>
              <div className={cn("h-8 rounded-lg border", border)} />
            </div>
          ))}
        </div>
        <div className={cn("text-[10px] mt-2 mb-1", softText)}>Message</div>
        <div className={cn("h-20 rounded-lg border", border)} />
        <div className="mt-3 h-10 rounded-xl grid place-items-center text-[11px] font-semibold"
          style={{ background: theme.accent, color: inkOnAccent }}>Send message</div>
      </div>
    </div>
  );
}

function BlogPage({ theme, bodyText, softText, cardBg }: any) {
  return (
    <div className="px-4 md:px-10 py-10">
      <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Journal</div>
      <div className={cn("mt-1 text-2xl font-semibold", bodyText)}>Notes from the atelier</div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className={cn("rounded-xl overflow-hidden border border-white/10", cardBg)}>
            <div className="aspect-[16/10]" style={{ background: `linear-gradient(135deg, ${theme.accent}44, ${theme.accentSoft}22)` }} />
            <div className="p-3">
              <div className={cn("text-[10px]", softText)}>Design · 4 min read</div>
              <div className={cn("text-xs font-semibold mt-1 leading-snug", bodyText)}>How we design for movement, not just aesthetics</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlogDetailPage({ theme, bodyText, softText, cardBg }: any) {
  return (
    <div className="px-4 md:px-10 py-10 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6 max-w-4xl">
      <article>
        <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Design · Jul 8, 2026</div>
        <div className={cn("mt-1 text-2xl md:text-3xl font-semibold leading-tight", bodyText)}>
          How we design for movement, not just aesthetics
        </div>
        <div className={cn("mt-4 aspect-[16/9] rounded-2xl", cardBg)}
          style={{ background: `linear-gradient(135deg, ${theme.accent}44, ${theme.accentSoft}22)` }} />
        <div className={cn("mt-4 space-y-2 text-xs", softText)}>
          <p>Every seam, every stitch is a decision. This is a philosophy note on why we start from motion.</p>
          <p>Our atelier prototypes each piece on real bodies before it ever sees a store shelf.</p>
          <p>The result is clothing that disappears into your day, not one that fights against it.</p>
        </div>
      </article>
      <aside className="space-y-2">
        <div className={cn("text-[10px] uppercase tracking-widest", softText)}>Related</div>
        {[0,1,2].map(i => (
          <div key={i} className={cn("rounded-xl p-2 flex items-center gap-2", cardBg)}>
            <div className="h-10 w-10 rounded-md" style={{ background: `linear-gradient(135deg, ${theme.accent}44, ${theme.accentSoft}22)` }} />
            <div className={cn("text-[11px]", bodyText)}>Field notes 0{i+1}</div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function NotFoundPage({ theme, bodyText, softText, inkOnAccent }: any) {
  return (
    <div className="px-4 md:px-10 py-24 grid place-items-center text-center">
      <div className="text-6xl md:text-8xl font-bold" style={{ color: theme.accent }}>404</div>
      <div className={cn("mt-2 text-xl font-semibold", bodyText)}>Page not found</div>
      <div className={cn("mt-1 text-xs max-w-sm", softText)}>The page you're looking for has moved, been renamed, or never existed.</div>
      <div className="mt-4 h-10 px-5 rounded-xl inline-flex items-center text-[11px] font-semibold"
        style={{ background: theme.accent, color: inkOnAccent }}>Back to home</div>
    </div>
  );
}
