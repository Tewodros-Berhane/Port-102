"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { PaginationControls } from "@/components/common/PaginationControls";
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
  createReservationSchema,
  type CreateReservationValues,
} from "../_schemas/reservation.schema";
import {
  createReservation,
  getReservations,
  listAvailableRooms,
  searchAvailability,
  searchReservationGuests,
} from "../_services/reservations.service";
import {
  reservationSources,
  reservationStatuses,
  type Reservation,
  type ReservationStatus,
} from "../_types/reservations.types";
const tone = (s: string) =>
  s === "CONFIRMED" || s === "CHECKED_IN"
    ? ("success" as const)
    : s === "CANCELLED" || s === "NO_SHOW"
      ? ("destructive" as const)
      : s === "DRAFT"
        ? ("warning" as const)
        : ("neutral" as const);
export function ReservationsView({ session }: { session: Session }) {
  const router = useRouter(),
    params = useSearchParams(),
    client = useQueryClient();
  const [creating, setCreating] = useState(params.get("create") === "1");
  const page = Number(params.get("page") ?? 1),
    search = params.get("search") ?? "",
    status = (params.get("status") || undefined) as
      | ReservationStatus
      | undefined;
  const read = hasPermission(session.permissions, "reservations.read"),
    canCreate = hasPermission(session.permissions, "reservations.create");
  const query = useQuery({
    queryKey: ["reservations", "list", { page, search, status }],
    queryFn: () =>
      getReservations({ page, limit: 20, search: search || undefined, status }),
    enabled: read,
  });
  const create = useMutation({
    mutationFn: createReservation,
    meta: { successMessage: "Reservation created successfully." },
    onSuccess: (r) => {
      client.invalidateQueries({ queryKey: ["reservations"] });
      client.invalidateQueries({ queryKey: ["front-desk"] });
      router.push(`/reservations/${r.id}`);
    },
  });
  const set = (key: string, value: string | number) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value));
    else next.delete(key);
    router.replace(`/reservations?${next}`);
  };
  const columns: DataColumn<Reservation>[] = [
    {
      key: "reference",
      label: "Reservation",
      render: (r) => (
        <Link
          href={`/reservations/${r.id}`}
          className="font-medium text-primary hover:underline"
        >
          {r.reservationNumber}
        </Link>
      ),
    },
    {
      key: "guest",
      label: "Guest",
      render: (r) => (
        <div>
          <p>
            {r.guest.firstName} {r.guest.lastName}
          </p>
          <p className="text-xs text-foreground-muted">
            {r.guest.phone ?? r.guest.email ?? "No contact"}
          </p>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Stay dates",
      render: (r) => (
        <>
          {new Date(r.checkInDate).toLocaleDateString()} →{" "}
          {new Date(r.checkOutDate).toLocaleDateString()}
        </>
      ),
    },
    {
      key: "rooms",
      label: "Room",
      render: (r) =>
        r.rooms.map((x) => x.room?.roomNumber ?? x.roomType.name).join(", "),
    },
    {
      key: "source",
      label: "Source",
      render: (r) => r.source.replaceAll("_", " "),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge
          label={r.status.replaceAll("_", " ")}
          tone={tone(r.status)}
        />
      ),
    },
  ];
  if (!read)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Front desk"
        title="Reservations"
        description="Server-filtered booking records and reservation actions."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating((v) => !v)}>
              {creating ? "Close form" : "New reservation"}
            </Button>
          ) : undefined
        }
      />
      {creating && (
        <CreateForm
          pending={create.isPending}
          error={create.error}
          onSubmit={(p) => create.mutate(p)}
        />
      )}
      <div className="my-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <LiveSearchInput
          key={search}
          placeholder="Search reservation or guest"
          value={search}
          onSearch={(value) => set("search", value)}
        />
        <select
          className="h-9 rounded-md border bg-surface px-3 text-sm"
          value={status ?? ""}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {reservationStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {query.isPending ? (
        <Skeleton className="h-72" />
      ) : query.isError ? (
        <QueryErrorState error={query.error} />
      ) : (
        <>
          <DataTable
            rows={query.data.items}
            columns={columns}
            getKey={(r) => r.id}
            emptyTitle="No reservations found"
          />
          <PaginationControls
            page={page}
            totalPages={query.data.pagination.totalPages}
            onPage={(v) => set("page", v)}
          />
        </>
      )}
    </PageContainer>
  );
}
function CreateForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error?: unknown;
  onSubmit: (p: Parameters<typeof createReservation>[0]) => void;
}) {
  const [guestSearch, setGuestSearch] = useState("");
  const form = useForm<CreateReservationValues>({
    resolver: zodResolver(
      createReservationSchema,
    ) as Resolver<CreateReservationValues>,
    defaultValues: {
      guestId: 0,
      checkInDate: "",
      checkOutDate: "",
      adults: 1,
      children: 0,
      source: "WALK_IN",
      roomTypeId: 0,
      roomId: "",
      specialRequests: "",
      internalNotes: "",
    },
  });
  const values = useWatch({ control: form.control });
  const guests = useQuery({
    queryKey: ["guests", "select", guestSearch],
    queryFn: () => searchReservationGuests(guestSearch),
    enabled: guestSearch.trim().length >= 2,
  });
  const roomTypes = useQuery({
    queryKey: [
      "reservations",
      "availability",
      values.checkInDate,
      values.checkOutDate,
      values.adults,
      values.children,
    ],
    queryFn: () =>
      searchAvailability({
        checkInDate: values.checkInDate ?? "",
        checkOutDate: values.checkOutDate ?? "",
        adults: Number(values.adults),
        children: Number(values.children),
      }),
    enabled: Boolean(
      values.checkInDate &&
      values.checkOutDate &&
      Date.parse(values.checkOutDate) > Date.parse(values.checkInDate),
    ),
  });
  const availability = useQuery({
    queryKey: [
      "reservations",
      "availability",
      "rooms",
      values.checkInDate,
      values.checkOutDate,
      values.roomTypeId,
    ],
    queryFn: () =>
      listAvailableRooms({
        checkInDate: values.checkInDate ?? "",
        checkOutDate: values.checkOutDate ?? "",
        roomTypeId: Number(values.roomTypeId),
        adults: Number(values.adults),
        children: Number(values.children),
      }),
    enabled: Boolean(
      values.checkInDate &&
      values.checkOutDate &&
      Date.parse(values.checkOutDate) > Date.parse(values.checkInDate) &&
      values.roomTypeId,
    ),
  });
  return (
    <form
      className="my-5 grid gap-3 rounded-md border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={form.handleSubmit((v) =>
        onSubmit({
          guestId: Number(v.guestId),
          checkInDate: v.checkInDate,
          checkOutDate: v.checkOutDate,
          adults: Number(v.adults),
          children: Number(v.children),
          source: v.source,
          specialRequests: v.specialRequests || undefined,
          internalNotes: v.internalNotes || undefined,
          rooms: [
            {
              roomTypeId: Number(v.roomTypeId),
              roomId: v.roomId === "" ? undefined : Number(v.roomId),
            },
          ],
        }),
      )}
    >
      {(
        [
          ["checkInDate", "Check-in", "date"],
          ["checkOutDate", "Checkout", "date"],
          ["adults", "Adults", "number"],
          ["children", "Children", "number"],
        ] as const
      ).map(([name, label, type]) => (
        <div key={name}>
          <Label>{label}</Label>
          <Input type={type} {...form.register(name)} />
          <p className="text-xs text-destructive">
            {String(form.formState.errors[name]?.message ?? "")}
          </p>
        </div>
      ))}
      <div>
        <Label>Guest</Label>
        <SearchableSelect
          required
          value={values.guestId || null}
          onChange={(value) =>
            form.setValue("guestId", value ?? 0, { shouldValidate: true })
          }
          onSearchChange={setGuestSearch}
          placeholder="Select guest"
          searchPlaceholder="Search active guests"
          loading={guests.isFetching}
          options={(guests.data?.items ?? []).map((guest) => ({
            value: guest.id,
            label: `${guest.firstName} ${guest.lastName}`,
            description: guest.phone ?? guest.email ?? undefined,
          }))}
        />
        <select
          className="hidden"
          value={values.guestId ?? 0}
          onChange={(event) =>
            form.setValue("guestId", Number(event.target.value), {
              shouldValidate: true,
            })
          }
        >
          <option value={0}>Select guest</option>
          {guests.data?.items.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {guest.firstName} {guest.lastName} ·{" "}
              {guest.phone ?? guest.email ?? `#${guest.id}`}
            </option>
          ))}
        </select>
        <p className="text-xs text-destructive">
          {String(form.formState.errors.guestId?.message ?? "")}
        </p>
      </div>
      <div>
        <Label>Available room type</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={values.roomTypeId ?? 0}
          onChange={(event) => {
            form.setValue("roomTypeId", Number(event.target.value), {
              shouldValidate: true,
            });
            form.setValue("roomId", "");
          }}
        >
          <option value={0}>Select room type</option>
          {roomTypes.data?.roomTypes.map((item) => (
            <option key={item.roomType.id} value={item.roomType.id}>
              {item.roomType.name} · {item.availableRooms} available ·{" "}
              {item.roomType.baseRate}
            </option>
          ))}
        </select>
        <p className="text-xs text-destructive">
          {String(form.formState.errors.roomTypeId?.message ?? "")}
        </p>
      </div>
      <div>
        <Label>Source</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          {...form.register("source")}
        >
          {reservationSources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Exact room (optional)</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          {...form.register("roomId")}
        >
          <option value="">Assign later</option>
          {availability.data?.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber}
              {r.displayName ? ` · ${r.displayName}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label>Special requests</Label>
        <Input {...form.register("specialRequests")} />
      </div>
      <div className="sm:col-span-2">
        <Label>Internal notes</Label>
        <Input {...form.register("internalNotes")} />
      </div>
      {availability.isError && (
        <div className="lg:col-span-4">
          <QueryErrorState error={availability.error} />
        </div>
      )}
      {Boolean(error) && (
        <div className="lg:col-span-4">
          <QueryErrorState error={error} />
        </div>
      )}
      <div className="lg:col-span-4">
        <Button disabled={pending}>
          {pending ? "Creating…" : "Create reservation"}
        </Button>
      </div>
    </form>
  );
}
