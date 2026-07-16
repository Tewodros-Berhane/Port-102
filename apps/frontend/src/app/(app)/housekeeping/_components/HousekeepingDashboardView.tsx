"use client";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useDashboard } from "../_hooks/use-housekeeping";
export function HousekeepingDashboardView({ session }: { session: Session }) {
  const params = useSearchParams();
  const router = useRouter();
  const allowed = hasPermission(
    session.permissions,
    "housekeeping.dashboard.read",
  );
  const date = params.get("date") || new Date().toISOString().slice(0, 10);
  const query = useDashboard(date, allowed);
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operations"
        title="Housekeeping"
        description="Current cleaning workload, room readiness, and work requiring attention."
        actions={
          <Button asChild variant="secondary">
            <Link href="/housekeeping/tasks">View tasks</Link>
          </Button>
        }
      />
      <Input
        aria-label="Business date"
        className="mt-5 w-48"
        type="date"
        value={date}
        onChange={(e) => router.replace(`/housekeeping?date=${e.target.value}`)}
      />
      {query.error && <QueryErrorState error={query.error} />}
      {query.isPending ? (
        <Skeleton className="mt-5 h-64" />
      ) : (
        query.data && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Pending"
                value={query.data.pendingTasks}
                icon={<ClipboardList />}
              />
              <StatCard
                label="In progress"
                value={query.data.inProgressTasks}
                detail={`${query.data.assignedTasks} assigned`}
                icon={<DoorOpen />}
              />
              <StatCard
                label="Awaiting inspection"
                value={query.data.inspectionPendingTasks}
                detail={`${query.data.rejectedTasksToday} rejected today`}
                icon={<CheckCircle2 />}
              />
              <StatCard
                label="Urgent work"
                value={query.data.urgentTasks}
                detail={`${query.data.openIssues} open issues`}
                icon={<AlertTriangle />}
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Dirty rooms" value={query.data.dirtyRooms} />
              <StatCard label="Clean rooms" value={query.data.cleanRooms} />
              <StatCard
                label="Inspected rooms"
                value={query.data.inspectedRooms}
                detail={`${query.data.roomsOutOfOrder} out of order`}
              />
            </div>
          </>
        )
      )}
    </PageContainer>
  );
}
