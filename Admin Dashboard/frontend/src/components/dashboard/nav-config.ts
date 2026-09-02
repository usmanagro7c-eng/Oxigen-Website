import {
  Home,
  ShoppingCart, Package, Tags, Boxes, BadgePercent,
  Truck,
  Users,
  BarChart3, Bell, Image as ImageIcon,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  slug: string;      // "" = home (index). Used as /dashboard/<slug>
  label: string;
  icon: LucideIcon;
  href?: string;     // absolute app route override (bypasses /dashboard/<slug>)
  children?: NavItem[];
};

export type NavGroup = { title?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { slug: "", label: "Dashboard", icon: Home },
      { slug: "analytics", label: "Analytics", icon: BarChart3 },
      { slug: "notifications", label: "Notifications", icon: Bell, href: "/dashboard/notifications" },
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
      { slug: "shipping", label: "Shipping", icon: Truck },
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
    ],
  },
  {
    title: "Workspace",
    items: [
      { slug: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
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
