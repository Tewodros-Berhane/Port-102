"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { createGuest, getGuests } from "../_services/guests.service";
import type { Guest } from "../_types/guests.types";
import { GuestForm } from "./GuestForm";
export function GuestsView({ session }: { session: Session }) {
  const params = useSearchParams(),
    router = useRouter(),
    client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const page = Number(params.get("page") ?? 1),
    search = params.get("search") ?? "";
  const read = hasPermission(session.permissions, "guests.read"),
    canCreate = hasPermission(session.permissions, "guests.create");
  const query = useQuery({
    queryKey: ["guests", "list", { page, search }],
    queryFn: () =>
      getGuests({ page, pageSize: 20, search: search || undefined }),
    enabled: read,
  });
  const create = useMutation({
    mutationFn: createGuest,
    meta: { successMessage: "Guest created successfully." },
    onSuccess: () => {
      setCreating(false);
      client.invalidateQueries({ queryKey: ["guests", "list"] });
    },
  });
  const set = (key: string, value: string | number) => {
    const next = new URLSearchParams(params);
    next.set(key, String(value));
    router.replace(`/guests?${next}`);
  };
  const columns: DataColumn<Guest>[] = [
    {
      key: "name",
      label: "Guest",
      render: (g) => (
        <Link
          className="font-medium text-primary hover:underline"
          href={`/guests/${g.id}`}
        >
          {g.firstName} {g.lastName}
        </Link>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (g) => (
        <div>
          <p>{g.phone ?? "No phone"}</p>
          <p className="text-xs text-foreground-muted">
            {g.email ?? "No email"}
          </p>
        </div>
      ),
    },
    {
      key: "identity",
      label: "Identity",
      render: (g) =>
        [g.nationality, g.documentNumber].filter(Boolean).join(" · ") ||
        "Not recorded",
    },
    { key: "status", label: "Status", render: (g) => g.status },
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
        title="Guests"
        description="Search, create, and maintain guest profiles."
        actions={
          canCreate ? (
            <Button onClick={() => setCreating((v) => !v)}>
              {creating ? "Close form" : "New guest"}
            </Button>
          ) : undefined
        }
      />
      {creating && (
        <div className="my-5 rounded-md border bg-surface p-4">
          <GuestForm
            submitLabel="Create guest"
            pending={create.isPending}
            error={create.error}
            onSubmit={(p) => create.mutate(p)}
          />
        </div>
      )}
      <div className="my-5">
        <LiveSearchInput
          key={search}
          placeholder="Search name, email, phone, or document"
          value={search}
          onSearch={(value) => set("search", value)}
        />
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
            getKey={(g) => g.id}
            emptyTitle="No guests found"
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
