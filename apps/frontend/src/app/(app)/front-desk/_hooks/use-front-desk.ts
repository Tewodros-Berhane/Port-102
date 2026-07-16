"use client";
import { useQuery } from "@tanstack/react-query";
import {
  getArrivals,
  getDepartures,
  getFrontDeskDashboard,
  getInHouse,
} from "../_services/front-desk.service";
import type { FrontDeskFilters } from "../_types/front-desk.types";
export function useFrontDesk(filters: FrontDeskFilters, enabled: boolean) {
  const shared = { enabled, staleTime: 30_000 };
  return {
    dashboard: useQuery({
      queryKey: ["front-desk", "dashboard", filters.date],
      queryFn: () => getFrontDeskDashboard(filters.date),
      ...shared,
    }),
    arrivals: useQuery({
      queryKey: ["front-desk", "arrivals", filters],
      queryFn: () => getArrivals(filters),
      ...shared,
    }),
    departures: useQuery({
      queryKey: ["front-desk", "departures", filters],
      queryFn: () => getDepartures(filters),
      ...shared,
    }),
    inHouse: useQuery({
      queryKey: [
        "front-desk",
        "in-house",
        { page: filters.page, limit: filters.limit, search: filters.search },
      ],
      queryFn: () =>
        getInHouse({
          page: filters.page,
          limit: filters.limit,
          search: filters.search,
        }),
      ...shared,
    }),
  };
}
