import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { LoginForm } from "./_components/LoginForm";
export default async function LoginPage() {
  if (await getSession()) redirect(routes.dashboard);
  return <section className="login-card"><div className="brand-mark">P102</div><p className="eyebrow">Management workspace</p><h1>Welcome back</h1><p className="muted">Sign in with your staff account.</p><Suspense><LoginForm /></Suspense></section>;
}
