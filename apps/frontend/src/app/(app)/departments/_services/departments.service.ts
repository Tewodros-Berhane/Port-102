import { apiClient } from "@/lib/api-client";
import type {
  CreateDepartment,
  DepartmentRow,
  DepartmentsResponse,
} from "../_types/departments.types";
export const getDepartments = (query: {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}) => apiClient.get<DepartmentsResponse>("proxy/departments", query);
export const createDepartment = (body: CreateDepartment) =>
  apiClient.post<DepartmentRow>("proxy/departments", body);
export const deactivateDepartment = (id: number) =>
  apiClient.delete<DepartmentRow>(`proxy/departments/${id}`);
