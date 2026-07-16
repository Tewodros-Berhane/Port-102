import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { ProductivityView } from "../_components/ProductivityView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <ProductivityView session={session} />;
}
