import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
export default async function Home() { redirect((await getSession()) ? routes.dashboard : routes.login); }
