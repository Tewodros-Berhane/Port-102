"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useHousekeepingMutation } from "../_hooks/use-housekeeping";
import { housekeepingService as api } from "../_services/housekeeping.service";
import type {
  Priority,
  RoomSummary,
  TaskType,
} from "../_types/housekeeping.types";
export function CreateTaskPanel() {
  const [open, setOpen] = useState(false),
    [roomId, setRoomId] = useState<number | null>(null),
    [type, setType] = useState<TaskType>("CHECKOUT_CLEANING"),
    [priority, setPriority] = useState<Priority>("NORMAL"),
    [notes, setNotes] = useState(""),
    [search, setSearch] = useState("");
  const rooms = useQuery({
    queryKey: ["rooms", "housekeeping-options", search],
    queryFn: () =>
      apiClient.get<{ items: RoomSummary[] }>("proxy/rooms", {
        page: 1,
        limit: 20,
        search: search || undefined,
        isActive: true,
      }),
    enabled: open,
  });
  const create = useHousekeepingMutation(
    () =>
      api.createTask({
        roomId: roomId!,
        type,
        priority,
        notes: notes || undefined,
      }),
    "Housekeeping task created.",
  );
  if (!open) return <Button onClick={() => setOpen(true)}>Create task</Button>;
  return (
    <div className="w-full rounded-md border bg-surface p-4 sm:w-[520px]">
      <h2 className="font-semibold">Create housekeeping task</h2>
      <div className="mt-3 space-y-3">
        <SearchableSelect
          value={roomId}
          onChange={setRoomId}
          onSearchChange={setSearch}
          loading={rooms.isFetching}
          options={(rooms.data?.items ?? []).map((room) => ({
            value: room.id,
            label: room.displayName || `Room ${room.roomNumber}`,
            description: `${room.cleaningStatus} · ${room.occupancyStatus}`,
          }))}
          placeholder="Select a room"
          searchPlaceholder="Search rooms"
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="h-10 rounded-md border bg-surface px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
          >
            {[
              "CHECKOUT_CLEANING",
              "STAYOVER_CLEANING",
              "DEEP_CLEANING",
              "INSPECTION",
              "MANUAL",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border bg-surface px-3 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {["LOW", "NORMAL", "HIGH", "URGENT"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Task notes (optional)"
        />
        <div className="flex gap-2">
          <Button
            disabled={!roomId}
            loading={create.isPending}
            onClick={() => create.mutate(undefined)}
          >
            Create task
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
