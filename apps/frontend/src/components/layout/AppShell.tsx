import type { Session } from "@/types/auth.types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) { return <div className="app-shell"><Sidebar/><div className="workspace"><Topbar session={session}/><main className="content">{children}</main></div></div>; }
