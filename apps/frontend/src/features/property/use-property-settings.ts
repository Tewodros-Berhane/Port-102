"use client";
import { useQuery } from "@tanstack/react-query";
import { getPropertySettings } from "./property.service";
export function usePropertySettings(enabled = true) { return useQuery({ queryKey: ["property-settings"], queryFn: getPropertySettings, enabled, staleTime: 5 * 60_000 }); }
