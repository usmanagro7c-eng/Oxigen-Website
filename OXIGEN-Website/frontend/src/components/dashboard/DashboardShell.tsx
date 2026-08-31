import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  Heart,
  MapPin,
  User as UserIcon,
  Bell,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  Search,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import oxigenLogo from "@/assets/oxigen-logo.png";
import { useStore } from "@/lib/store";
import { mockNotifications } from "@/lib/dashboard-mock";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/store";

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("");
}

type NavItem = { to: string; label: string; icon: any; exact?: boolean };

export const dashboardNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/orders", label: "My Orders", icon: Package },
  { to: "/dashboard/tracking", label: "Order Tracking", icon: Truck },
  { to: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { to: "/dashboard/addresses", label: "Saved Addresses", icon: MapPin },
  { to: "/dashboard/profile", label: "Profile", icon: UserIcon },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { to: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

function useActive() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
}

export function DashboardShell({ children }: { children?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = useActive();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user, profile } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/signin" });
    }
  }, [user, navigate]);

  if (!user) return null;

  const current =
    dashboardNav.find((n) => (n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/")));
  const title = current?.label ?? "Dashboard";
  const unread = mockNotifications.filter((n) => !n.read).length;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-secondary via-background to-secondary">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 lg:block">
          <SidebarBody onNavigate={() => setMobileOpen(false)} isActive={isActive} onSignOut={signOut} />
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1 pb-24 lg:pb-6">
          <DashboardHeader
            title={title}
            unread={unread}
            user={user}
            profile={profile}
            onOpenMenu={() => setMobileOpen(true)}
          />

          <main className="mt-6">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 p-4 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
            >
              <div className="relative h-full">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute -right-2 -top-2 z-10 grid h-9 w-9 place-items-center rounded-full glass"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
                <SidebarBody onNavigate={() => setMobileOpen(false)} isActive={isActive} onSignOut={signOut} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <MobileBottomNav isActive={isActive} />
    </div>
  );
}

function SidebarBody({
  onNavigate,
  isActive,
  onSignOut,
}: {
  onNavigate: () => void;
  isActive: (to: string, exact?: boolean) => boolean;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl glass p-4">
      <Link to="/" className="mb-6 flex items-center gap-2 px-2 pt-2" onClick={onNavigate}>
        <img src={oxigenLogo} alt="OxiGen" className="h-8 w-auto" />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {dashboardNav.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25"
                  : "text-ink/80 hover:bg-white/60 hover:text-primary",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="active-dot"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-white"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        to="/shop"
        className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
      >
        <ShoppingBag className="h-4.5 w-4.5" />
        Back to Shop
      </Link>

      <button
        onClick={onSignOut}
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-4.5 w-4.5" />
        Logout
      </button>
    </div>
  );
}

function DashboardHeader({
  title,
  unread,
  user,
  profile,
  onOpenMenu,
}: {
  title: string;
  unread: number;
  user: { name?: string; email?: string } | null;
  profile: { name?: string } | null;
  onOpenMenu: () => void;
}) {
  return (
    <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl glass px-4 py-3 sm:px-5">
      <button
        onClick={onOpenMenu}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/70 text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My Account
        </p>
        <h1 className="truncate font-display text-xl font-extrabold text-ink sm:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search orders, products..."
            className="h-10 w-56 rounded-xl bg-white/70 pl-9 pr-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary lg:w-64"
          />
        </div>

        <Link
          to="/dashboard/notifications"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/70 text-ink transition hover:text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-primary to-accent px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>

        <Link
          to="/dashboard/profile"
          className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-md shadow-primary/25"
          aria-label="Profile"
        >
          {initials(profile?.name || user?.name || "User")}
        </Link>
      </div>
    </header>
  );
}

function MobileBottomNav({ isActive }: { isActive: (to: string, exact?: boolean) => boolean }) {
  const items = [
    dashboardNav[0], // Dashboard
    dashboardNav[1], // Orders
    dashboardNav[3], // Wishlist
    dashboardNav[6], // Notifications
    dashboardNav[5], // Profile
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((i) => {
          const active = isActive(i.to, i.exact);
          const Icon = i.icon;
          return (
            <li key={i.to}>
              <Link
                to={i.to as any}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {i.label.split(" ")[0]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Reusable dashboard primitives ---------- */

export function DashCard({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: any;
}) {
  return (
    <As
      className={cn(
        "rounded-2xl glass p-5 shadow-sm transition-shadow hover:shadow-lg",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-ink sm:text-xl">{title}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({
  status,
  tone = "default",
}: {
  status: string;
  tone?: "default" | "success" | "warning" | "info" | "danger";
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary text-ink",
    success: "bg-emerald/15 text-emerald ring-1 ring-inset ring-emerald/30",
    warning: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
    info: "bg-cyan/15 text-cyan ring-1 ring-inset ring-cyan/30",
    danger: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: any;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl glass px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <p className="font-display text-lg font-bold text-ink">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

export function orderTone(status: string) {
  if (status === "Delivered") return "success" as const;
  if (status === "Cancelled") return "danger" as const;
  if (status === "Shipped" || status === "Out for Delivery") return "info" as const;
  return "warning" as const;
}

export function payTone(status: string) {
  if (status === "Paid") return "success" as const;
  if (status === "Pending") return "warning" as const;
  return "info" as const;
}
