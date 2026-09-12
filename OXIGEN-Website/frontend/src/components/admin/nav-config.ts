import {
  Home,
  ShoppingCart, Package, Tags, Boxes, BadgePercent,
  Users,
  BarChart3, Bell, Image as ImageIcon, ImageMinus, LayoutTemplate,
  MessageSquareQuote, HelpCircle, Link2, Megaphone, FileText, PanelTop,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  slug: string;      // "" = home (index). Used as /admin/<slug>
  label: string;
  icon: LucideIcon;
  href?: string;     // absolute app route override (bypasses /admin/<slug>)
  children?: NavItem[];
};

export type NavGroup = { title?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { slug: "", label: "Dashboard", icon: Home },
      { slug: "analytics", label: "Analytics", icon: BarChart3 },
      { slug: "notifications", label: "Notifications", icon: Bell, href: "/admin/notifications" },
    ],
  },
  {
    title: "Commerce",
    items: [
      { slug: "orders", label: "Orders", icon: ShoppingCart },
      { slug: "products", label: "Website Products", icon: Package },
      { slug: "categories", label: "Categories", icon: Tags },
      { slug: "inventory", label: "Inventory", icon: Boxes },
      { slug: "discounts", label: "Discounts", icon: BadgePercent },
    ],
  },
  {
    title: "Audience",
    items: [
      { slug: "customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Content",
    items: [
      { slug: "media", label: "Media Library", icon: ImageIcon },
      { slug: "banners", label: "Banners", icon: ImageMinus },
      { slug: "homepage", label: "Homepage", icon: PanelTop },
      { slug: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { slug: "faqs", label: "FAQs", icon: HelpCircle },
      { slug: "quick-links", label: "Quick Links", icon: Link2 },
      { slug: "brand-links", label: "Brand & Announcements", icon: Megaphone },
      { slug: "pages", label: "Pages", icon: FileText },
    ],
  },
  {
    title: "Workspace",
    items: [
      { slug: "settings", label: "Settings", icon: Settings, href: "/admin/settings" },
    ],
  },
];

export function findItem(slug: string): NavItem | null {
  for (const g of NAV) for (const it of g.items) {
    if (it.slug === slug) return it;
    if (it.children) for (const c of it.children) if (c.slug === slug) return c;
  }
  return null;
}
