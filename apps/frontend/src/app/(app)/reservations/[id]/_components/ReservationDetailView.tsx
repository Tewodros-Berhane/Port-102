"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  addReservationRoom,
  cancelReservation,
  checkInReservation,
  confirmReservation,
  getReservation,
  listAvailableRooms,
  searchAvailability,
  removeReservationRoom,
  updateReservation,
} from "../../_services/reservations.service";
import type { ReservationRoom } from "../../../front-desk/_types/front-desk.types";
export function ReservationDetailView({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const read = hasPermission(session.permissions, "reservations.read");
  const query = useQuery({
    queryKey: ["reservations", "detail", id],
    queryFn: () => getReservation(id),
    enabled: read,
  });
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["reservations"] });
    client.invalidateQueries({ queryKey: ["front-desk"] });
  };
  const action = useMutation({
    mutationFn: async (kind: "confirm" | "cancel" | "check-in") =>
      kind === "confirm"
        ? confirmReservation(id)
        : kind === "cancel"
          ? cancelReservation(id, reason)
          : checkInReservation(id, {}),
    onSuccess: (data, kind) => {
      invalidate();
      if (
        kind === "check-in" &&
        data &&
        typeof data === "object" &&
        "id" in data
      )
        window.location.href = `/stays/${String(data.id)}`;
    },
  });
  const update = useMutation({
    mutationFn: (payload: Parameters<typeof updateReservation>[1]) =>
      updateReservation(id, payload),
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (lineId: number) => removeReservationRoom(id, lineId),
    onSuccess: invalidate,
  });
  if (!read)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  if (query.isPending)
    return (
      <PageContainer>
        <Skeleton className="h-80" />
      </PageContainer>
    );
  if (query.isError)
    return (
      <PageContainer>
        <QueryErrorState error={query.error} />
      </PageContainer>
    );
  const r = query.data;
  const canEdit =
    hasPermission(session.permissions, "reservations.update") &&
    ["DRAFT", "CONFIRMED"].includes(r.status);
  const roomColumns: DataColumn<ReservationRoom>[] = [
    {
      key: "type",
      label: "Room type",
      render: (x) => (
        <div>
          <p>{x.roomType.name}</p>
          <p className="text-xs text-foreground-muted">{x.roomType.code}</p>
        </div>
      ),
    },
    {
      key: "room",
      label: "Exact room",
      render: (x) => x.room?.roomNumber ?? "Assign at check-in",
    },
    {
      key: "rate",
      label: "Nightly rate",
      render: (x) => x.rate ?? x.roomType.baseRate,
    },
    {
      key: "status",
      label: "Status",
      render: (x) => <StatusBadge label={x.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (x) =>
        canEdit && x.status !== "CANCELLED" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm("Remove this reserved room?")) remove.mutate(x.id);
            }}
          >
            Remove
          </Button>
        ) : null,
    },
  ];
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Reservation"
        title={r.reservationNumber}
        description={`${r.guest.firstName} ${r.guest.lastName} · ${r.source.replaceAll("_", " ")}`}
        actions={
          <>
            <StatusBadge label={r.status.replaceAll("_", " ")} />
            <Button variant="outline" asChild>
              <Link href="/reservations">Back</Link>
            </Button>
          </>
        }
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {r.status === "DRAFT" &&
          hasPermission(session.permissions, "reservations.confirm") && (
            <Button
              disabled={action.isPending}
              onClick={() => action.mutate("confirm")}
            >
              Confirm reservation
            </Button>
          )}
        {r.status === "CONFIRMED" &&
          hasPermission(session.permissions, "check_in.execute") && (
            <Button
              disabled={action.isPending}
              onClick={() => action.mutate("check-in")}
            >
              Check in
            </Button>
          )}
        {["DRAFT", "CONFIRMED"].includes(r.status) &&
          hasPermission(session.permissions, "reservations.cancel") && (
            <>
              <Input
                className="w-64"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Cancellation reason"
              />
              <Button
                variant="destructive"
                disabled={action.isPending || !reason.trim()}
                onClick={() => {
                  if (confirm("Cancel this reservation?"))
                    action.mutate("cancel");
                }}
              >
                Cancel
              </Button>
            </>
          )}
        {canEdit && (
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close editor" : "Edit reservation"}
          </Button>
        )}
      </div>
      {Boolean(action.error || remove.error) && (
        <QueryErrorState error={action.error ?? remove.error} />
      )}{" "}
      {editing && (
        <EditReservation
          reservation={r}
          pending={update.isPending}
          error={update.error}
          onSubmit={(p) => update.mutate(p)}
        />
      )}
      <section className="mt-7 grid gap-4 rounded-md border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Guest"
          value={`${r.guest.firstName} ${r.guest.lastName}`}
        />
        <Field
          label="Check-in"
          value={new Date(r.checkInDate).toLocaleString()}
        />
        <Field
          label="Checkout"
          value={new Date(r.checkOutDate).toLocaleString()}
        />
        <Field
          label="Occupancy"
          value={`${r.adults} adults · ${r.children} children`}
        />
        <Field
          label="Contact"
          value={r.guest.phone ?? r.guest.email ?? "Not recorded"}
        />
        <Field label="Special requests" value={r.specialRequests ?? "None"} />
        <Field label="Internal notes" value={r.internalNotes ?? "None"} />
        <Field
          label="Cancellation"
          value={r.cancellationReason ?? "Not cancelled"}
        />
      </section>
      <section className="mt-7">
        <h2 className="mb-3 text-base font-semibold">Reserved rooms</h2>
        <DataTable
          rows={r.rooms}
          columns={roomColumns}
          getKey={(x) => x.id}
          emptyTitle="No reservation rooms"
        />
        {canEdit && (
          <AddRoom
            reservationId={id}
            checkInDate={r.checkInDate.slice(0, 10)}
            checkOutDate={r.checkOutDate.slice(0, 10)}
            onSuccess={invalidate}
          />
        )}
      </section>
    </PageContainer>
  );
}
function EditReservation({
  reservation: r,
  pending,
  error,
  onSubmit,
}: {
  reservation: Awaited<ReturnType<typeof getReservation>>;
  pending: boolean;
  error?: unknown;
  onSubmit: (p: Parameters<typeof updateReservation>[1]) => void;
}) {
  const [checkInDate, setIn] = useState(r.checkInDate.slice(0, 10)),
    [checkOutDate, setOut] = useState(r.checkOutDate.slice(0, 10)),
    [adults, setAdults] = useState(r.adults),
    [children, setChildren] = useState(r.children),
    [specialRequests, setSpecial] = useState(r.specialRequests ?? ""),
    [internalNotes, setNotes] = useState(r.internalNotes ?? "");
  return (
    <form
      className="mt-5 grid gap-3 rounded-md border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          checkInDate,
          checkOutDate,
          adults,
          children,
          specialRequests,
          internalNotes,
        });
      }}
    >
      <Input
        type="date"
        value={checkInDate}
        onChange={(e) => setIn(e.target.value)}
      />
      <Input
        type="date"
        value={checkOutDate}
        onChange={(e) => setOut(e.target.value)}
      />
      <Input
        type="number"
        min={1}
        value={adults}
        onChange={(e) => setAdults(Number(e.target.value))}
      />
      <Input
        type="number"
        min={0}
        value={children}
        onChange={(e) => setChildren(Number(e.target.value))}
      />
      <Input
        value={specialRequests}
        onChange={(e) => setSpecial(e.target.value)}
        placeholder="Special requests"
      />
      <Input
        value={internalNotes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Internal notes"
      />
      {Boolean(error) && (
        <div className="lg:col-span-3">
          <QueryErrorState error={error} />
        </div>
      )}
      <Button disabled={pending}>Save changes</Button>
    </form>
  );
}
function AddRoom({
  reservationId,
  checkInDate,
  checkOutDate,
  onSuccess,
}: {
  reservationId: number;
  checkInDate: string;
  checkOutDate: string;
  onSuccess: () => void;
}) {
  const [roomTypeId, setType] = useState<number | null>(null),
    [roomId, setRoom] = useState("");
  const roomTypes = useQuery({
    queryKey: [
      "reservations",
      "availability",
      "room-types",
      checkInDate,
      checkOutDate,
    ],
    queryFn: () => searchAvailability({ checkInDate, checkOutDate }),
  });
  const availability = useQuery({
    queryKey: [
      "reservations",
      "availability",
      "rooms",
      checkInDate,
      checkOutDate,
      roomTypeId,
    ],
    queryFn: () =>
      listAvailableRooms({
        checkInDate,
        checkOutDate,
        roomTypeId: roomTypeId ?? undefined,
      }),
    enabled: roomTypeId !== null,
  });
  const mutation = useMutation({
    mutationFn: () =>
      addReservationRoom(reservationId, {
        roomTypeId: roomTypeId!,
        roomId: roomId ? Number(roomId) : undefined,
      }),
    onSuccess: () => {
      setRoom("");
      onSuccess();
    },
  });
  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-md border p-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="min-w-56">
        <Label>Room type</Label>
        <SearchableSelect
          value={roomTypeId}
          onChange={(value) => {
            setType(value);
            setRoom("");
          }}
          placeholder="Select room type"
          searchPlaceholder="Search available room types"
          disabled={roomTypes.isPending}
          options={(roomTypes.data?.roomTypes ?? []).map((item) => ({
            value: item.roomType.id,
            label: item.roomType.name,
            description: `${item.availableRooms} available`,
          }))}
        />
      </div>
      <div className="flex-1">
        <Label>Available exact room (optional)</Label>
        <SearchableSelect
          value={roomId ? Number(roomId) : null}
          onChange={(value) => setRoom(value ? String(value) : "")}
          placeholder="Assign later"
          searchPlaceholder="Search available rooms"
          disabled={!roomTypeId || availability.isPending}
          options={(availability.data?.rooms ?? []).map((room) => ({
            value: room.id,
            label: room.roomNumber,
            description: room.displayName ?? undefined,
          }))}
        />
      </div>
      <Button className="self-end" disabled={mutation.isPending || !roomTypeId}>
        Add room
      </Button>
      {mutation.isError && <QueryErrorState error={mutation.error} />}
    </form>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
