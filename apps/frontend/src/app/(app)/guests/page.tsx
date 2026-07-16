import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { GuestsView } from "./_components/GuestsView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <GuestsView session={session} />;
}
