import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { routes } from "@/lib/routes";
import { getSession } from "@/lib/session";
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) { const session = await getSession(); if (!session) redirect(`${routes.login}?next=${encodeURIComponent(routes.dashboard)}`); return <AppShell session={session}>{children}</AppShell>; }
