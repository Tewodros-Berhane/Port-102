"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Check, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import {
  archiveNotification,
  deleteNotification,
  getNotifications,
  markAllRead,
  markRead,
} from "../_services/notifications.service";
export function NotificationsView({ session }: { session: Session }) {
  const client = useQueryClient(),
    allowed = hasPermission(session.permissions, "notifications.read");
  const q = useQuery({
    queryKey: ["notifications", "list", { page: 1 }],
    queryFn: () => getNotifications({ page: 1, limit: 100 }),
    enabled: allowed,
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["notifications", "list"] });
    client.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  };
  const mutate = useMutation<
    unknown,
    Error,
    { kind: "read" | "archive" | "delete" | "all"; id?: number }
  >({
    mutationFn: ({ kind, id }) =>
      kind === "read"
        ? markRead(id!)
        : kind === "archive"
          ? archiveNotification(id!)
          : kind === "delete"
            ? deleteNotification(id!)
            : markAllRead(),
    onSuccess: refresh,
  });
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Personal"
        title="Notifications"
        description="Your own notification inbox."
        actions={
          <Button
            variant="outline"
            disabled={mutate.isPending}
            onClick={() => mutate.mutate({ kind: "all" })}
          >
            Mark all read
          </Button>
        }
      />
      {mutate.isError && <QueryErrorState error={mutate.error} />}{" "}
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <div className="mt-5 space-y-2">
          {q.data.map((item) => (
            <Card
              key={item.id}
              className={
                item.status === "UNREAD"
                  ? "border-primary/40 bg-primary-subtle/30"
                  : ""
              }
            >
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                      {item.type.replaceAll("_", " ")}
                    </span>
                    {item.status === "UNREAD" && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <h2 className="mt-1 font-medium">{item.title}</h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {item.message}
                  </p>
                  <p className="mt-2 text-xs text-foreground-subtle">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {item.status === "UNREAD" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mark read"
                      onClick={() =>
                        mutate.mutate({ kind: "read", id: item.id })
                      }
                    >
                      <Check />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Archive"
                    onClick={() =>
                      mutate.mutate({ kind: "archive", id: item.id })
                    }
                  >
                    <Archive />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() =>
                      mutate.mutate({ kind: "delete", id: item.id })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
