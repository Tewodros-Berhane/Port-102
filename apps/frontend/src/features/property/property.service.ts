import { apiClient } from "@/lib/api-client";
import type { PropertySettings } from "@/types/property.types";
export const getPropertySettings = () => apiClient.get<PropertySettings>("proxy/property-settings");
