"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { GuestForm } from "../../_components/GuestForm";
import { getGuest, updateGuest } from "../../_services/guests.service";
export function GuestDetailView({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const client = useQueryClient();
  const read = hasPermission(session.permissions, "guests.read"),
    edit =
      hasPermission(session.permissions, "guests.update") &&
      hasPermission(session.permissions, "guests.preferences.update");
  const query = useQuery({
    queryKey: ["guests", "detail", id],
    queryFn: () => getGuest(id),
    enabled: read,
  });
  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateGuest>[1]) =>
      updateGuest(id, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["guests"] });
    },
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
  const guest = query.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Guest profile"
        title={`${guest.firstName} ${guest.lastName}`}
        description={`Guest #${guest.id} · ${guest.status}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/guests">Back to guests</Link>
          </Button>
        }
      />
      <div className="mt-5 rounded-md border bg-surface p-5">
        {edit ? (
          <GuestForm
            defaults={{
              firstName: guest.firstName,
              lastName: guest.lastName,
              email: guest.email ?? "",
              phone: guest.phone ?? "",
              nationality: guest.nationality ?? "",
              documentNumber: guest.documentNumber ?? "",
            }}
            submitLabel="Save guest"
            pending={mutation.isPending}
            error={mutation.error}
            onSubmit={(payload) => mutation.mutate(payload)}
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" value={guest.email} />
            <Field label="Phone" value={guest.phone} />
            <Field label="Nationality" value={guest.nationality} />
            <Field label="Document" value={guest.documentNumber} />
          </dl>
        )}
      </div>
    </PageContainer>
  );
}
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-foreground-muted">{label}</dt>
      <dd className="mt-1">{value ?? "Not recorded"}</dd>
    </div>
  );
}
