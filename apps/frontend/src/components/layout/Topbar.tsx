"use client";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/features/notifications/use-unread-count";
import { hasPermission } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import type { Session } from "@/types/auth.types";
import { SidebarContent } from "./Sidebar";

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
export function Topbar({ session }: { session: Session }) {
  const router = useRouter(); const pathname = usePathname(); const [busy, setBusy] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const canRead = hasPermission(session.permissions, "notifications.read"); const unread = useUnreadCount(canRead); const page = pathname === routes.dashboard ? "Dashboard" : "Workspace";
  async function logout() { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.replace(routes.login); router.refresh(); }
  return <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu/></Button></SheetTrigger><SheetContent side="left" className="p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Port-102 management navigation</SheetDescription><SidebarContent session={session} onNavigate={() => setMobileOpen(false)}/></SheetContent></Sheet><div className="min-w-0"><div className="flex items-center gap-2 text-xs text-foreground-subtle"><span>Port-102</span><span aria-hidden>/</span></div><p className="truncate text-sm font-semibold text-foreground">{page}</p></div></div><div className="flex items-center gap-1 sm:gap-2"><ThemeToggle/>{canRead && <Button variant="ghost" size="icon" className="relative" aria-label={`${unread.data?.count ?? 0} unread notifications`}><Bell/>{(unread.data?.count ?? 0) > 0 && <span className="absolute right-1 top-1 grid min-w-3.5 place-items-center rounded-full bg-destructive px-1 text-[8px] font-bold leading-3.5 text-white">{unread.data!.count > 99 ? "99+" : unread.data!.count}</span>}</Button>}<div className="mx-1 hidden h-6 w-px bg-border-subtle sm:block"/><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2"><Avatar><AvatarFallback>{initials(session.fullName)}</AvatarFallback></Avatar><div className="hidden min-w-0 text-left lg:block"><p className="max-w-36 truncate text-xs font-semibold text-foreground">{session.fullName}</p><p className="max-w-36 truncate text-[10px] text-foreground-subtle">{session.role.name}</p></div><ChevronDown className="hidden size-3.5 text-foreground-subtle lg:block"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel><span className="block text-sm text-foreground">{session.fullName}</span><span className="mt-0.5 block truncate font-normal text-foreground-subtle">{session.email}</span></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onSelect={logout} disabled={busy} className="text-destructive-foreground focus:bg-destructive-subtle"><LogOut/>{busy ? "Signing out…" : "Sign out"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header>;
}
