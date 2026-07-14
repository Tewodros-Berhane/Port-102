import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { DashboardView } from "./_components/DashboardView";
export default async function DashboardPage() { const session = await getSession(); if (!session) redirect(routes.login); return <DashboardView session={session}/>; }
