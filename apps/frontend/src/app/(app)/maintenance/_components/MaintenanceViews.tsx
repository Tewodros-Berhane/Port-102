"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  useAsset,
  useAssets,
  useMaintenanceDashboard,
  useMaintenanceMutation,
  usePlan,
  usePlans,
  useTicket,
  useTickets,
} from "../_hooks/use-maintenance";
import { maintenanceApi as api } from "../_services/maintenance.service";
import type {
  Asset,
  Plan,
  Ticket,
  TicketStatus,
} from "../_types/maintenance.types";
import { CreateTicketPanel } from "./CreateTicketPanel";
import { AssignedTicketActions } from "./AssignedTicketActions";
const tone = (s: string) =>
  s === "APPROVED" || s === "ACTIVE"
    ? ("success" as const)
    : s === "CANCELLED" || s === "REJECTED" || s === "RETIRED"
      ? ("destructive" as const)
      : s === "URGENT" || s === "IN_PROGRESS" || s === "UNDER_MAINTENANCE"
        ? ("warning" as const)
        : ("neutral" as const);
const status = (value: string) => (
  <StatusBadge label={value.replaceAll("_", " ")} tone={tone(value)} />
);
export function MaintenanceDashboard({ session }: { session: Session }) {
  const ok = hasPermission(session.permissions, "maintenance.dashboard.read"),
    q = useMaintenanceDashboard(ok);
  if (!ok) return <Denied />;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        description="Critical work, room impact, and preventive attention."
      />
      {q.error && <QueryErrorState error={q.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-64" />
      ) : (
        q.data && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Urgent tickets" value={q.data.urgentTickets} />
            <StatCard
              label="Open workload"
              value={q.data.openTickets}
              detail={`${q.data.assignedTickets} assigned · ${q.data.inProgressTickets} in progress`}
            />
            <StatCard
              label="Awaiting approval"
              value={q.data.completedPendingApproval}
              detail={`${q.data.rejectedToday} rejected today`}
            />
            <StatCard
              label="Room impact"
              value={q.data.outOfOrderRooms}
              detail={`${q.data.underMaintenanceRooms} under maintenance`}
            />
            <StatCard
              label="Assets under maintenance"
              value={q.data.assetsUnderMaintenance}
            />
            <StatCard
              label="Overdue preventive plans"
              value={q.data.overduePreventivePlans}
            />
          </div>
        )
      )}
    </PageContainer>
  );
}
const ticketColumns: DataColumn<Ticket>[] = [
  {
    key: "ticket",
    label: "Ticket",
    render: (r) => (
      <Link
        className="font-medium text-primary hover:underline"
        href={`/maintenance/tickets/${r.id}`}
      >
        {r.ticketNumber}
      </Link>
    ),
  },
  { key: "title", label: "Title", render: (r) => r.title },
  {
    key: "location",
    label: "Location",
    render: (r) =>
      r.room?.displayName || r.room?.roomNumber || r.asset?.name || "General",
  },
  { key: "priority", label: "Priority", render: (r) => status(r.priority) },
  { key: "status", label: "Status", render: (r) => status(r.status) },
  {
    key: "assigned",
    label: "Technician",
    render: (r) => r.assignedTo?.fullName || "Unassigned",
  },
];
export function TicketList({
  session,
  assigned = false,
}: {
  session: Session;
  assigned?: boolean;
}) {
  const p = useSearchParams(),
    router = useRouter(),
    page = Number(p.get("page") || 1),
    search = p.get("search") || "",
    ticketStatus = (p.get("status") || undefined) as TicketStatus | undefined,
    ok = assigned
      ? hasAnyPermission(session.permissions, [
          "maintenance.tickets.read",
          "maintenance.tickets.read.assigned",
        ])
      : hasPermission(session.permissions, "maintenance.tickets.read"),
    q = useTickets(
      { page, limit: 20, search: search || undefined, status: ticketStatus },
      assigned,
      ok,
    );
  const columns = hasPermission(session.permissions, "maintenance.tickets.read")
    ? ticketColumns
    : ticketColumns.map((column) =>
        column.key === "ticket"
          ? {
              ...column,
              render: (row: Ticket) => (
                <span className="font-medium">{row.ticketNumber}</span>
              ),
            }
          : column,
      );
  if (assigned)
    columns.push({
      key: "actions",
      label: "Next action",
      render: (row) => <AssignedTicketActions ticket={row} session={session} />,
    });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(p);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    router.replace(
      `${assigned ? "/maintenance/assigned" : "/maintenance/tickets"}?${next}`,
    );
  };
  if (!ok) return <Denied />;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Maintenance"
        title={assigned ? "My tickets" : "Tickets"}
        description={
          assigned
            ? "Maintenance work assigned to you."
            : "Hotel maintenance workload and operational status."
        }
        actions={
          !assigned &&
          hasPermission(session.permissions, "maintenance.tickets.create") ? (
            <CreateTicketPanel />
          ) : undefined
        }
      />
      <div className="mt-5 grid gap-3 rounded-md border bg-surface p-3 sm:grid-cols-[1fr_220px]">
        <LiveSearchInput
          key={search}
          value={search}
          onSearch={(v) => set("search", v)}
          placeholder="Search ticket, title, room, or asset"
        />
        <select
          className="h-10 rounded-md border bg-surface px-3"
          value={ticketStatus || ""}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {[
            "OPEN",
            "ASSIGNED",
            "IN_PROGRESS",
            "COMPLETED",
            "APPROVED",
            "REJECTED",
            "CANCELLED",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      {q.error && <QueryErrorState error={q.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={q.data?.items ?? []}
            columns={columns}
            getKey={(r) => r.id}
            emptyTitle={
              assigned
                ? "No maintenance tickets are assigned to you"
                : "No maintenance tickets found"
            }
          />
          <PaginationControls
            page={page}
            totalPages={q.data?.pagination.totalPages ?? 1}
            onPage={(v) => set("page", String(v))}
          />
        </div>
      )}
    </PageContainer>
  );
}
export function TicketDetail({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const ok = hasPermission(session.permissions, "maintenance.tickets.read"),
    q = useTicket(id, ok),
    [text, setText] = useState(""),
    [url, setUrl] = useState("");
  const start = useMaintenanceMutation(
      () => api.start(id, text || undefined, true),
      "Maintenance ticket started.",
    ),
    complete = useMaintenanceMutation(
      () => api.complete(id, text || undefined),
      "Maintenance ticket completed.",
    ),
    approve = useMaintenanceMutation(
      () => api.approve(id, text || undefined, false),
      "Maintenance ticket approved.",
    ),
    reject = useMaintenanceMutation(
      () => api.reject(id, text),
      "Maintenance ticket rejected.",
    ),
    cancel = useMaintenanceMutation(
      () => api.cancel(id, text),
      "Maintenance ticket cancelled.",
    ),
    note = useMaintenanceMutation(
      () => api.note(id, text),
      "Ticket note added.",
    ),
    photo = useMaintenanceMutation(
      () => api.photo(id, url, text || undefined),
      "Photo metadata added.",
    );
  if (!ok) return <Denied />;
  if (q.error)
    return (
      <PageContainer>
        <QueryErrorState error={q.error} />
      </PageContainer>
    );
  if (!q.data)
    return (
      <PageContainer>
        <Skeleton className="h-80" />
      </PageContainer>
    );
  const t = q.data,
    mine = t.assignedToUserId === session.id;
  const canStart =
      t.status === "ASSIGNED" &&
      (hasPermission(session.permissions, "maintenance.tickets.start") ||
        (mine &&
          hasPermission(
            session.permissions,
            "maintenance.tickets.start.assigned",
          ))),
    canComplete =
      ["IN_PROGRESS", "REJECTED"].includes(t.status) &&
      (hasPermission(session.permissions, "maintenance.tickets.complete") ||
        (mine &&
          hasPermission(
            session.permissions,
            "maintenance.tickets.complete.assigned",
          ))),
    canApprove =
      t.status === "COMPLETED" &&
      hasPermission(session.permissions, "maintenance.tickets.approve"),
    canUpdate =
      hasPermission(session.permissions, "maintenance.tickets.update") ||
      (mine &&
        hasPermission(
          session.permissions,
          "maintenance.tickets.update.assigned",
        ));
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Maintenance ticket"
        title={t.ticketNumber}
        description={t.title}
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-md border bg-surface p-5">
          <div className="flex gap-2">
            {status(t.status)}
            {status(t.priority)}
          </div>
          <p className="mt-4 text-sm text-foreground-muted">
            {t.description || "No description."}
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <D
              label="Location"
              value={
                t.room?.displayName ||
                t.room?.roomNumber ||
                t.asset?.name ||
                "General"
              }
            />
            <D label="Issue type" value={t.issueType.replaceAll("_", " ")} />
            <D
              label="Assigned technician"
              value={t.assignedTo?.fullName || "Unassigned"}
            />
            <D
              label="Source"
              value={
                t.sourceType
                  ? `${t.source} · ${t.sourceType} ${t.sourceId ?? ""}`
                  : t.source
              }
            />
          </dl>
          <h2 className="mt-6 font-semibold">Notes</h2>
          {t.notes.map((n) => (
            <div key={n.id} className="mt-2 rounded-md bg-muted p-3 text-sm">
              <p>{n.note}</p>
              <p className="mt-1 text-xs text-foreground-muted">
                {n.author?.fullName || "User"} ·{" "}
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          <h2 className="mt-6 font-semibold">Photo metadata</h2>
          {t.photos.map((p) => (
            <a
              key={p.id}
              className="mt-2 block text-sm text-primary hover:underline"
              href={p.url}
              target="_blank"
              rel="noreferrer"
            >
              {p.description || p.url}
            </a>
          ))}
        </section>
        <div className="space-y-4">
          <section className="rounded-md border bg-surface p-4">
            <h2 className="font-semibold">Actions</h2>
            <Input
              className="mt-3"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Notes or required reason"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {canStart && (
                <Button
                  loading={start.isPending}
                  onClick={() => start.mutate(undefined)}
                >
                  Start
                </Button>
              )}
              {canComplete && (
                <Button
                  loading={complete.isPending}
                  onClick={() => complete.mutate(undefined)}
                >
                  Complete
                </Button>
              )}
              {canApprove && (
                <>
                  <Button
                    loading={approve.isPending}
                    onClick={() => approve.mutate(undefined)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!text}
                    loading={reject.isPending}
                    onClick={() => reject.mutate(undefined)}
                  >
                    Reject
                  </Button>
                </>
              )}
              {hasPermission(
                session.permissions,
                "maintenance.tickets.update",
              ) &&
                !["APPROVED", "CANCELLED"].includes(t.status) && (
                  <Button
                    variant="destructive"
                    disabled={!text}
                    loading={cancel.isPending}
                    onClick={() =>
                      confirm("Cancel ticket?") && cancel.mutate(undefined)
                    }
                  >
                    Cancel
                  </Button>
                )}
              {canUpdate && (
                <Button
                  variant="secondary"
                  disabled={!text}
                  loading={note.isPending}
                  onClick={() => note.mutate(undefined)}
                >
                  Add note
                </Button>
              )}
            </div>
          </section>
          {hasPermission(session.permissions, "maintenance.photos.upload") && (
            <section className="rounded-md border bg-surface p-4">
              <h2 className="font-semibold">Add photo URL</h2>
              <Input
                className="mt-3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
              <Button
                className="mt-3"
                disabled={!url}
                loading={photo.isPending}
                onClick={() => photo.mutate(undefined)}
              >
                Add metadata
              </Button>
            </section>
          )}
          <RoomControls ticket={t} session={session} />
        </div>
      </div>
    </PageContainer>
  );
}
function RoomControls({
  ticket,
  session,
}: {
  ticket: Ticket;
  session: Session;
}) {
  const act = useMaintenanceMutation(
    (kind: "out" | "under" | "clear") =>
      kind === "out"
        ? api.markOut(ticket.roomId!)
        : kind === "under"
          ? api.markUnder(ticket.roomId!)
          : api.clearRoom(ticket.roomId!),
    "Room maintenance status updated.",
  );
  if (!ticket.roomId) return null;
  return (
    <section className="rounded-md border bg-surface p-4">
      <h2 className="font-semibold">Room maintenance</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {hasPermission(session.permissions, "rooms.out_of_order.mark") && (
          <>
            <Button
              variant="destructive"
              onClick={() =>
                confirm("Mark room out of order?") && act.mutate("out")
              }
            >
              Out of order
            </Button>
            <Button variant="secondary" onClick={() => act.mutate("under")}>
              Under maintenance
            </Button>
          </>
        )}
        {hasPermission(session.permissions, "rooms.out_of_order.clear") && (
          <Button
            onClick={() =>
              confirm("Clear maintenance status?") && act.mutate("clear")
            }
          >
            Clear
          </Button>
        )}
      </div>
    </section>
  );
}

const assetColumns: DataColumn<Asset>[] = [
  {
    key: "asset",
    label: "Asset",
    render: (r) => (
      <Link
        className="font-medium text-primary hover:underline"
        href={`/maintenance/assets/${r.id}`}
      >
        {r.assetNumber}
      </Link>
    ),
  },
  { key: "name", label: "Name", render: (r) => r.name },
  { key: "category", label: "Category", render: (r) => r.category || "—" },
  {
    key: "location",
    label: "Location",
    render: (r) => r.room?.displayName || r.location || "—",
  },
  { key: "status", label: "Status", render: (r) => status(r.status) },
];
export function AssetsView({ session }: { session: Session }) {
  const p = useSearchParams(),
    router = useRouter(),
    page = Number(p.get("page") || 1),
    search = p.get("search") || "",
    ok = hasPermission(session.permissions, "assets.read"),
    q = useAssets({ page, limit: 20, search: search || undefined }, ok);
  if (!ok) return <Denied />;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Maintenance"
        title="Assets"
        description="Maintainable equipment and its operational state."
      />
      <div className="mt-5">
        <LiveSearchInput
          key={search}
          value={search}
          onSearch={(v) =>
            router.replace(
              `/maintenance/assets?search=${encodeURIComponent(v)}&page=1`,
            )
          }
          placeholder="Search asset number, name, category, or location"
        />
      </div>
      {q.error && <QueryErrorState error={q.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={q.data?.items ?? []}
            columns={assetColumns}
            getKey={(r) => r.id}
            emptyTitle="No assets found"
          />
          <PaginationControls
            page={page}
            totalPages={q.data?.pagination.totalPages ?? 1}
            onPage={(v) =>
              router.replace(
                `/maintenance/assets?search=${encodeURIComponent(search)}&page=${v}`,
              )
            }
          />
        </div>
      )}
    </PageContainer>
  );
}
export function AssetDetail({ id, session }: { id: number; session: Session }) {
  const ok = hasPermission(session.permissions, "assets.read"),
    q = useAsset(id, ok),
    deactivate = useMaintenanceMutation(
      () => api.deactivateAsset(id),
      "Asset deactivated.",
    );
  if (!ok) return <Denied />;
  if (q.error)
    return (
      <PageContainer>
        <QueryErrorState error={q.error} />
      </PageContainer>
    );
  if (!q.data)
    return (
      <PageContainer>
        <Skeleton className="h-72" />
      </PageContainer>
    );
  const a = q.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Maintenance asset"
        title={a.assetNumber}
        description={a.name}
      />
      <section className="mt-5 rounded-md border bg-surface p-5">
        <div>{status(a.status)}</div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <D label="Category" value={a.category || "—"} />
          <D
            label="Location"
            value={a.room?.displayName || a.location || "—"}
          />
          <D label="Purchase date" value={a.purchaseDate || "—"} />
          <D label="Warranty until" value={a.warrantyUntil || "—"} />
        </dl>
        {a.description && <p className="mt-4 text-sm">{a.description}</p>}
        {hasPermission(session.permissions, "assets.delete") &&
          a.status === "ACTIVE" && (
            <Button
              className="mt-5"
              variant="destructive"
              loading={deactivate.isPending}
              onClick={() =>
                confirm("Deactivate this asset?") &&
                deactivate.mutate(undefined)
              }
            >
              Deactivate asset
            </Button>
          )}
      </section>
    </PageContainer>
  );
}
const planColumns: DataColumn<Plan>[] = [
  {
    key: "plan",
    label: "Plan",
    render: (r) => (
      <Link
        className="font-medium text-primary hover:underline"
        href={`/maintenance/preventive/${r.id}`}
      >
        {r.planNumber}
      </Link>
    ),
  },
  { key: "title", label: "Title", render: (r) => r.title },
  {
    key: "target",
    label: "Asset / room",
    render: (r) =>
      r.asset?.name || r.room?.displayName || r.room?.roomNumber || "—",
  },
  {
    key: "interval",
    label: "Interval",
    render: (r) => `${r.intervalDays} days`,
  },
  {
    key: "due",
    label: "Next due",
    render: (r) => new Date(r.nextDueDate).toLocaleDateString(),
  },
  { key: "status", label: "Status", render: (r) => status(r.status) },
];
export function PlansView({ session }: { session: Session }) {
  const p = useSearchParams(),
    router = useRouter(),
    page = Number(p.get("page") || 1),
    search = p.get("search") || "",
    ok = hasPermission(session.permissions, "preventive_maintenance.read"),
    q = usePlans({ page, limit: 20, search: search || undefined }, ok);
  if (!ok) return <Denied />;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Maintenance"
        title="Preventive maintenance"
        description="Scheduled plans and due work."
      />
      <div className="mt-5">
        <LiveSearchInput
          key={search}
          value={search}
          onSearch={(v) =>
            router.replace(
              `/maintenance/preventive?search=${encodeURIComponent(v)}&page=1`,
            )
          }
          placeholder="Search plan, asset, or room"
        />
      </div>
      {q.error && <QueryErrorState error={q.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={q.data?.items ?? []}
            columns={planColumns}
            getKey={(r) => r.id}
            emptyTitle="No preventive plans found"
          />
          <PaginationControls
            page={page}
            totalPages={q.data?.pagination.totalPages ?? 1}
            onPage={(v) =>
              router.replace(
                `/maintenance/preventive?search=${encodeURIComponent(search)}&page=${v}`,
              )
            }
          />
        </div>
      )}
    </PageContainer>
  );
}
export function PlanDetail({ id, session }: { id: number; session: Session }) {
  const ok = hasPermission(session.permissions, "preventive_maintenance.read"),
    q = usePlan(id, ok),
    generate = useMaintenanceMutation(
      () => api.generate(id),
      "Maintenance ticket generated.",
    ),
    remove = useMaintenanceMutation(
      () => api.deletePlan(id),
      "Preventive plan cancelled.",
    );
  if (!ok) return <Denied />;
  if (q.error)
    return (
      <PageContainer>
        <QueryErrorState error={q.error} />
      </PageContainer>
    );
  if (!q.data)
    return (
      <PageContainer>
        <Skeleton className="h-72" />
      </PageContainer>
    );
  const p = q.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Preventive plan"
        title={p.planNumber}
        description={p.title}
      />
      <section className="mt-5 rounded-md border bg-surface p-5">
        <div>{status(p.status)}</div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <D
            label="Target"
            value={
              p.asset?.name || p.room?.displayName || p.room?.roomNumber || "—"
            }
          />
          <D label="Interval" value={`${p.intervalDays} days`} />
          <D
            label="Next due"
            value={new Date(p.nextDueDate).toLocaleDateString()}
          />
          <D
            label="Last completed"
            value={
              p.lastCompletedAt
                ? new Date(p.lastCompletedAt).toLocaleDateString()
                : "Never"
            }
          />
        </dl>
        <div className="mt-5 flex gap-2">
          {hasPermission(session.permissions, "maintenance.tickets.create") &&
            p.status === "ACTIVE" && (
              <Button
                loading={generate.isPending}
                onClick={() => generate.mutate(undefined)}
              >
                Generate ticket
              </Button>
            )}
          {hasPermission(
            session.permissions,
            "preventive_maintenance.delete",
          ) &&
            !["COMPLETED", "CANCELLED"].includes(p.status) && (
              <Button
                variant="destructive"
                loading={remove.isPending}
                onClick={() =>
                  confirm("Cancel this preventive plan?") &&
                  remove.mutate(undefined)
                }
              >
                Cancel plan
              </Button>
            )}
        </div>
      </section>
    </PageContainer>
  );
}
function D({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
function Denied() {
  return (
    <PageContainer>
      <PermissionDeniedState />
    </PageContainer>
  );
}
