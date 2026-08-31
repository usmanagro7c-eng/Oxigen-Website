import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — OxiGen" },
      { name: "description", content: "Manage your OxiGen orders, addresses, wishlist and account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <DashboardShell />,
});
