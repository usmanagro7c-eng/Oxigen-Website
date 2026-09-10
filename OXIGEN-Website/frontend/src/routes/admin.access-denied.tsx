import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/access-denied")({
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the admin dashboard. Only System Users can access this area.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Return to Website
        </Link>
      </div>
    </div>
  );
}
