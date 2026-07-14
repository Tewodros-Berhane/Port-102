import Link from "next/link";
import { routes } from "@/lib/routes";
export function Sidebar() { return <aside className="sidebar"><Link href={routes.dashboard} className="sidebar-brand"><span className="brand-mark small">P102</span><span>Port-102</span></Link><nav aria-label="Main navigation"><Link href={routes.dashboard} className="nav-item active"><span>⌂</span>Dashboard</Link></nav><div className="sidebar-note">Hotel operations<br/><span>Phase 1 foundation</span></div></aside>; }
