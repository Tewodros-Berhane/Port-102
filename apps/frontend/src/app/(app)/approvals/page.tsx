import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { ApprovalsView } from "./_components/ApprovalsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <ApprovalsView session={s} />;
}
