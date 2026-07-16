import { apiClient } from "@/lib/api-client";
import type { PropertySettings } from "@/types/property.types";
import type { PropertyForm } from "../_schemas/property.schema";
export const updatePropertySettings = (body: PropertyForm) =>
  apiClient.patch<PropertySettings>("proxy/property-settings", body);
