import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { ReservationDetailView } from "./_components/ReservationDetailView";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(routes.login);
  const { id } = await params;
  return <ReservationDetailView id={Number(id)} session={session} />;
}
