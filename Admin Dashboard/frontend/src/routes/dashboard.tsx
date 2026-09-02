import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/topnav";

import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — OxiGen Admin" },
      { name: "description", content: "OxiGen Admin — manage orders, products, customers and growth." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change (best-effort via resize/escape)
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
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
            onToggle={() => setCollapsed(c => !c)}
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
