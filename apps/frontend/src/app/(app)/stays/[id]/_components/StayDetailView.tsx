"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { listAvailableRooms } from "../../../reservations/_services/reservations.service";
import {
  addCharge,
  applyDiscount,
  assignRoom,
  checkoutStay,
  extendStay,
  generateInvoice,
  generateReceipt,
  getFolioByStay,
  getFolioSummary,
  getInvoices,
  getPayments,
  getReceipts,
  getStay,
  moveRoom,
  openFolio,
  recordPayment,
} from "../../_services/stays.service";
import {
  paymentMethods,
  type FolioLine,
  type Invoice,
  type Payment,
  type PaymentMethod,
  type Receipt,
} from "../../_types/stays.types";
export function StayDetailView({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const client = useQueryClient();
  const read = hasPermission(session.permissions, "reservations.read");
  const stay = useQuery({
    queryKey: ["stays", "detail", id],
    queryFn: () => getStay(id),
    enabled: read,
  });
  const folio = useQuery({
    queryKey: ["folios", "by-stay", id],
    queryFn: () => getFolioByStay(id),
    enabled: read && hasPermission(session.permissions, "folios.read"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["stays"] });
    client.invalidateQueries({ queryKey: ["folios"] });
    client.invalidateQueries({ queryKey: ["front-desk"] });
  };
  const open = useMutation({
    mutationFn: () => openFolio(id),
    onSuccess: refresh,
  });
  const checkout = useMutation({
    mutationFn: () => checkoutStay(id, { closeFolio: true }),
    onSuccess: refresh,
  });
  if (!read)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  if (stay.isPending)
    return (
      <PageContainer>
        <Skeleton className="h-80" />
      </PageContainer>
    );
  if (stay.isError)
    return (
      <PageContainer>
        <QueryErrorState error={stay.error} />
      </PageContainer>
    );
  const s = stay.data;
  const noFolio = folio.error instanceof ApiError && folio.error.status === 404;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Active stay"
        title={s.stayNumber}
        description={`${s.guest.firstName} ${s.guest.lastName} · ${s.reservation.reservationNumber}`}
        actions={
          <>
            <StatusBadge label={s.status} />
            <Button variant="outline" asChild>
              <Link href="/front-desk">Front desk</Link>
            </Button>
          </>
        }
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Checked in"
          value={new Date(s.checkedInAt).toLocaleDateString()}
        />
        <StatCard
          label="Expected checkout"
          value={new Date(s.expectedCheckOutDate).toLocaleDateString()}
        />
        <StatCard
          label="Current room"
          value={
            s.roomAssignments
              .filter((a) => a.status === "ACTIVE")
              .map((a) => a.room.roomNumber)
              .join(", ") || "Unassigned"
          }
        />
      </div>
      {s.status === "ACTIVE" && (
        <StayActions stay={s} session={session} onSuccess={refresh} />
      )}
      <section className="mt-7">
        <h2 className="mb-3 text-base font-semibold">Folio and settlement</h2>
        {folio.isPending ? (
          <Skeleton className="h-40" />
        ) : noFolio ? (
          hasPermission(session.permissions, "folios.create") ? (
            <Button disabled={open.isPending} onClick={() => open.mutate()}>
              Open folio
            </Button>
          ) : (
            <p className="text-sm text-foreground-muted">No folio is open.</p>
          )
        ) : folio.isError ? (
          <QueryErrorState error={folio.error} />
        ) : (
          <FolioPanel
            folioId={folio.data.id}
            session={session}
            onSuccess={refresh}
          />
        )}
      </section>
      {s.status === "ACTIVE" &&
        hasPermission(session.permissions, "check_out.execute") && (
          <section className="mt-7 rounded-md border border-destructive/20 p-4">
            <h2 className="font-semibold">Checkout</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              The backend will enforce balance and stay-state requirements.
            </p>
            <Button
              className="mt-3"
              variant="destructive"
              disabled={checkout.isPending}
              onClick={() => {
                if (confirm("Check out this stay?")) checkout.mutate();
              }}
            >
              Check out guest
            </Button>
            {checkout.isError && <QueryErrorState error={checkout.error} />}
          </section>
        )}
    </PageContainer>
  );
}
function StayActions({
  stay,
  session,
  onSuccess,
}: {
  stay: Awaited<ReturnType<typeof getStay>>;
  session: Session;
  onSuccess: () => void;
}) {
  const active = stay.roomAssignments.filter((a) => a.status === "ACTIVE");
  const [date, setDate] = useState(stay.expectedCheckOutDate.slice(0, 10)),
    [reason, setReason] = useState(""),
    [assignment, setAssignment] = useState(active[0]?.id ?? 0),
    [roomId, setRoom] = useState("");
  const current = active.find((a) => a.id === assignment);
  const rooms = useQuery({
    queryKey: [
      "stays",
      "move-availability",
      stay.id,
      current?.room.roomTypeId,
      date,
    ],
    queryFn: () =>
      listAvailableRooms({
        checkInDate: new Date().toISOString().slice(0, 10),
        checkOutDate: stay.expectedCheckOutDate.slice(0, 10),
        roomTypeId: current?.room.roomTypeId,
      }),
    enabled: Boolean(current),
  });
  const extend = useMutation({
    mutationFn: () =>
      extendStay(stay.id, {
        newExpectedCheckOutDate: date,
        reason: reason || undefined,
      }),
    onSuccess,
  });
  const move = useMutation({
    mutationFn: () =>
      moveRoom(stay.id, {
        fromAssignmentId: assignment,
        toRoomId: Number(roomId),
        reason: reason || undefined,
      }),
    onSuccess,
  });
  const availableForAssignment = useQuery({
    queryKey: ["stays", "assign-availability", stay.id],
    queryFn: () =>
      listAvailableRooms({
        checkInDate: new Date().toISOString().slice(0, 10),
        checkOutDate: stay.expectedCheckOutDate.slice(0, 10),
      }),
    enabled: active.length === 0,
  });
  const assign = useMutation({
    mutationFn: () =>
      assignRoom(stay.id, {
        roomId: Number(roomId),
        reason: reason || undefined,
      }),
    onSuccess,
  });
  return (
    <section className="mt-7 grid gap-4 lg:grid-cols-2">
      {hasPermission(session.permissions, "room_assignment.create") &&
        active.length === 0 && (
          <form
            className="rounded-md border bg-surface p-4"
            onSubmit={(event) => {
              event.preventDefault();
              assign.mutate();
            }}
          >
            <h2 className="font-semibold">Assign room</h2>
            <Label>Available room</Label>
            <SearchableSelect
              value={roomId ? Number(roomId) : null}
              onChange={(value) => setRoom(value ? String(value) : "")}
              placeholder="Select room"
              searchPlaceholder="Search available rooms"
              disabled={availableForAssignment.isPending}
              options={(availableForAssignment.data?.rooms ?? []).map(
                (room) => ({
                  value: room.id,
                  label: room.roomNumber,
                  description: room.displayName ?? undefined,
                }),
              )}
            />
            <Button className="mt-3" disabled={assign.isPending || !roomId}>
              Assign room
            </Button>
            {assign.isError && <QueryErrorState error={assign.error} />}
          </form>
        )}
      {hasPermission(session.permissions, "stay_extension.execute") && (
        <form
          className="rounded-md border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            extend.mutate();
          }}
        >
          <h2 className="font-semibold">Extend stay</h2>
          <Label>New expected checkout</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button className="mt-3" disabled={extend.isPending}>
            Extend stay
          </Button>
          {extend.isError && <QueryErrorState error={extend.error} />}
        </form>
      )}
      {hasPermission(session.permissions, "room_move.execute") &&
        active.length > 0 && (
          <form
            className="rounded-md border bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              move.mutate();
            }}
          >
            <h2 className="font-semibold">Move room</h2>
            <Label>Current assignment</Label>
            <SearchableSelect
              value={assignment}
              onChange={(value) => setAssignment(value ?? 0)}
              placeholder="Select current room"
              searchPlaceholder="Search current rooms"
              options={active.map((item) => ({
                value: item.id,
                label: item.room.roomNumber,
                description: item.room.displayName ?? undefined,
              }))}
            />
            <Label>Available destination</Label>
            <SearchableSelect
              value={roomId ? Number(roomId) : null}
              onChange={(value) => setRoom(value ? String(value) : "")}
              placeholder="Select room"
              searchPlaceholder="Search available rooms"
              disabled={rooms.isPending}
              options={(rooms.data?.rooms ?? []).map((room) => ({
                value: room.id,
                label: room.roomNumber,
                description: room.displayName ?? undefined,
              }))}
            />
            <Button className="mt-3" disabled={move.isPending || !roomId}>
              Move room
            </Button>
            {move.isError && <QueryErrorState error={move.error} />}
          </form>
        )}
    </section>
  );
}
function FolioPanel({
  folioId,
  session,
  onSuccess,
}: {
  folioId: number;
  session: Session;
  onSuccess: () => void;
}) {
  const client = useQueryClient();
  const summary = useQuery({
      queryKey: ["folios", "detail", folioId],
      queryFn: () => getFolioSummary(folioId),
    }),
    payments = useQuery({
      queryKey: ["payments", "folio", folioId],
      queryFn: () => getPayments(folioId),
      enabled: hasPermission(session.permissions, "payments.read"),
    }),
    invoices = useQuery({
      queryKey: ["invoices", "folio", folioId],
      queryFn: () => getInvoices(folioId),
      enabled: hasPermission(session.permissions, "invoices.read"),
    }),
    receipts = useQuery({
      queryKey: ["receipts", "folio", folioId],
      queryFn: () => getReceipts(folioId),
      enabled: hasPermission(session.permissions, "receipts.read"),
    });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["folios"] });
    client.invalidateQueries({ queryKey: ["payments"] });
    client.invalidateQueries({ queryKey: ["invoices"] });
    client.invalidateQueries({ queryKey: ["receipts"] });
    onSuccess();
  };
  if (summary.isPending) return <Skeleton className="h-64" />;
  if (summary.isError) return <QueryErrorState error={summary.error} />;
  const data = summary.data;
  const lines: DataColumn<FolioLine>[] = [
    {
      key: "item",
      label: "Charge",
      render: (x) => (
        <div>
          <p>{x.description}</p>
          <p className="text-xs text-foreground-muted">
            {x.type.replaceAll("_", " ")}
          </p>
        </div>
      ),
    },
    { key: "quantity", label: "Qty", render: (x) => x.quantity },
    {
      key: "amount",
      label: "Amount",
      render: (x) => x.totalAmount,
    },
    {
      key: "status",
      label: "Status",
      render: (x) => (x.isVoided ? "Voided" : "Posted"),
    },
  ];
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={data.totals.totalAmount} />
        <StatCard label="Paid" value={data.totals.paidAmount} />
        <StatCard label="Balance" value={data.totals.balanceAmount} />
      </div>
      <div className="mt-4">
        <DataTable
          rows={data.lineItems}
          columns={lines}
          getKey={(x) => x.id}
          emptyTitle="No folio charges"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {hasPermission(session.permissions, "folios.manual_charge.create") && (
          <ChargeForm folioId={folioId} onSuccess={refresh} />
        )}{" "}
        {hasPermission(session.permissions, "folios.discount.apply.small") && (
          <DiscountForm folioId={folioId} onSuccess={refresh} />
        )}
        {hasPermission(session.permissions, "payments.record") && (
          <PaymentForm
            folioId={folioId}
            balance={data.totals.balanceAmount}
            onSuccess={refresh}
          />
        )}
      </div>
      <Documents
        folioId={folioId}
        session={session}
        payments={payments.data?.items ?? []}
        invoices={invoices.data?.items ?? []}
        receipts={receipts.data?.items ?? []}
        onSuccess={refresh}
      />
    </div>
  );
}
function ChargeForm({
  folioId,
  onSuccess,
}: {
  folioId: number;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState(""),
    [amount, setAmount] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      addCharge(folioId, {
        type: "MANUAL_CHARGE",
        description,
        unitAmount: Number(amount),
        quantity: 1,
      }),
    onSuccess: () => {
      setDescription("");
      setAmount("");
      onSuccess();
    },
  });
  return (
    <form
      className="rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h3 className="font-semibold">Add manual charge</h3>
      <Input
        className="mt-2"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <Input
        className="mt-2"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <Button
        className="mt-3"
        disabled={mutation.isPending || !description || !amount}
      >
        Post charge
      </Button>
      {mutation.isError && <QueryErrorState error={mutation.error} />}
    </form>
  );
}
function DiscountForm({
  folioId,
  onSuccess,
}: {
  folioId: number;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      applyDiscount(folioId, {
        description,
        amount: Number(amount),
        reason: reason || undefined,
      }),
    onSuccess,
  });
  return (
    <form
      className="rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <h3 className="font-semibold">Apply discount</h3>
      <Input
        className="mt-2"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Description"
      />
      <Input
        className="mt-2"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Fixed amount"
      />
      <Input
        className="mt-2"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (optional)"
      />
      <Button
        className="mt-3"
        disabled={mutation.isPending || !description || !amount}
      >
        Apply discount
      </Button>
      {mutation.isError && <QueryErrorState error={mutation.error} />}
    </form>
  );
}

