import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminContentSection, updateAdminContentSection, uploadAdminFile, getItemImageUrl } from "@/lib/api";

/* ============================================================
 * Generic schema-driven content editor for website sections.
 *
 * Schema describes each section (brand, announcements, nav,
 * categories, products, perks, testimonials, faqs, heroBanners,
 * promoBanners, quickLinks) as nested fields / objects / arrays.
 * The editor:
 *   - loads the section value from the admin backend
 *   - renders a responsive visual form (mobile first)
 *   - tracks unsaved changes, supports add/remove/reorder
 *   - saves the whole section via PUT /admin/content/:section
 * ============================================================ */

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "color"
  | "image"
  | "url"
  | "select";

export type FieldSchema = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  help?: string;
  width?: "half" | "full";
  // Nested object fields
  fields?: FieldSchema[];
  // Array of objects / scalars
  itemFields?: FieldSchema[];
  // Field used to title a card header (e.g. "name" in a list)
  labelKey?: string;
  // Start collapsed (bulky nested groups)
  collapsible?: boolean;
};

const t = (
  key: string,
  label: string,
  extra: Partial<FieldSchema> = {},
): FieldSchema => ({ key, label, ...extra });

/* Pages schemas — About, Reviews and legal pages.
 * The website's /about, /reviews and /legal/* pages are built from these
 * fields, so we expose them as simple visual forms (no raw JSON needed). */

const pageMetaFields = (): FieldSchema[] => [
  t("eyebrow", "Eyebrow / Kicker", { width: "full" }),
  t("title", "Main Heading", { width: "full" }),
  t("sub", "Subtitle", { type: "textarea", width: "full" }),
];

const aboutPageFields = (): FieldSchema[] => [
  t("eyebrow", "Eyebrow / Kicker", { width: "full" }),
  t("title", "Main Heading", { width: "full" }),
  t("sub", "Subtitle", { type: "textarea", width: "full" }),
  {
    key: "mission",
    label: "Mission Statement",
    collapsible: true,
    fields: [
      t("eyebrow", "Eyebrow / Kicker", { width: "full" }),
      t("title", "Heading", { width: "full" }),
      t("lead", "Lead Paragraph", { type: "textarea", width: "full" }),
      t("body", "Body Text", { type: "textarea", width: "full" }),
      t("image", "Image", { type: "image", width: "full" }),
      t("imageAlt", "Image Alt Text", { width: "full" }),
      t("ctaLabel", "Button Label"),
      t("ctaTo", "Button Link", { width: "full" }),
    ],
  },
  {
    key: "whyHeading",
    label: "'Why Choose Us' Heading",
    collapsible: true,
    fields: pageMetaFields(),
  },
];

const reviewsPageFields = (): FieldSchema[] => [
  t("eyebrow", "Eyebrow / Kicker", { width: "full" }),
  t("title", "Main Heading", { width: "full" }),
  t("sub", "Subtitle", { type: "textarea", width: "full" }),
  {
    key: "results",
    label: "'Results' Heading",
    collapsible: true,
    fields: pageMetaFields(),
  },
  {
    key: "resultsImages",
    label: "Before / After Images",
    labelKey: "label",
    collapsible: true,
    itemFields: [
      t("label", "Label"),
      t("img", "Image", { type: "image", width: "full" }),
      t("fallback", "Fallback Image URL", { type: "url", width: "full" }),
    ],
  },
];

const legalPageFields = (): FieldSchema[] => [
  t("eyebrow", "Eyebrow / Kicker", { width: "full" }),
  t("title", "Page Title", { width: "full" }),
  t("updated", "Last Updated", { width: "full" }),
  t("intro", "Intro Text", { type: "textarea", width: "full" }),
  {
    key: "sections",
    label: "Sections",
    labelKey: "heading",
    collapsible: true,
    itemFields: [
      t("heading", "Section Heading", { width: "full" }),
      {
        key: "body",
        label: "Paragraphs",
        width: "full",
        itemFields: [{ key: "*", label: "Paragraph" }],
      },
    ],
  },
];

