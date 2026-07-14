"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hasPermission } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import type { Session } from "@/types/auth.types";
import { useUnreadCount } from "@/features/notifications/use-unread-count";

export function Topbar({ session }: { session: Session }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const canRead = hasPermission(session.permissions, "notifications.read"); const unread = useUnreadCount(canRead);
  async function logout() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.replace(routes.login); router.refresh(); }
  return <header className="topbar"><div><p className="eyebrow">Management workspace</p><strong>{session.role.name}</strong></div><div className="top-actions">{canRead && <div className="notification" aria-label={`${unread.data?.count ?? 0} unread notifications`}>♢{(unread.data?.count ?? 0) > 0 && <span>{unread.data!.count > 99 ? "99+" : unread.data!.count}</span>}</div>}<div className="user-summary"><span>{session.fullName}</span><small>{session.email}</small></div><button className="button-ghost" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button></div></header>;
}
