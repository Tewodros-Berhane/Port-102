import { apiClient } from "@/lib/api-client";
import type {
  Permission,
  RolePayload,
  RoleRow,
  RolesResponse,
} from "../_types/roles.types";
export const getRoles = () => apiClient.get<RolesResponse>("proxy/roles");
export const getRole = (id: number) =>
  apiClient.get<RoleRow>(`proxy/roles/${id}`);
export const getPermissions = () =>
  apiClient.get<{ items: Permission[] }>("proxy/permissions");
export const createRole = (body: RolePayload) =>
  apiClient.post<RoleRow>("proxy/roles", body);
export const updateRole = (
  id: number,
  body: Partial<RolePayload> & { isActive?: boolean },
) => apiClient.patch<RoleRow>(`proxy/roles/${id}`, body);
export const deleteRole = (id: number) =>
  apiClient.delete<{ deleted: boolean }>(`proxy/roles/${id}`);
export const assignRolePermissions = (id: number, permissionKeys: string[]) =>
  apiClient.post<RoleRow>(`proxy/roles/${id}/permissions`, { permissionKeys });
