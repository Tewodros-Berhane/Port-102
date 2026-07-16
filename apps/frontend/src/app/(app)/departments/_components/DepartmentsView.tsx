"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  createDepartment,
  deactivateDepartment,
  getDepartments,
} from "../_services/departments.service";
import type { DepartmentRow } from "../_types/departments.types";
export function DepartmentsView({ session }: { session: Session }) {
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const read = hasPermission(session.permissions, "departments.read"),
    canCreate = hasPermission(session.permissions, "departments.create"),
    canDelete = hasPermission(session.permissions, "departments.delete");
  const q = useQuery({
    queryKey: ["departments", "list", { page: 1 }],
    queryFn: () => getDepartments({ page: 1, limit: 100 }),
    enabled: read,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["departments", "list"] });
  const create = useMutation({
    mutationFn: createDepartment,
    meta: { successMessage: "Department created successfully." },
    onSuccess: () => {
      setKey("");
      setName("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: deactivateDepartment,
    onSuccess: refresh,
  });
  const columns: DataColumn<DepartmentRow>[] = [
    {
      key: "key",
      label: "Key",
      render: (r) => <code className="text-xs">{r.key}</code>,
    },
    {
      key: "name",
      label: "Department",
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-foreground-muted">
            {r.description ?? "No description"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (r.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      label: "",
      render: (r) =>
        canDelete && r.isActive ? (
          <Button
            variant="outline"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate(r.id)}
          >
            Deactivate
          </Button>
        ) : null,
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
        eyebrow="Administration"
        title="Departments"
        description="Reference departments used by users, employees, reports, and purchase requests."
      />
      {canCreate && (
        <form
          className="my-5 flex flex-col gap-2 rounded-md border bg-surface p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ key, name });
          }}
        >
          <Input
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="KEY"
          />
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
          />
          <Button loading={create.isPending} loadingText="Creating department…">
            Create department
          </Button>
        </form>
      )}
      {create.isError && <QueryErrorState error={create.error} />}{" "}
      {remove.isError && <QueryErrorState error={remove.error} />}{" "}
      {q.isPending ? (
        <Skeleton className="h-72" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <DataTable
          rows={q.data.items}
          columns={columns}
          getKey={(r) => r.id}
          emptyTitle="No departments found"
        />
      )}
    </PageContainer>
  );
}
