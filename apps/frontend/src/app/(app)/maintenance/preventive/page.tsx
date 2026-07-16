import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { PlansView } from "../_components/MaintenanceViews";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <PlansView session={s} />;
}
