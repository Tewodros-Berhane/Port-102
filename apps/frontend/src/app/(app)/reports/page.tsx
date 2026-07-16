import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { ReportsView } from "./_components/ReportsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <ReportsView session={s} />;
}
