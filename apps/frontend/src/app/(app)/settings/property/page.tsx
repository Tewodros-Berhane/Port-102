import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { PropertySettingsView } from "./_components/PropertySettingsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <PropertySettingsView session={s} />;
}
