"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  createUser,
  getUserDepartmentOptions,
  getUserRoleOptions,
  getUsers,
  setUserActive,
} from "../_services/users.service";
import type { UserRow } from "../_types/users.types";

export function UsersView({ session }: { session: Session }) {
  const params = useSearchParams(),
    router = useRouter(),
    client = useQueryClient();
  const page = Number(params.get("page") || 1),
    search = params.get("search") || undefined;
  const read = hasPermission(session.permissions, "users.read"),
    canCreate = hasPermission(session.permissions, "users.create"),
    canActivate = hasPermission(session.permissions, "users.activate"),
    canDeactivate = hasPermission(session.permissions, "users.deactivate");
  const query = useQuery({
    queryKey: ["users", "list", { page, search }],
    queryFn: () => getUsers({ page, pageSize: 20, search }),
    enabled: read,
  });
  const roles = useQuery({
    queryKey: ["roles", "options"],
    queryFn: getUserRoleOptions,
    enabled: canCreate,
  });
  const departments = useQuery({
    queryKey: ["departments", "options"],
    queryFn: () => getUserDepartmentOptions(),
    enabled: canCreate,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["users", "list"] });
  const create = useMutation({
    mutationFn: createUser,
    onSuccess: refresh,
    meta: { successMessage: "User created successfully." },
  });
  const status = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      setUserActive(id, active),
    onSuccess: refresh,
    meta: {
      successMessage: (variables: unknown) =>
        (variables as { active: boolean }).active
          ? "User activated successfully."
          : "User deactivated successfully.",
    },
  });
  const columns: DataColumn<UserRow>[] = [
    {
      key: "name",
      label: "User",
      render: (r) => (
        <div>
          <p className="font-medium">{r.fullName}</p>
          <p className="text-xs text-foreground-muted">{r.email}</p>
        </div>
      ),
    },
    { key: "role", label: "Role", render: (r) => r.role.name },
    {
      key: "department",
      label: "Department",
      render: (r) => r.department?.name ?? "—",
    },
    { key: "status", label: "Status", render: (r) => r.status },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.status === "ACTIVE"
          ? canDeactivate && (
              <Button
                size="sm"
                variant="outline"
                disabled={status.isPending || r.id === session.id}
                onClick={() => status.mutate({ id: r.id, active: false })}
              >
                Deactivate
              </Button>
            )
          : canActivate && (
              <Button
                size="sm"
                variant="outline"
                disabled={status.isPending}
                onClick={() => status.mutate({ id: r.id, active: true })}
              >
                Activate
              </Button>
            ),
    },
  ];
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`/users?${next}`);
  };
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
        title="Users"
        description="Login accounts, assigned roles, departments, and account status."
      />
      {canCreate && (
        <details className="mt-5 rounded-md border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Create user
          </summary>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const d = new FormData(event.currentTarget);
              create.mutate({
                email: String(d.get("email")),
                fullName: String(d.get("fullName")),
                password: String(d.get("password")),
                phone: String(d.get("phone") || "") || undefined,
                roleId: Number(d.get("roleId")),
                departmentId: d.get("departmentId")
                  ? Number(d.get("departmentId"))
                  : null,
              });
            }}
          >
            <Input name="fullName" required placeholder="Full name" />
            <Input name="email" type="email" required placeholder="Email" />
            <Input
              name="password"
              type="password"
              minLength={8}
              required
              placeholder="Temporary password"
            />
            <Input name="phone" placeholder="Phone (optional)" />
            <SearchableSelect
              name="roleId"
              required
              placeholder="Select role"
              searchPlaceholder="Search roles"
              disabled={roles.isPending}
              options={(roles.data?.items ?? [])
                .filter((role) => role.isActive)
                .map((role) => ({
                  value: role.id,
                  label: role.name,
                  description: role.key,
                }))}
            />
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
            <Button loading={create.isPending} loadingText="Creating user…">
              Create user
            </Button>
          </form>
        </details>
      )}
      {create.isError && <QueryErrorState error={create.error} />}{" "}
      {status.isError && <QueryErrorState error={status.error} />}
      <LiveSearchInput
        key={search ?? ""}
        className="my-5 max-w-sm"
        placeholder="Search users"
        value={search ?? ""}
        onSearch={(value) => update("search", value)}
      />
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
            emptyTitle="No users found"
          />
          <PaginationControls
            page={page}
            totalPages={query.data.pagination.totalPages}
            onPage={(v) => update("page", String(v))}
          />
        </>
      )}
    </PageContainer>
  );
}