export function schemaForSection(section: string): FieldSchema | null {
  switch (section) {
    case "brand":
      return {
        key: "brand",
        label: "Brand",
        fields: [
          t("name", "Brand Name", { width: "full" }),
          t("tagline", "Tagline", { width: "full" }),
          t("promo", "Promo Text", { width: "full" }),
          t("email", "Email"),
          t("phone", "Phone"),
          t("phoneHref", "Phone Link (tel:)"),
          t("location", "Location"),
          t("whatsapp", "WhatsApp URL", { type: "url", width: "full" }),
          t("facebook", "Facebook URL", { type: "url", width: "full" }),
          t("instagram", "Instagram URL", { type: "url", width: "full" }),
          t("shopAll", "Shop All Link", { width: "full" }),
        ],
      };

    case "announcements":
      return {
        key: "announcements",
        label: "Announcement Bar Messages",
        help: "One line each — rotate through the top announcement bar on the website.",
        itemFields: [{ key: "*", label: "Message" }],
      };

    case "nav":
      return {
        key: "nav",
        label: "Navigation Menu",
        itemFields: [
          { key: "label", label: "Menu Label" },
          { key: "to", label: "Link (path)" },
        ],
      };

    case "categories":
      return {
        key: "categories",
        label: "Shop by Category",
        labelKey: "title",
        itemFields: [
          t("title", "Title"),
          t("desc", "Description", { type: "textarea", width: "full" }),
          t("img", "Image", { type: "image", width: "full" }),
          t("href", "Link (path)"),
        ],
      };

    case "products":
      return {
        key: "products",
        label: "Static Products",
        labelKey: "name",
        itemFields: [
          t("name", "Product Name", { width: "full" }),
          t("subtitle", "Subtitle", { width: "full" }),
          t("price", "Price"),
          t("was", "Was Price"),
          t("tag", "Tag"),
          t("img", "Image", { type: "image" }),
          t("href", "Product Link", { type: "url", width: "full" }),
          t("desc", "Description", { type: "textarea", width: "full" }),
          t("ingredients", "Ingredients", { type: "textarea", width: "full" }),
        ],
      };

    case "perks":
      return {
        key: "perks",
        label: "Perks",
        labelKey: "title",
        itemFields: [
          t("title", "Title", { width: "full" }),
          t("desc", "Description", { type: "textarea", width: "full" }),
        ],
      };

    case "testimonials":
      return {
        key: "testimonials",
        label: "Customer Reviews",
        labelKey: "name",
        itemFields: [
          t("name", "Customer Name"),
          t("date", "Date"),
          t("title", "Review Title", { width: "full" }),
          t("text", "Review", { type: "textarea", width: "full" }),
        ],
      };

    case "faqs":
      return {
        key: "faqs",
        label: "Frequently Asked Questions",
        labelKey: "q",
        itemFields: [
          t("q", "Question", { width: "full" }),
          t("a", "Answer", { type: "textarea", width: "full" }),
        ],
      };

    case "heroBanners":
      return {
        key: "heroBanners",
        label: "Hero Banners",
        labelKey: "name",
        itemFields: [
          t("id", "ID / Slug"),
          t("name", "Brand Name"),
          t("title", "Banner Title", { width: "full" }),
          t("badge", "Badge Text"),
          t("category", "Category Label"),
          t("tagline", "Tagline"),
          t("sub", "Subtitle", { width: "full" }),
          t("desc", "Description", { type: "textarea", width: "full" }),
          t("img", "Banner Image", { type: "image", width: "full" }),
          t("price", "Price"),
          t("wasPrice", "Was Price"),
          t("discount", "Discount Label"),
          t("href", "Product Link", { type: "url", width: "full" }),
          t("cta", "CTA Button Text"),
          t("packagingNotice", "Packaging Notice", { type: "textarea", width: "full" }),
          t("whatsappMessage", "WhatsApp Message", { type: "textarea", width: "full" }),
          {
            key: "theme",
            label: "Theme / Colors",
            collapsible: true,
            fields: [
              t("accentColor", "Accent Color", { type: "color" }),
              t("glowColor", "Glow Color", { type: "color" }),
              t("badgeBg", "Badge BG Classes", { width: "full" }),
              t("badgeText", "Badge Text Classes", { width: "full" }),
              t("gradientBorder", "Gradient Border Classes", { width: "full" }),
              t("bgGradient", "BG Gradient Classes", { width: "full" }),
              t("chipBg", "Chip BG Classes", { width: "full" }),
            ],
          },
          {
            key: "highlights",
            label: "Highlights",
            collapsible: true,
            itemFields: [{ key: "*", label: "Highlight" }],
          },
          {
            key: "keyActives",
            label: "Key Actives",
            labelKey: "name",
            collapsible: true,
            itemFields: [
              t("name", "Name"),
              t("amount", "Amount"),
              t("note", "Note", { width: "full" }),
            ],
          },
          {
            key: "benefits",
            label: "Benefits",
            labelKey: "title",
            collapsible: true,
            itemFields: [
              t("title", "Title"),
              t("icon", "Icon Key"),
              t("desc", "Description", { width: "full" }),
            ],
          },
        ],
      };

    case "promoBanners":
      return {
        key: "promoBanners",
        label: "Promo Banners",
        labelKey: "title",
        itemFields: [
          t("id", "ID"),
          t("title", "Title", { width: "full" }),
          t("sub", "Subtitle", { type: "textarea", width: "full" }),
          t("img", "Image", { type: "image", width: "full" }),
          t("href", "Link", { type: "url", width: "full" }),
          t("cta", "CTA"),
          t("tag", "Promo Tag"),
          t("price", "Price"),
          t("wasPrice", "Was Price"),
          t("discount", "Discount Label"),
          t("badgeBg", "Badge BG Classes", { width: "full" }),
        ],
      };

    case "quickLinks":
      return {
        key: "quickLinks",
        label: "Quick Links",
        labelKey: "label",
        itemFields: [
          t("label", "Label"),
          t("img", "Image", { type: "image" }),
          t("to", "Link", { width: "full" }),
        ],
      };

    case "banners":
      return {
        key: "banners",
        label: "Banners (Admin JSON)",
        labelKey: "title",
        itemFields: [
          t("id", "ID"),
          t("title", "Title"),
          t("image", "Image", { type: "image" }),
          t("isActive", "Active", { type: "boolean" }),
          t("position", "Position", { type: "number" }),
        ],
      };

    case "pages":
      return {
        key: "pages",
        label: "Website Pages",
        fields: [
          {
            key: "about",
            label: "About Page",
            collapsible: true,
            fields: aboutPageFields(),
          },
          {
            key: "reviews",
            label: "Reviews Page",
            collapsible: true,
            fields: reviewsPageFields(),
          },
          {
            key: "legal",
            label: "Legal Pages",
            collapsible: true,
            fields: [
              {
                key: "terms",
                label: "Terms & Conditions",
                collapsible: true,
                fields: legalPageFields(),
              },
              {
                key: "privacy",
                label: "Privacy Policy",
                collapsible: true,
                fields: legalPageFields(),
              },
              {
                key: "shipping",
                label: "Shipping Policy",
                collapsible: true,
                fields: legalPageFields(),
              },
              {
                key: "refund",
                label: "Refund & Return Policy",
                collapsible: true,
                fields: legalPageFields(),
              },
            ],
          },
        ],
      };

    case "pages/about":
      return { key: "about", label: "About Page", fields: aboutPageFields() };

    case "pages/reviews":
      return { key: "reviews", label: "Reviews Page", fields: reviewsPageFields() };

    case "pages/legal/terms":
      return { key: "terms", label: "Terms & Conditions", fields: legalPageFields() };

    case "pages/legal/privacy":
      return { key: "privacy", label: "Privacy Policy", fields: legalPageFields() };

    case "pages/legal/shipping":
      return { key: "shipping", label: "Shipping Policy", fields: legalPageFields() };

    case "pages/legal/refund":
      return { key: "refund", label: "Refund & Return Policy", fields: legalPageFields() };

    default:
      return null;
  }
}

