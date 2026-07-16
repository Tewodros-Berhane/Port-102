import { apiClient } from "@/lib/api-client";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserRow,
  UsersResponse,
} from "../_types/users.types";
import type { RoleRow } from "../../roles/_types/roles.types";
import type { DepartmentsResponse } from "../../departments/_types/departments.types";
export const getUsers = (query: {
  page: number;
  pageSize: number;
  search?: string;
}) => apiClient.get<UsersResponse>("proxy/users", query);
export const getUser = (id: number) =>
  apiClient.get<UserRow>(`proxy/users/${id}`);
export const createUser = (body: CreateUserPayload) =>
  apiClient.post<UserRow>("proxy/users", body);
export const getUserRoleOptions = () =>
  apiClient.get<{ items: RoleRow[] }>("proxy/roles");
export const getUserDepartmentOptions = (search?: string) =>
  apiClient.get<DepartmentsResponse>("proxy/departments", {
    page: 1,
    limit: 100,
    search,
    isActive: true,
  });
export const updateUser = (id: number, body: UpdateUserPayload) =>
  apiClient.patch<UserRow>(`proxy/users/${id}`, body);
export const setUserActive = (id: number, active: boolean) =>
  apiClient.patch<UserRow>(
    `proxy/users/${id}/${active ? "activate" : "deactivate"}`,
  );
export const assignUserRole = (
  id: number,
  body: { roleId: number; departmentId?: number | null },
) => apiClient.post<UserRow>(`proxy/users/${id}/assign-role`, body);
export const resetUserPassword = (id: number, newPassword: string) =>
  apiClient.post<{ passwordReset: boolean }>(
    `proxy/users/${id}/reset-password`,
    { newPassword },
  );
