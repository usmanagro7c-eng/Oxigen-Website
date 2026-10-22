import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { Home, ShoppingBag } from "lucide-react";
import "../styles.css";
import { StoreProvider } from "../lib/store";
import { SiteLayout } from "../components/site/SiteLayout";
import { CartDrawer } from "../components/site/CartDrawer";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  const router = useRouter();

  return (
    <SiteLayout>
      <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-5 pt-28 pb-20 text-center">
        {/* Decorative halo behind the number */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl"
        />

        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
          Error 404
        </span>

        <h1 className="mt-6 font-display text-7xl font-extrabold tracking-tight text-ink sm:text-8xl">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="mt-4 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          This page took a wrong turn
        </h2>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          The page you're looking for doesn't exist, may have been moved, or the link
          is broken. Let's get you back on track.
        </p>

        <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:justify-center">
          <Link
            to="/shop"
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
          >
            <ShoppingBag className="h-4 w-4" /> Browse the Shop
          </Link>
          <Link
            to="/"
            className="touch-target inline-flex items-center justify-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
          >
            <Home className="h-4 w-4" /> Back Home
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Popular:</span>
          {[
            { label: "All Products", to: "/shop" as const },
            { label: "Categories", to: "/categories" as const },
            { label: "Reviews", to: "/reviews" as const },
            { label: "Contact", to: "/contact" as const },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary/40 hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => router.invalidate()}
            className="mt-8 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-ink"
          >
            Retry loading
          </button>
        )}
      </div>
    </SiteLayout>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <>
      <HeadContent />
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <CartDrawer />
          <Toaster position="top-center" richColors />
        </StoreProvider>
      </QueryClientProvider>
      <Scripts />
    </>
  );
}
