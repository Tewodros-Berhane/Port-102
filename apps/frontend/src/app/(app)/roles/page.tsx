import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { RolesView } from "./_components/RolesView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <RolesView session={s} />;
}
