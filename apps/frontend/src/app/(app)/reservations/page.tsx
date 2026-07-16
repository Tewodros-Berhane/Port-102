import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { ReservationsView } from "./_components/ReservationsView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <ReservationsView session={session} />;
}
