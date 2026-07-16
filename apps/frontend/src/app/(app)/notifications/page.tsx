import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { NotificationsView } from "./_components/NotificationsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <NotificationsView session={s} />;
}
