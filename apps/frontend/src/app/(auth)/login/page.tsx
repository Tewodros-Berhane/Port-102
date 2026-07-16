import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { LoginForm } from "./_components/LoginForm";
import { ThemeToggle } from "@/components/theme-toggle";
export default async function LoginPage() {
  if (await getSession()) redirect(routes.dashboard);
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]">
      <section className="relative hidden overflow-hidden border-r border-sidebar-border bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,var(--sidebar-accent),transparent_32%)] opacity-70" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-primary text-xs font-extrabold text-primary-foreground">
            P102
          </div>
          <div>
            <p className="text-sm font-semibold">Port-102</p>
            <p className="text-xs text-sidebar-muted">
              Hotel management system
            </p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <div className="mb-5 h-px w-12 bg-accent" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
            Operations, clearly managed
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] xl:text-4xl">
            One calm workspace for every hotel operation.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-sidebar-muted">
            Secure access to the tools your team uses to keep the property
            moving.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">
          Port-102 management workspace
        </p>
      </section>
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[400px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-xs font-extrabold text-primary-foreground">
              P102
            </div>
            <div>
              <p className="text-sm font-semibold">Port-102</p>
              <p className="text-xs text-foreground-subtle">
                Management system
              </p>
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Secure access
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-foreground">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Sign in with your staff account to continue.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-8 text-xs leading-5 text-foreground-subtle">
            Access is limited to authorized hotel staff. Activity may be audited
            for security.
          </p>
        </div>
      </section>
    </div>
  );
}
