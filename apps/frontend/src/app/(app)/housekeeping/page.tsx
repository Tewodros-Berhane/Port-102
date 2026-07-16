import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { HousekeepingDashboardView } from "./_components/HousekeepingDashboardView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <HousekeepingDashboardView session={session} />;
}
