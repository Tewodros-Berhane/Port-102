import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { AssetDetail } from "../../_components/MaintenanceViews";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await getSession();
  if (!s) redirect(routes.login);
  const { id } = await params;
  return <AssetDetail id={Number(id)} session={s} />;
}
