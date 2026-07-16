import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { routes } from "@/lib/routes";
import { TaskListView } from "../_components/TaskListView";
export default async function Page() {
  const session = await getSession();
  if (!session) redirect(routes.login);
  return <TaskListView assigned session={session} />;
}
