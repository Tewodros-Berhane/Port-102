import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { AuditLogsView } from "./_components/AuditLogsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <AuditLogsView session={s} />;
}
