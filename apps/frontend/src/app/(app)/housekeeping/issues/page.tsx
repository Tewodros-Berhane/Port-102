import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { IssuesView } from "../_components/IssuesView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <IssuesView session={session} />;
}
