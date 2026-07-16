"use client";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useMaintenanceMutation } from "../_hooks/use-maintenance";
import { maintenanceApi as api } from "../_services/maintenance.service";
import type { Ticket } from "../_types/maintenance.types";
export function AssignedTicketActions({
  ticket,
  session,
}: {
  ticket: Ticket;
  session: Session;
}) {
  const mine = ticket.assignedToUserId === session.id;
  const start = useMaintenanceMutation(
      () => api.start(ticket.id),
      "Maintenance ticket started.",
    ),
    complete = useMaintenanceMutation(
      () => api.complete(ticket.id),
      "Maintenance ticket completed.",
    );
  if (!mine) return null;
  if (
    ticket.status === "ASSIGNED" &&
    hasPermission(session.permissions, "maintenance.tickets.start.assigned")
  )
    return (
      <Button
        size="sm"
        loading={start.isPending}
        onClick={() => start.mutate(undefined)}
      >
        Start
      </Button>
    );
  if (
    ["IN_PROGRESS", "REJECTED"].includes(ticket.status) &&
    hasPermission(session.permissions, "maintenance.tickets.complete.assigned")
  )
    return (
      <Button
        size="sm"
        loading={complete.isPending}
        onClick={() => complete.mutate(undefined)}
      >
        Complete
      </Button>
    );
  return null;
}
