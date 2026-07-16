"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BedDouble, DoorOpen, LogIn, LogOut } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useFrontDesk } from "../_hooks/use-front-desk";
import type { Arrival, StayQueueItem } from "../_types/front-desk.types";

const guestName = (guest: { firstName: string; lastName: string }) =>
  `${guest.firstName} ${guest.lastName}`;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const statusTone = (status: string) =>
  status === "ACTIVE" || status === "CONFIRMED"
    ? ("success" as const)
    : ("neutral" as const);

export function FrontDeskView({ session }: { session: Session }) {
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date") ?? new Date().toISOString().slice(0, 10);
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? 1);
  const allowed = hasAnyPermission(session.permissions, [
    "arrivals.read",
    "departures.read",
    "in_house_guests.read",
  ]);
  const queries = useFrontDesk(
    { date, search: search || undefined, page, limit: 10 },
    allowed,
  );
  const setParams = (values: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      next.set(key, String(value)),
    );
    router.replace(`/front-desk?${next}`);
  };
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  const arrivalColumns: DataColumn<Arrival>[] = [
    {
      key: "reservation",
      label: "Reservation",
      render: (row) => (
        <Link
          className="font-medium text-primary hover:underline"
          href={`/reservations/${row.id}`}
        >
          {row.reservationNumber}
        </Link>
      ),
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => (
        <div>
          <p className="font-medium">{guestName(row.guest)}</p>
          <p className="text-xs text-foreground-muted">
            {row.guest.phone ?? row.guest.email ?? "No contact"}
          </p>
        </div>
      ),
    },
    {
      key: "rooms",
      label: "Room",
      render: (row) =>
        row.rooms
          .map((room) => room.room?.roomNumber ?? room.roomType.name)
          .join(", "),
    },
    {
      key: "arrival",
      label: "Arrival",
      render: (row) => dateTime(row.checkInDate),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status.replaceAll("_", " ")}
          tone={statusTone(row.status)}
        />
      ),
    },
  ];
  const stayColumns: DataColumn<StayQueueItem>[] = [
    {
      key: "stay",
      label: "Stay",
      render: (row) => (
        <Link
          className="font-medium text-primary hover:underline"
          href={`/stays/${row.id}`}
        >
          {row.stayNumber}
        </Link>
      ),
    },
    { key: "guest", label: "Guest", render: (row) => guestName(row.guest) },
    {
      key: "room",
      label: "Current room",
      render: (row) =>
        row.currentRooms.map((item) => item.room.roomNumber).join(", ") ||
        "Unassigned",
    },
    {
      key: "departure",
      label: "Expected checkout",
      render: (row) => dateTime(row.expectedCheckOutDate),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge label={row.status} tone={statusTone(row.status)} />
      ),
    },
  ];
  const loading =
    queries.dashboard.isPending ||
    queries.arrivals.isPending ||
    queries.departures.isPending ||
    queries.inHouse.isPending;
  const failed =
    queries.dashboard.error ??
    queries.arrivals.error ??
    queries.departures.error ??
    queries.inHouse.error;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operations"
        title="Front desk"
        description="Today’s arrivals, departures, in-house guests, and room readiness."
        actions={
          <Button asChild>
            <Link href="/reservations?create=1">New reservation</Link>
          </Button>
        }
      />
      <div className="mt-5 flex flex-col gap-3 rounded-md border bg-surface p-3 sm:flex-row">
        <Input
          aria-label="Operational date"
          type="date"
          value={date}
          onChange={(event) => setParams({ date: event.target.value, page: 1 })}
          className="sm:w-44"
        />
        <LiveSearchInput
          key={search}
          aria-label="Search front desk queues"
          placeholder="Search guest, reservation, stay, or room"
          value={search}
          onSearch={(value) => setParams({ search: value, page: 1 })}
        />
      </div>
      {failed && <QueryErrorState error={failed} />}
      {loading ? (
        <Skeleton className="mt-5 h-80" />
      ) : (
        <>
          {queries.dashboard.data && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Arrivals"
                value={queries.dashboard.data.arrivalsToday}
                icon={<LogIn className="size-4" />}
              />
              <StatCard
                label="Departures"
                value={queries.dashboard.data.departuresToday}
                icon={<LogOut className="size-4" />}
              />
              <StatCard
                label="In house"
                value={queries.dashboard.data.inHouseGuests}
                icon={<DoorOpen className="size-4" />}
              />
              <StatCard
                label="Ready rooms"
                value={queries.dashboard.data.availablePhysicalRooms}
                detail={`${queries.dashboard.data.dirtyRooms} dirty · ${queries.dashboard.data.outOfOrderRooms} unavailable`}
                icon={<BedDouble className="size-4" />}
              />
            </div>
          )}
          <Queue title="Arrivals queue">
            <DataTable
              rows={queries.arrivals.data?.items ?? []}
              columns={arrivalColumns}
              getKey={(row) => row.id}
              emptyTitle="No arrivals for this date"
            />
          </Queue>
          <Queue title="Departures queue">
            <DataTable
              rows={queries.departures.data?.items ?? []}
              columns={stayColumns}
              getKey={(row) => row.id}
              emptyTitle="No departures for this date"
            />
          </Queue>
          <Queue title="In-house guests">
            <DataTable
              rows={queries.inHouse.data?.items ?? []}
              columns={stayColumns}
              getKey={(row) => row.id}
              emptyTitle="No guests currently in house"
            />
          </Queue>
          <PaginationControls
            page={page}
            totalPages={Math.max(
              queries.arrivals.data?.pagination.totalPages ?? 1,
              queries.departures.data?.pagination.totalPages ?? 1,
              queries.inHouse.data?.pagination.totalPages ?? 1,
            )}
            onPage={(value) => setParams({ page: value })}
          />
        </>
      )}
    </PageContainer>
  );
}
function Queue({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
