import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getDefaultAuthenticatedRoute, routes } from "@/lib/routes";
export default async function Home() {
  const session = await getSession();
  redirect(
    session ? getDefaultAuthenticatedRoute(session.permissions) : routes.login,
  );
}
