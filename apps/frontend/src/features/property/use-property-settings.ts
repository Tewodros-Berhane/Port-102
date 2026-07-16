"use client";
import { useQuery } from "@tanstack/react-query";
import { getPropertySettings } from "./property.service";
export const propertySettingsQueryKey = ["property-settings"] as const;
export function usePropertySettings(enabled = true) {
  return useQuery({
    queryKey: propertySettingsQueryKey,
    queryFn: getPropertySettings,
    enabled,
    staleTime: 5 * 60_000,
  });
}
