import type { Session } from "@/types/auth.types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar session={session} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
