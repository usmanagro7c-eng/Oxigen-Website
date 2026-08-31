import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronsLeft, ExternalLink, ShoppingBag, X } from "lucide-react";
import { NAV, type NavItem } from "./nav-config";
import { cn } from "@/lib/utils";
import oxigenLogo from "@/assets/oxigen-logo.png";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeSlug = useMemo(() => {
    const rest = pathname.replace(/^\/dashboard\/?/, "");
    return rest;
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-md lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 272 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen shrink-0",
          "glass-strong border-r border-border/80",
          "flex flex-col shadow-sm",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-transform duration-300"
        )}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 -left-10 h-64 w-64 rounded-full blur-3xl opacity-20 bg-primary" />

        {/* Logo */}
        <div className="relative flex items-center justify-between px-4 h-16 border-b border-border/60">
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img src={oxigenLogo} alt="OxiGen" className="h-8 w-auto object-contain shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                  className="truncate flex flex-col"
                >
                  <span className="font-display font-extrabold text-sm text-foreground tracking-tight">OxiGen</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest -mt-0.5">Admin</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={onMobileClose}
            className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 scrollbar-none">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.title && !collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/75">
                  {group.title}
                </div>
              )}
              {group.title && collapsed && (
                <div className="mx-3 mb-2 h-px bg-border/60" />
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <NavRow key={item.slug || "home"} item={item} collapsed={collapsed} activeSlug={activeSlug} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer / collapse & Storefront link */}
        <div className="border-t border-border/60 p-3 space-y-1.5">
          {!collapsed && (
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-between gap-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-primary",
                "bg-primary/5 hover:bg-primary/10 transition-colors"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>View Storefront</span>
              </span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          <button
            onClick={onToggle}
            className={cn(
              "hidden lg:flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs text-muted-foreground font-medium",
              "hover:bg-secondary hover:text-foreground transition-colors"
            )}
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronsLeft className="h-4 w-4" />
            </motion.span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

function NavRow({ item, collapsed, activeSlug }: { item: NavItem; collapsed: boolean; activeSlug: string }) {
  const hasKids = !!item.children?.length;
  const isActive = activeSlug === item.slug;
  const isDescendantActive = hasKids && item.children!.some((c) => activeSlug === c.slug);
  const [open, setOpen] = useState(isDescendantActive);

  useEffect(() => { if (isDescendantActive) setOpen(true); }, [isDescendantActive]);

  const target = item.href
    ? { to: item.href } as const
    : item.slug
    ? { to: "/dashboard/$", params: { _splat: item.slug } } as const
    : { to: "/dashboard" } as const;

  return (
    <li>
      <div className="relative group">
        <Link
          {...target}
          onClick={(e) => {
            if (hasKids && !collapsed) {
              setOpen((o) => !o);
            }
            void e;
          }}
          className={cn(
            "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25 font-semibold"
              : isDescendantActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <item.icon className={cn(
            "relative h-4.5 w-4.5 shrink-0 transition-transform duration-200",
            "group-hover:scale-110",
            isActive ? "text-white" : isDescendantActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          )} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="relative flex-1 truncate">
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {isActive && !collapsed && (
            <motion.span
              layoutId="active-dot"
              className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm"
            />
          )}
          {!collapsed && hasKids && !isActive && (
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}
              className="relative text-muted-foreground/60">
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg glass-strong px-2.5 py-1.5 text-xs font-semibold opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-elegant z-50">
              {item.label}
            </span>
          )}
        </Link>
      </div>

      {/* Children */}
      {hasKids && !collapsed && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden ml-3.5 mt-1 border-l border-border/70 pl-3 space-y-0.5"
            >
              {item.children!.map((c) => {
                const cActive = activeSlug === c.slug;
                return (
                  <li key={c.slug}>
                    <Link
                      to="/dashboard/$" params={{ _splat: c.slug }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium",
                        "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                        "transition-colors duration-200",
                        cActive && "text-primary font-semibold bg-primary/10"
                      )}
                    >
                      <c.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{c.label}</span>
                      {cActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Link>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      )}
    </li>
  );
}
