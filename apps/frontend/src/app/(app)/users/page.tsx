import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { UsersView } from "./_components/UsersView";
export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <UsersView session={session} />;
}
