import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE } from "./api";
import * as siteData from "./site-data";

// The site-content shape mirrors the admin backend's content document. We export
// a loose type here so the frontend can merge it over the static site-data. Since
// site-data.ts already carries precise types for each section, the provider uses
// them as the source of truth types while the live API overrides values at runtime.

type ContentShape = {
  version?: number;
  updatedAt?: string;
  brand?: typeof siteData.brand;
  announcements?: string[];
  nav?: { label: string; to: string }[];
  categories?: typeof siteData.categories;
  products?: typeof siteData.products;
  perks?: typeof siteData.perks;
  testimonials?: typeof siteData.testimonials;
  faqs?: typeof siteData.faqs;
  heroBanners?: typeof siteData.heroBanners;
  promoBanners?: typeof siteData.promoBanners;
  quickLinks?: typeof siteData.quickLinks;
  pages?: typeof PAGE_DEFAULTS;
};

type SiteContentContextValue = {
  content: ContentShape;
  loading: boolean;
  version: number;
  refreshedAt: string | null;
  refresh: () => Promise<void>;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentShape>({});
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  async function refresh() {
    try {
      const res = await fetch(`${API_BASE}/site-content`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data;
      if (data && typeof data === "object") {
        setContent((prev) => {
          const merged: ContentShape = {
            ...prev,
            ...data,
            // Merge pages deeply (about/reviews/legal) instead of replace
            pages: { ...prev.pages, ...data.pages },
          };
          return merged;
        });
        if (typeof json?.version === "number") setVersion(json.version);
      }
    } catch {
      // network error -> keep static defaults
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      await refresh();
    }
    refresh();

    const interval = window.setInterval(poll, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<SiteContentContextValue>(
    () => ({
      content,
      loading,
      version,
      refreshedAt: content.updatedAt ?? null,
      refresh,
    }),
    [content, loading, version],
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContentContextValue {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent must be used within SiteContentProvider");
  return ctx;
}

// Convenience per-section selectors that fall back to the static site-data values
// when the live API hasn't provided an override.
export function useBrand() {
  const { content } = useSiteContent();
  return { ...siteData.brand, ...(content.brand ?? {}) };
}

export function useAnnouncements() {
  const { content } = useSiteContent();
  return content.announcements ?? siteData.announcements;
}

export function useNav() {
  const { content } = useSiteContent();
  return content.nav ?? siteData.nav;
}

export function useCategories() {
  const { content } = useSiteContent();
  return content.categories ?? siteData.categories;
}

export function useProducts() {
  const { content } = useSiteContent();
  return content.products ?? siteData.products;
}

export function usePerks() {
  const { content } = useSiteContent();
  return content.perks ?? siteData.perks;
}

export function useTestimonials() {
  const { content } = useSiteContent();
  return content.testimonials ?? siteData.testimonials;
}

export function useFaqs() {
  const { content } = useSiteContent();
  return content.faqs ?? siteData.faqs;
}

export function useHeroBanners() {
  const { content } = useSiteContent();
  return content.heroBanners ?? siteData.heroBanners;
}

export function usePromoBanners() {
  const { content } = useSiteContent();
  return content.promoBanners ?? siteData.promoBanners;
}

export function useQuickLinks() {
  const { content } = useSiteContent();
  return content.quickLinks ?? siteData.quickLinks;
}

// Default page copy previously hardcoded in route files. The admin backend's
// content document can override these via the `pages` section.
const PAGE_DEFAULTS = {
  about: {
    eyebrow: "Our Mission — Wellness for Life",
    title: "About OxiGen",
    sub: "Exploring the goodness of nature with innovation.",
    mission: {
      eyebrow: "Our Mission — Wellness for Life",
      title: "Exploring the goodness of nature with innovation",
      lead: "At OxiGen we aim to explore the goodness of nature with innovation. We are dedicated to playing our role in building a happy & healthy community.",
      body: "Quality and transparency are at the heart of everything we do. We carefully select ingredients and formulate products with a focus on safety, quality, and everyday wellness support — helping you make informed choices about your health through trusted nutritional solutions.",
      image: "/banners/banner-nutricept.jpg",
      imageAlt: "OxiGen Premium Nutritional Supplements Pakistan",
      ctaLabel: "Learn More",
      ctaTo: "/about",
    },
    whyHeading: {
      eyebrow: "Why Choose Us",
      title: "A wellness experience you can trust",
    },
  },
  reviews: {
    eyebrow: "Let customers speak for us",
    title: "Loved across Pakistan",
    sub: "See the difference consistent, quality nutrition can make.",
    results: {
      eyebrow: "Real Results",
      title: "Visible transformation",
      sub: "See the difference consistent, quality nutrition can make.",
    },
    resultsImages: [
      { img: "/before_2.webp", fallback: `${siteData.CDN}/before_2.webp?v=1780588913&width=1200`, label: "Before" },
      { img: "/after_oxigen.png", fallback: `${siteData.CDN}/after_oxigen.png?v=1780590184&width=1200`, label: "After" },
    ],
  },
  legal: {
    terms: {
      eyebrow: "Legal",
      title: "Terms & Conditions",
      updated: "July 2026",
      intro: "Please read these terms carefully before using our website or placing an order.",
      sections: [
        {
          heading: "Use of our website",
          body: [
            "By accessing this website and placing an order you agree to these terms. You confirm that the information you provide is accurate and that you are able to receive deliveries at the address given.",
          ],
        },
        {
          heading: "Products & pricing",
          body: [
            "We aim to describe our products accurately, including ingredients and usage. Prices are listed in Pakistani Rupees (PKR) and may change from time to time. Promotional offers apply while stocks last.",
            "Our supplements are intended to support general wellbeing and are not a substitute for medical advice. Consult a healthcare professional before use if you are pregnant, nursing, or taking medication.",
          ],
        },
        {
          heading: "Orders",
          body: [
            "Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order and to limit quantities. You will receive confirmation once your order is accepted.",
          ],
        },
        {
          heading: "Limitation of liability",
          body: [
            "To the extent permitted by law, OxiGen is not liable for any indirect or consequential loss arising from the use of our products or website.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about these terms can be directed to our team via WhatsApp or the Contact page.",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Legal",
      title: "Privacy Policy",
      updated: "July 2026",
      intro: "Your privacy matters to us. This policy explains what we collect and how we use it.",
      sections: [
        {
          heading: "Information we collect",
          body: [
            "When you place an order or contact us, we collect the details you provide — such as your name, phone number, delivery address and email address. This information is used only to process and deliver your order.",
            "We do not store card details. Payments are handled through cash on delivery or secure third-party payment providers.",
          ],
        },
        {
          heading: "How we use your information",
          body: [
            "We use your information to confirm orders, arrange delivery, provide customer support and, where you have opted in, send occasional offers and wellness tips.",
            "You can unsubscribe from marketing messages at any time.",
          ],
        },
        {
          heading: "Sharing your information",
          body: [
            "We share your delivery details only with our courier partners so your order can reach you. We never sell your personal data to third parties.",
          ],
        },
        {
          heading: "Data security",
          body: [
            "We apply reasonable safeguards to protect your information. While no online service can guarantee absolute security, we work to keep your data safe and limit access to it.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You may request access to, correction of, or deletion of the personal information we hold about you by contacting us on WhatsApp or through our Contact page.",
          ],
        },
      ],
    },
    shipping: {
      eyebrow: "Legal",
      title: "Shipping Policy",
      updated: "July 2026",
      intro: "Fast, reliable delivery across Pakistan — with cash on delivery available.",
      sections: [
        {
          heading: "Delivery coverage",
          body: [
            "We deliver nationwide across Pakistan through trusted courier partners, including major cities and most towns.",
          ],
        },
        {
          heading: "Shipping charges",
          body: [
            "Enjoy free shipping on your order during our current promotion. Any applicable charges will always be shown clearly at checkout before you confirm.",
          ],
        },
        {
          heading: "Delivery times",
          body: [
            "Orders are typically dispatched within 1–2 business days. Delivery usually takes 2–5 business days depending on your location. You will receive tracking details once your order ships.",
          ],
        },
        {
          heading: "Cash on delivery",
          body: [
            "Prefer to pay when your order arrives? Cash on delivery is available across Pakistan. Please keep the exact amount ready for the courier.",
          ],
        },
      ],
    },
    refund: {
      eyebrow: "Legal",
      title: "Refund & Return Policy",
      updated: "July 2026",
      intro: "We want you to shop with confidence. Here's how returns and refunds work.",
      sections: [
        {
          heading: "7-day returns",
          body: [
            "If you are not satisfied, you may request a return within 7 days of receiving your order. Items must be unused, in their original sealed packaging and in resalable condition.",
            "For hygiene and safety reasons, opened or used supplement bottles cannot be returned unless the product is damaged or defective.",
          ],
        },
        {
          heading: "Damaged or wrong items",
          body: [
            "If you receive a damaged, defective or incorrect item, contact us within 48 hours of delivery with photos. We will arrange a replacement or full refund at no extra cost.",
          ],
        },
        {
          heading: "How to request a return",
          body: [
            "Message us on WhatsApp or use the Contact page with your order details and reason for return. Our team will guide you through the pickup or drop-off process.",
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Approved refunds are processed within 5–7 business days after we receive the returned item. Refunds are issued via the original payment method or bank transfer for cash-on-delivery orders.",
          ],
        },
      ],
    },
  },
} as const;

export function usePageText<P extends Record<string, unknown>>(
  key: "about" | "reviews" | "legal",
): P {
  const { content } = useSiteContent();
  const fallback = PAGE_DEFAULTS[key] as unknown as P;
  const live = (content.pages?.[key] ?? {}) as unknown as P;
  return { ...fallback, ...live };
}

export function useLegalPage(key: "terms" | "privacy" | "shipping" | "refund"): any {
  const legal = usePageText<{ [k: string]: any } & typeof PAGE_DEFAULTS.legal>("legal");
  return legal[key];
}
