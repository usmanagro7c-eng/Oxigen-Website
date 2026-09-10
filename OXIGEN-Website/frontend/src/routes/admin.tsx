import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopNav } from "@/components/admin/topnav";
import { Toaster } from "@/components/ui/sonner";

import { useNavigate } from "@tanstack/react-router";
import { useAuthStore, type AuthUser } from "@/lib/admin-auth-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard — OxiGen Admin" },
      {
        name: "description",
        content: "OxiGen Admin — manage orders, products, customers and growth.",
      },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      let currentUser: AuthUser | null = user;

      if (!currentUser) {
        // Not hydrated yet (or genuinely logged out) — wait for hydration, then
        // re-validate against the backend before deciding.
        if (!hydrated) return;
        const fresh = await useAuthStore.getState().fetchSession();
        if (cancelled) return;
        currentUser = fresh;
        if (!currentUser) {
          navigate({ to: "/signin" });
          return;
        }
      } else if (!currentUser.user_type) {
        // Stale persisted sessions (from before user_type was tracked) lack
        // user_type — re-validate against the backend before denying access.
        const fresh = await useAuthStore.getState().fetchSession();
        if (cancelled) return;
        if (!fresh) {
          navigate({ to: "/signin" });
          return;
        }
        currentUser = fresh;
      }

      // Only System Users can access admin dashboard
      if (currentUser.user_type !== "System User") {
        navigate({ to: "/admin/access-denied" });
        return;
      }

      // System User - allow access
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [user, hydrated, navigate]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change (best-effort via resize/escape)
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <>
      <Toaster />
      <div className="relative min-h-screen bg-gradient-to-br from-secondary/60 via-background to-secondary/40 text-foreground">
        {/* Ambient background matching Oxigen website */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-[520px] w-[520px] rounded-full bg-accent/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-400/8 blur-3xl" />
          <div className="absolute inset-0 grid-pattern opacity-30" />
        </div>

        <div className="flex">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <div className="flex-1 min-w-0 flex flex-col min-h-screen">
            <TopNav onMobileOpen={() => setMobileOpen(true)} />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