function PaymentForm({
  folioId,
  balance,
  onSuccess,
}: {
  folioId: number;
  balance: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(balance),
    [method, setMethod] = useState<PaymentMethod>("CASH"),
    [reference, setReference] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      recordPayment({
        folioId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
        generateReceipt: true,
      }),
    onSuccess: onSuccess,
  });
  return (
    <form
      className="rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h3 className="font-semibold">Collect payment</h3>
      <Input
        className="mt-2"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select
        className="mt-2 h-9 w-full rounded-md border bg-background px-3"
        value={method}
        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
      >
        {paymentMethods.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <Input
        className="mt-2"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference (optional)"
      />
      <Button className="mt-3" disabled={mutation.isPending || !amount}>
        Record payment
      </Button>
      {mutation.isError && <QueryErrorState error={mutation.error} />}
    </form>
  );
}
function Documents({
  folioId,
  session,
  payments,
  invoices,
  receipts,
  onSuccess,
}: {
  folioId: number;
  session: Session;
  payments: Payment[];
  invoices: Invoice[];
  receipts: Receipt[];
  onSuccess: () => void;
}) {
  const invoice = useMutation({
      mutationFn: () => generateInvoice(folioId),
      onSuccess,
    }),
    receipt = useMutation({
      mutationFn: () =>
        generateReceipt(
          folioId,
          payments.find((p) => p.status === "RECORDED")?.id,
        ),
      onSuccess,
    });
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border p-4">
        <div className="flex justify-between">
          <h3 className="font-semibold">Invoices</h3>
          {hasPermission(session.permissions, "invoices.generate") && (
            <Button
              size="sm"
              variant="outline"
              disabled={invoice.isPending}
              onClick={() => invoice.mutate()}
            >
              Generate
            </Button>
          )}
        </div>
        {invoices.map((x) => (
          <p className="mt-2 text-sm" key={x.id}>
            {x.invoiceNumber} · {x.status} · {x.totalAmount}
          </p>
        ))}
        {!invoices.length && (
          <p className="mt-2 text-sm text-foreground-muted">No invoices.</p>
        )}
      </div>
      <div className="rounded-md border p-4">
        <div className="flex justify-between">
          <h3 className="font-semibold">Receipts</h3>
          {hasPermission(session.permissions, "receipts.generate") && (
            <Button
              size="sm"
              variant="outline"
              disabled={receipt.isPending}
              onClick={() => receipt.mutate()}
            >
              Generate
            </Button>
          )}
        </div>
        {receipts.map((x) => (
          <p className="mt-2 text-sm" key={x.id}>
            {x.receiptNumber} · {x.status} · {x.amount}
          </p>
        ))}
        {!receipts.length && (
          <p className="mt-2 text-sm text-foreground-muted">No receipts.</p>
        )}
      </div>
      {(invoice.isError || receipt.isError) && (
        <QueryErrorState error={invoice.error ?? receipt.error} />
      )}
    </section>
  );
}
