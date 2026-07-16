"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaintenanceMutation } from "../_hooks/use-maintenance";
import { maintenanceApi as api } from "../_services/maintenance.service";
import type { IssueType, Priority } from "../_types/maintenance.types";
export function CreateTicketPanel() {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [issueType, setIssueType] = useState<IssueType>("OTHER"),
    [priority, setPriority] = useState<Priority>("NORMAL");
  const create = useMaintenanceMutation(
    () =>
      api.createTicket({
        title,
        description: description || undefined,
        issueType,
        priority,
      }),
    "Maintenance ticket created.",
  );
  if (!open)
    return <Button onClick={() => setOpen(true)}>Create ticket</Button>;
  return (
    <div className="w-full rounded-md border bg-surface p-4 sm:w-[500px]">
      <h2 className="font-semibold">Create maintenance ticket</h2>
      <div className="mt-3 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ticket title"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="h-10 rounded-md border bg-surface px-3"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType)}
          >
            {[
              "ELECTRICAL",
              "PLUMBING",
              "HVAC",
              "FURNITURE",
              "APPLIANCE",
              "CLEANLINESS",
              "STRUCTURAL",
              "INTERNET_TV",
              "SAFETY",
              "OTHER",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border bg-surface px-3"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!title.trim()}
            loading={create.isPending}
            onClick={() => create.mutate(undefined)}
          >
            Create
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
