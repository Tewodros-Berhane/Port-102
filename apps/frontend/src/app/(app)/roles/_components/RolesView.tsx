"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { createRole, deleteRole, getRoles } from "../_services/roles.service";
export function RolesView({ session }: { session: Session }) {
  const allowed = hasPermission(session.permissions, "roles.read");
  const canCreate = hasPermission(session.permissions, "roles.create"),
    canDelete = hasPermission(session.permissions, "roles.delete"),
    client = useQueryClient();
  const q = useQuery({
    queryKey: ["roles", "list"],
    queryFn: getRoles,
    enabled: allowed,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["roles", "list"] });
  const create = useMutation({
    mutationFn: createRole,
    onSuccess: refresh,
    meta: { successMessage: "Role created successfully." },
  });
  const remove = useMutation({ mutationFn: deleteRole, onSuccess: refresh });
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
        title="Roles and permissions"
        description="System and custom roles with their backend-assigned permissions."
      />
      {canCreate && (
        <details className="mt-5 rounded-md border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Create custom role
          </summary>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const d = new FormData(event.currentTarget);
              create.mutate({
                key: String(d.get("key")),
                name: String(d.get("name")),
                description: String(d.get("description") || "") || undefined,
              });
            }}
          >
            <Input
              name="key"
              required
              pattern="[A-Za-z0-9_]+"
              placeholder="ROLE_KEY"
            />
            <Input name="name" required placeholder="Role name" />
            <Input name="description" placeholder="Description" />
            <Button loading={create.isPending} loadingText="Creating role…">
              Create role
            </Button>
          </form>
        </details>
      )}
      {create.isError && <QueryErrorState error={create.error} />}{" "}
      {remove.isError && <QueryErrorState error={remove.error} />}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {q.data.items.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-5">
                <div className="flex justify-between">
                  <div>
                    <h2 className="font-semibold">{role.name}</h2>
                    <code className="text-xs text-foreground-muted">
                      {role.key}
                    </code>
                  </div>
                  <span className="text-xs text-foreground-muted">
                    {role.isSystem ? "System role" : "Custom role"}
                  </span>
                  {canDelete && !role.isSystem && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(role.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm text-foreground-muted">
                  {role.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {role.permissions.map((permission) => (
                    <span
                      key={permission.id}
                      className="rounded bg-muted px-2 py-1 text-[11px]"
                    >
                      {permission.key}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
