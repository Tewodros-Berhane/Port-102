"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceApi as api } from "../_services/maintenance.service";
import type { TicketQuery } from "../_types/maintenance.types";
export const useMaintenanceMutation = <T>(
  fn: (v: T) => Promise<unknown>,
  message: string,
) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { successMessage: message },
    onSuccess: () => client.invalidateQueries({ queryKey: ["maintenance"] }),
  });
};
export const useMaintenanceDashboard = (enabled: boolean) =>
  useQuery({
    queryKey: ["maintenance", "dashboard"],
    queryFn: api.dashboard,
    enabled,
  });
export const useTickets = (q: TicketQuery, assigned = false, enabled = true) =>
  useQuery({
    queryKey: ["maintenance", "tickets", assigned ? "assigned" : "list", q],
    queryFn: () => (assigned ? api.assigned(q) : api.tickets(q)),
    enabled,
  });
export const useTicket = (id: number, enabled = true) =>
  useQuery({
    queryKey: ["maintenance", "tickets", "detail", id],
    queryFn: () => api.ticket(id),
    enabled,
  });
export const useAssets = (
  q: Record<string, string | number | undefined>,
  enabled = true,
) =>
  useQuery({
    queryKey: ["maintenance", "assets", "list", q],
    queryFn: () => api.assets(q),
    enabled,
  });
export const useAsset = (id: number, enabled = true) =>
  useQuery({
    queryKey: ["maintenance", "assets", "detail", id],
    queryFn: () => api.asset(id),
    enabled,
  });
export const usePlans = (
  q: Record<string, string | number | undefined>,
  enabled = true,
) =>
  useQuery({
    queryKey: ["maintenance", "preventive", "list", q],
    queryFn: () => api.plans(q),
    enabled,
  });
export const usePlan = (id: number, enabled = true) =>
  useQuery({
    queryKey: ["maintenance", "preventive", "detail", id],
    queryFn: () => api.plan(id),
    enabled,
  });
