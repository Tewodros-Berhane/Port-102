import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { EmployeesView } from "./_components/EmployeesView";
export default async function Page() {
  const s = await getSession();
  if (!s) redirect(routes.login);
  return <EmployeesView session={s} />;
}
