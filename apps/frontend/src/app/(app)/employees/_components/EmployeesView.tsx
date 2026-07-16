"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  createEmployee,
  deactivateEmployee,
  getEmployeeDepartmentOptions,
  getEmployees,
} from "../_services/employees.service";
import type { EmployeeRow } from "../_types/employees.types";
const baseColumns: DataColumn<EmployeeRow>[] = [
  {
    key: "name",
    label: "Employee",
    render: (r) => (
      <div>
        <p className="font-medium">
          {r.firstName} {r.lastName}
        </p>
        <p className="text-xs text-foreground-muted">
          {r.employeeNumber ?? "No employee number"}
        </p>
      </div>
    ),
  },
  { key: "job", label: "Job title", render: (r) => r.jobTitle ?? "—" },
  {
    key: "department",
    label: "Department",
    render: (r) => r.department?.name ?? "—",
  },
  {
    key: "account",
    label: "Login account",
    render: (r) => r.user?.email ?? "Not linked",
  },
  { key: "status", label: "Status", render: (r) => r.status },
];
export function EmployeesView({ session }: { session: Session }) {
  const p = useSearchParams(),
    router = useRouter(),
    allowed = hasPermission(session.permissions, "employees.read"),
    page = Number(p.get("page") || 1),
    client = useQueryClient();
  const canCreate = hasPermission(session.permissions, "employees.create"),
    canDeactivate = hasPermission(session.permissions, "employees.deactivate");
  const q = useQuery({
    queryKey: ["employees", "list", { page }],
    queryFn: () => getEmployees({ page, pageSize: 20 }),
    enabled: allowed,
  });
  const departments = useQuery({
    queryKey: ["departments", "employee-options"],
    queryFn: () => getEmployeeDepartmentOptions(),
    enabled: canCreate,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["employees", "list"] });
  const create = useMutation({
    mutationFn: createEmployee,
    onSuccess: refresh,
    meta: { successMessage: "Employee created successfully." },
  });
  const deactivate = useMutation({
    mutationFn: deactivateEmployee,
    onSuccess: refresh,
  });
  const columns: DataColumn<EmployeeRow>[] = [
    ...baseColumns,
    {
      key: "actions",
      label: "",
      render: (r) =>
        canDeactivate && r.status === "ACTIVE" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={deactivate.isPending}
            onClick={() => deactivate.mutate(r.id)}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ];
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Employees"
        description="Employee profiles remain separate from login accounts."
      />
      {canCreate && (
        <details className="mt-5 rounded-md border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Create employee
          </summary>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const d = new FormData(event.currentTarget);
              create.mutate({
                firstName: String(d.get("firstName")),
                lastName: String(d.get("lastName")),
                employeeNumber:
                  String(d.get("employeeNumber") || "") || undefined,
                email: String(d.get("email") || "") || undefined,
                jobTitle: String(d.get("jobTitle") || "") || undefined,
                departmentId: d.get("departmentId")
                  ? Number(d.get("departmentId"))
                  : null,
              });
            }}
          >
            <Input name="firstName" required placeholder="First name" />
            <Input name="lastName" required placeholder="Last name" />
            <Input name="employeeNumber" placeholder="Employee number" />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="jobTitle" placeholder="Job title" />
            <SearchableSelect
              name="departmentId"
              placeholder="No department"
              searchPlaceholder="Search departments"
              disabled={departments.isPending}
              options={(departments.data?.items ?? []).map((department) => ({
                value: department.id,
                label: department.name,
                description: department.key,
              }))}
            />
            <Button loading={create.isPending} loadingText="Creating employee…">
              Create employee
            </Button>
          </form>
        </details>
      )}
      {create.isError && <QueryErrorState error={create.error} />}{" "}
      {deactivate.isError && <QueryErrorState error={deactivate.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={q.data.items}
            columns={columns}
            getKey={(r) => r.id}
            emptyTitle="No employees found"
          />
          <PaginationControls
            page={page}
            totalPages={q.data.pagination.totalPages}
            onPage={(v) => router.replace(`/employees?page=${v}`)}
          />
        </div>
      )}
    </PageContainer>
  );
}
