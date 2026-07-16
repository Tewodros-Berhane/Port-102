import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { IssueDetailView } from "../../_components/IssueDetailView";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(routes.login);
  const { id } = await params;
  return <IssueDetailView id={Number(id)} session={session} />;
}