/* ============================================================
 * Field helpers
 * ============================================================ */

const widthOf = (f: FieldSchema): "half" | "full" =>
  f.width ?? (f.type === "textarea" ? "full" : "half");

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());

function FieldLabel({ field, hint }: { field: FieldSchema; hint?: string }) {
  return (
    <div className="mb-1 flex items-start justify-between gap-2">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {field.label}
      </label>
      {hint && (
        <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{hint}</span>
      )}
    </div>
  );
}

function InputBase({ className }: { className?: string }) {
  return cn(
    "w-full h-9 rounded-xl bg-card border border-border px-3 text-sm text-foreground",
    "placeholder:text-muted-foreground/50 outline-none transition",
    "focus:border-primary focus:ring-2 focus:ring-primary/20",
    className,
  );
}

function ImageInput({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  const [broken, setBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setBroken(false), [value]);

  // Resolve a stored path into something this page can actually display:
  //   - absolute http(s) URLs render as-is
  //   - ERP file paths (/files/…) render through the admin backend file proxy
  //   - site-local paths (/banners/…) render as-is (already on the website host)
  const previewSrc = useMemo(() => {
    if (!value) return null;
    if (typeof value !== "string") return String(value);
    if (/^(https?:)?\/\//.test(value)) return value;
    if (value.startsWith("/files/") || value.startsWith("/private/files/")) {
      return getItemImageUrl(value);
    }
    return value;
  }, [value]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAdminFile(file);
      const url = res?.data?.file_url || res?.data?.url || "";
      if (url) {
        onChange(url);
        pushToast("success", "Image uploaded — save to publish");
      } else {
        pushToast("error", "Upload returned no file URL.");
      }
    } catch (e: any) {
      pushToast("error", e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/50 grid place-items-center">
        {previewSrc && !broken ? (
          <img
            src={previewSrc}
            onError={() => setBroken(true)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/banners/your-image.jpg or /files/…"
          className={InputBase({ className: "flex-1" })}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Uploading…" : "Upload Image"}
          </button>
          {value ? (
            <span className="text-[10px] text-muted-foreground/70 truncate">
              Uploaded images sync to the site on save.
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">
              Paste a path or upload a file.
            </span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

function FieldInput({
  value,
  field,
  onChange,
}: {
  value: any;
  field: FieldSchema;
  onChange: (v: any) => void;
}) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={cn(
          InputBase({ className: "min-h-[84px] py-2 leading-relaxed resize-y" }),
        )}
      />
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={InputBase({ className: "tabular-nums" })}
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-emerald-500" : "bg-card border border-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            value ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    );
  }
  if (field.type === "color") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-border bg-card"
        />
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={InputBase({})}
        />
      </div>
    );
  }
  if (field.type === "image") {
    return <ImageInput value={value} onChange={onChange} />;
  }
  if (field.type === "url") {
    return (
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://"
        className={InputBase({})}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select
        value={value ?? field.options?.[0] ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={InputBase({ className: "cursor-pointer" })}
      >
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={InputBase({})}
    />
  );
}

function FieldCell({
  field,
  children,
  span = true,
}: {
  field?: FieldSchema;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <div className={cn("min-w-0", span && field && widthOf(field) === "full" && "sm:col-span-2")}>
      {children}
    </div>
  );
}

function Panel({
  title,
  count,
  open,
  onToggle,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const isOpen = open ?? selfOpen;
  const toggle = onToggle ?? (() => setSelfOpen((o) => !o));
  return (
    <div className="rounded-2xl border border-border/70 bg-card/50 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="text-sm font-bold text-foreground truncate">{title}</span>
          {typeof count === "number" && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 border border-primary/20 px-1.5 text-[10px] font-bold text-primary tabular-nums">
              {count}
            </span>
          )}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 shrink-0">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ============================================================
 * Object + List renderers
 * ============================================================ */

function ObjectFields({
  schema,
  value,
  onChange,
  nesting = 0,
}: {
  schema: FieldSchema;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  nesting?: number;
}) {
  const fields = schema.fields ?? [];
  return (
    <div className={cn("space-y-3", nesting > 0 && "rounded-xl border border-border/60 p-3 bg-secondary/20")}>
      {schema.collapsible ? (
        <Panel title={schema.label} defaultOpen={false}>
          <FieldGrid fields={fields} value={value} onChange={onChange} nesting={nesting} />
        </Panel>
      ) : (
        <FieldGrid fields={fields} value={value} onChange={onChange} nesting={nesting} />
      )}
    </div>
  );
}

function FieldGrid({
  fields,
  value,
  onChange,
  nesting,
}: {
  fields: FieldSchema[];
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  nesting: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((f) => (
        <FieldCell key={f.key} field={f}>
          {f.fields ? (
            <ObjectFields
              schema={f}
              value={value[f.key] ?? {}}
              onChange={(v) => onChange({ ...value, [f.key]: v })}
              nesting={nesting + 1}
            />
          ) : f.itemFields ? (
            <ListFields
              schema={f}
              value={value[f.key] ?? []}
              onChange={(v) => onChange({ ...value, [f.key]: v })}
              nesting={nesting + 1}
            />
          ) : (
            <>
              <FieldLabel field={f} />
              <FieldInput
                value={value[f.key]}
                field={f}
                onChange={(v) => onChange({ ...value, [f.key]: v })}
              />
            </>
          )}
        </FieldCell>
      ))}
    </div>
  );
}

function ListFields({
  schema,
  value,
  onChange,
  nesting = 0,
}: {
  schema: FieldSchema;
  value: any[];
  onChange: (v: any[]) => void;
  nesting?: number;
}) {
  const itemFields = schema.itemFields ?? [];
  const isScalar = itemFields.length === 1 && itemFields[0]?.key === "*";
  const list = Array.isArray(value) ? value : [];
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const updateItem = (i: number, v: any) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i: number) => onChange(list.filter((_, x) => x !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const toggle = (i: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const itemTitle = (item: any, i: number): string => {
    if (isScalar) return String(item ?? "");
    const key = schema.labelKey ?? itemFields.find((f) => f.key !== "*")?.key;
    const raw = key ? item?.[key] : undefined;
    if (raw) return String(raw);
    return `${schema.label} ${i + 1}`;
  };

  const body = (
    <div className="space-y-2">
      {(list ?? []).map((item, i) => {
        const isCollapsed = collapsed.has(i);
        const label = itemTitle(item, i);
        return (
          <div
            key={i}
            className="rounded-2xl border border-border/70 bg-card overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 bg-card">
              <button
                type="button"
                onClick={() => toggle(i)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                aria-label={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {label}
              </span>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition"
                aria-label="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition"
                aria-label="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {!isCollapsed && (
              <div className="border-t border-border/60 p-3.5">
                {isScalar ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={item ?? ""}
                      onChange={(e) => updateItem(i, e.target.value)}
                      className={InputBase({ className: "flex-1" })}
                      placeholder={schema.label}
                    />
                    <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {itemFields.map((f: FieldSchema) => (
                      <FieldCell key={f.key} field={f}>
                        {f.fields ? (
                          <ObjectFields
                            schema={f}
                            value={item[f.key] ?? {}}
                            onChange={(v) => updateItem(i, { ...item, [f.key]: v })}
                            nesting={nesting + 1}
                          />
                        ) : f.itemFields ? (
                          <ListFields
                            schema={f}
                            value={item[f.key] ?? []}
                            onChange={(v) => updateItem(i, { ...item, [f.key]: v })}
                            nesting={nesting + 1}
                          />
                        ) : (
                          <>
                            <FieldLabel field={f} />
                            <FieldInput
                              value={item[f.key]}
                              field={f}
                              onChange={(v) => updateItem(i, { ...item, [f.key]: v })}
                            />
                          </>
                        )}
                      </FieldCell>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...list, isScalar ? "" : {}])}
        className="flex w-full items-center justify-center gap-1.5 h-10 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-xs font-bold text-primary hover:bg-primary/10 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Add {schema.label.replace(/s$/, "").toLowerCase()}
      </button>
    </div>
  );

  if (nesting > 0) {
    // Nested sub-lists get an always-visible panel header with count
    return (
      <div className="space-y-2">
        <FieldLabel field={{ key: schema.key, label: schema.label }} hint={`${list.length} item${list.length === 1 ? "" : "s"}`} />
        {body}
      </div>
    );
  }

  return (
    <Panel title={schema.label} count={list.length}>
      {schema.help && <p className="mb-3 text-xs text-muted-foreground">{schema.help}</p>}
      {body}
    </Panel>
  );
}

/* ============================================================
 * Editor shell (visual / json modes)
 * ============================================================ */

function ScalarEditor({
  value,
  onChange,
  schema,
  onDirty,
}: {
  value: any;
  onChange: (v: any) => void;
  schema: FieldSchema;
  onDirty: () => void;
}) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [raw, setRaw] = useState("");
  const isScalarArray =
    Array.isArray(value) && (value.length === 0 || typeof value[0] !== "object");

  const switchMode = (m: "form" | "json") => {
    if (m === "json") setRaw(JSON.stringify(value ?? [], null, 2));
    setMode(m);
  };

  const applyJson = () => {
    try {
      onChange(JSON.parse(raw));
      onDirty();
      pushToast("success", "JSON applied");
    } catch {
      pushToast("error", "Invalid JSON — check syntax before saving.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {schema.label}
        </span>
        <div className="inline-flex rounded-lg bg-card border border-border p-0.5">
          {(["form", "json"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "h-7 px-3 rounded-md text-[11px] font-bold transition",
                mode === m
                  ? "bg-primary text-white shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "form" ? "Visual Editor" : "JSON"}
            </button>
          ))}
        </div>
      </div>

      {mode === "json" ? (
        <div className="space-y-2">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            className={cn(
              InputBase({ className: "min-h-[360px] py-2 font-mono text-xs leading-relaxed resize-y" }),
            )}
          />
          <button
            type="button"
            onClick={applyJson}
            className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-bold transition"
          >
            <Check className="h-3.5 w-3.5" /> Apply JSON
          </button>
        </div>
      ) : schema.fields ? (
        <ObjectFields schema={schema} value={value ?? {}} onChange={onChange} />
      ) : schema.itemFields || isScalarArray ? (
        <ListFields
          schema={schema}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      ) : (
        <div className="max-w-xl">
          <FieldLabel field={schema} />
          <FieldInput value={value} field={schema} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function RawJsonEditor({
  value,
  onChange,
  onDirty,
}: {
  value: any;
  onChange: (v: any) => void;
  onDirty: () => void;
}) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  useEffect(() => setRaw(JSON.stringify(value, null, 2)), [value]);
  return (
    <div className="space-y-2">
      <FieldLabel field={{ key: "raw", label: "Raw JSON" }} />
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
        className={cn(
          InputBase({ className: "min-h-[400px] py-2 font-mono text-xs leading-relaxed resize-y" }),
        )}
      />
      <button
        type="button"
        onClick={() => {
          try {
            onChange(JSON.parse(raw));
            onDirty();
            pushToast("success", "JSON applied");
          } catch {
            pushToast("error", "Invalid JSON — check syntax before continuing.");
          }
        }}
        className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-bold transition"
      >
        <Check className="h-3.5 w-3.5" /> Apply JSON
      </button>
    </div>
  );
}

/* ============================================================
 * Section page
 * ============================================================ */

export function ContentSectionPage({
  section,
  title,
  subtitle,
  icon,
}: {
  section: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  const schema = useMemo(() => schemaForSection(section), [section]);
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pristine = useRef<string>("");

  const load = () => {
    setLoading(true);
    setLoadError(null);
    getAdminContentSection(section)
      .then((res) => {
        setValue(res.data);
        pristine.current = JSON.stringify(res.data);
        setDirty(false);
      })
      .catch(() => {
        setLoadError("Failed to load this section. Refresh and try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleEdit = (v: any) => {
    setValue(v);
    setDirty(true);
  };

  const handleReset = () => {
    try {
      setValue(JSON.parse(pristine.current));
      setDirty(false);
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminContentSection(section, value);
      pristine.current = JSON.stringify(value);
      setDirty(false);
      setSaved(true);
      pushToast("success", `Saved — site updates within ~30 seconds`);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      pushToast("error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 w-2/3 max-w-sm animate-pulse rounded-xl bg-secondary/70" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl glass-strong border border-border p-10 text-center">
        <p className="text-sm font-semibold text-foreground">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-primary text-white text-xs font-bold transition hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient shadow-glow">
            {icon}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight truncate text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-1.5 px-3 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Discard
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || value === null || !dirty}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 px-4 rounded-xl text-xs font-bold transition",
              saved
                ? "bg-emerald-600 text-white"
                : "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25 hover:opacity-95",
              (!dirty || saving) && "disabled:opacity-40",
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving…" : saved ? "Saved" : dirty ? "Save Changes" : "No Changes"}
          </button>
        </div>
      </div>

      {/* Editor */}
      {value === null ? (
        <div className="rounded-2xl glass-strong border border-border p-10 text-center text-sm text-muted-foreground">
          Nothing to edit here yet.
        </div>
      ) : (
        <div className="rounded-2xl glass-strong border border-border p-3 sm:p-5">
          {schema ? (
            <ScalarEditor schema={schema} value={value} onChange={handleEdit} onDirty={() => setDirty(true)} />
          ) : (
            <RawJsonEditor value={value} onChange={handleEdit} onDirty={() => setDirty(true)} />
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/70 px-1">
        Changes go live on the website within ~30 seconds — no redeploy needed.
      </p>
    </div>
  );
}

/* ============================================================
 * Content hub — tabs for multi-section pages (homepage etc.)
 * ============================================================ */

export function ContentHub({
  sections,
  icon,
  title,
  subtitle,
}: {
  sections: (string | [string, string])[];
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  const items = useMemo(
    () =>
      sections.map((s, i) => {
        const [section, label] = Array.isArray(s) ? s : [s, null];
        return { section, label: label ?? humanize(section), index: i };
      }),
    [sections],
  );
  const [active, setActive] = useState(items[0]?.section ?? "");

  useEffect(() => {
    if (!items.some((it) => it.section === active)) {
      setActive(items[0]?.section ?? "");
    }
  }, [items, active]);

  const current = items.find((it) => it.section === active) ?? items[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-gradient shadow-glow">
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight truncate text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium line-clamp-2">{subtitle}</p>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 z-20 -mx-1 px-1">
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-none rounded-2xl bg-card/70 border border-border/70 p-1.5 backdrop-blur">
          {items.map((it) => {
            const isActive = it.section === current.section;
            return (
              <button
                key={it.section}
                type="button"
                onClick={() => setActive(it.section)}
                className={cn(
                  "shrink-0 h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition",
                  isActive
                    ? "bg-primary text-white shadow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <ContentSectionPage
          key={current.section}
          section={current.section}
          title={current.label}
          subtitle={title}
          icon={icon}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Toast bridge — dashboard's ToastHost listens for this event
 * ============================================================ */

function pushToast(kind: "success" | "error" | "info", text: string) {
  window.dispatchEvent(
    new CustomEvent("oxigen:new-notification", {
      detail: { title: kind === "error" ? "Error" : undefined, body: text, category: "content" },
    }),
  );
}