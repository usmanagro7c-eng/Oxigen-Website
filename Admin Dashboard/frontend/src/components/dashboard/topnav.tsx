import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search, Bell, Moon, Sun, Plus, UserCircle,
  Menu, Command, LogOut, Settings, KeyRound, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuthStore } from "@/lib/auth-store";
import { API_BASE } from "@/lib/api";


export function TopNav({ onMobileOpen }: { onMobileOpen: () => void }) {
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const email = user?.email ?? "";
  const fullName = user?.full_name ?? email.split("@")[0] ?? "OxiGen Admin";
  const initials = fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/notifications`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNotificationCount(data.unread ?? 0);
      } catch {
        // ignore, SSE stream will update once the backend is reachable
      }
    };

    fetchNotifications();

    const source = new EventSource(`${API_BASE}/admin/notifications/stream`);
    source.addEventListener("init", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      setNotificationCount(payload.unread ?? 0);
    });
    source.addEventListener("notification", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      setNotificationCount(payload.unread ?? 0);
    });
    source.addEventListener("change", (event) => {
      const payload = JSON.parse((event as MessageEvent).data || "{}");
      setNotificationCount(payload.unread ?? 0);
    });

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 h-16 border-b border-border/80 glass px-4 md:px-6 flex items-center gap-3"
    >
      <button
        onClick={onMobileOpen}
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search orders, products, customers…"
          className={cn(
            "w-full h-10 pl-10 pr-16 rounded-xl bg-card border border-border text-sm text-foreground",
            "placeholder:text-muted-foreground/70 outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          )}
        />
        <kbd className="hidden md:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </div>

      <div className="flex items-center gap-1 md:gap-1.5 ml-auto">
        <IconBtn icon={dark ? Moon : Sun} label="Theme" onClick={() => setDark(d => !d)} altTo="/dashboard/appearance" />
        <IconBtn icon={Bell} label="Notifications" badge={notificationCount} to="/dashboard/notifications" />



        {/* Profile */}
        <div ref={profileRef} className="relative ml-1">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-secondary transition-colors"
          >
            <span className="relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white font-bold text-[12px] shadow-sm shadow-primary/20">
              {initials || "OA"}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </span>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl glass-strong border border-border shadow-elegant p-2 z-50"
              >
                <div className="p-3 border-b border-border mb-1">
                  <div className="text-sm font-bold text-foreground">{fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{email || "Signed in"}</div>
                </div>
                {([
                  { icon: UserCircle, label: "Profile", to: "/dashboard/profile" as const },
                  { icon: Settings, label: "Settings", to: "/dashboard/settings" as const },
                  { icon: KeyRound, label: "API Keys", to: "/dashboard/api-keys" as const },
                  { icon: Shield, label: "Security", to: "/dashboard/security" as const },
                  { icon: Bell, label: "Notifications", to: "/dashboard/notifications" as const },
                ]).map(i => (
                  <Link
                    key={i.label}
                    to={i.to}
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    activeProps={{ className: "text-primary font-semibold bg-primary/10" }}
                  >
                    <i.icon className="h-4 w-4" />{i.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={async () => {
                    setProfileOpen(false);
                    await logout();
                    navigate({ to: "/" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}

function IconBtn({
  icon: Icon, label, badge, onClick, glow, hideMobile, to, altTo,
}: { icon: any; label: string; badge?: number; onClick?: () => void; glow?: boolean; hideMobile?: boolean; to?: string; altTo?: string }) {
  const cls = cn(
    "relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground",
    "hover:text-foreground hover:bg-secondary transition-all duration-200 hover:-translate-y-0.5",
    glow && "text-primary bg-primary/10 hover:shadow-glow",
    hideMobile && "hidden md:inline-flex"
  );
  const inner = (
    <>
      <Icon className="h-4 w-4" />
      {badge != null && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-primary to-accent text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
          {badge}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} aria-label={label} className={cls}>{inner}</Link>;
  return (
    <button
      onClick={onClick}
      onDoubleClick={altTo ? () => window.location.assign(altTo) : undefined}
      aria-label={label}
      className={cls}
    >{inner}</button>
  );
}
