import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { DepartmentsView } from "./_components/DepartmentsView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <DepartmentsView session={s} />;
}
