import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { FrontDeskView } from "./_components/FrontDeskView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <FrontDeskView session={session} />;
}
