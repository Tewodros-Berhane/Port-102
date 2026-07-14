"use client";
import { hasAnyPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { usePropertySettings } from "@/features/property/use-property-settings";
import { LoadingState } from "@/components/feedback/LoadingState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
export function DashboardView({ session }: { session: Session }) {
  const canRead = hasAnyPermission(session.permissions, ["hotel.profile.read", "hotel.settings.read"]); const property = usePropertySettings(canRead);
  return <div className="dashboard"><div className="page-heading"><p className="eyebrow">Dashboard</p><h1>Good to see you, {session.fullName.split(" ")[0]}.</h1><p>Here is your secure hotel operations workspace.</p></div><section className="welcome-panel"><div><p className="eyebrow">Current property</p>{!canRead ? <h2>Property workspace</h2> : property.isPending ? <LoadingState label="Loading property…"/> : property.isError ? <QueryErrorState/> : <><h2>{property.data.name}</h2><p>{property.data.code ? `${property.data.code} · ` : ""}{property.data.timezone}</p></>} </div><div className="status-pill"><span/>System ready</div></section><section className="foundation-grid"><article><span>01</span><h3>Secure session</h3><p>Your identity and permissions are verified by the Port-102 API.</p></article><article><span>02</span><h3>Property aware</h3><p>Dates and currency are ready to follow the property configuration.</p></article><article><span>03</span><h3>Operations next</h3><p>Live management metrics will arrive from reporting APIs in the next phase.</p></article></section></div>;
}
