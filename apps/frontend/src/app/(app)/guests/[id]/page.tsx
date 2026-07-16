import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { GuestDetailView } from "./_components/GuestDetailView";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(routes.login);
  const { id } = await params;
  return <GuestDetailView id={Number(id)} session={session} />;
}
