import { apiClient } from "@/lib/api-client";
import type {
  Arrival,
  FrontDeskDashboard,
  FrontDeskFilters,
  QueueResponse,
  StayQueueItem,
} from "../_types/front-desk.types";
export const getFrontDeskDashboard = (date?: string) =>
  apiClient.get<FrontDeskDashboard>("proxy/front-desk/dashboard", { date });
export const getArrivals = (filters: FrontDeskFilters) =>
  apiClient.get<QueueResponse<Arrival>>("proxy/front-desk/arrivals", filters);
export const getDepartures = (filters: FrontDeskFilters) =>
  apiClient.get<QueueResponse<StayQueueItem>>(
    "proxy/front-desk/departures",
    filters,
  );
export const getInHouse = (filters: Omit<FrontDeskFilters, "date">) =>
  apiClient.get<QueueResponse<StayQueueItem>>(
    "proxy/front-desk/in-house",
    filters,
  );
