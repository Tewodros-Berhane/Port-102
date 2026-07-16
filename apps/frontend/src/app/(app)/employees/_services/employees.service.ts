import { apiClient } from "@/lib/api-client";
import type {
  EmployeePayload,
  EmployeeRow,
  EmployeesResponse,
} from "../_types/employees.types";
import type { DepartmentsResponse } from "../../departments/_types/departments.types";
export const getEmployees = (query: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}) => apiClient.get<EmployeesResponse>("proxy/employees", query);
export const getEmployee = (id: number) =>
  apiClient.get<EmployeeRow>(`proxy/employees/${id}`);
export const createEmployee = (body: EmployeePayload) =>
  apiClient.post<EmployeeRow>("proxy/employees", body);
export const getEmployeeDepartmentOptions = (search?: string) =>
  apiClient.get<DepartmentsResponse>("proxy/departments", {
    page: 1,
    limit: 100,
    search,
    isActive: true,
  });
export const updateEmployee = (id: number, body: Partial<EmployeePayload>) =>
  apiClient.patch<EmployeeRow>(`proxy/employees/${id}`, body);
export const deactivateEmployee = (id: number) =>
  apiClient.patch<EmployeeRow>(`proxy/employees/${id}/deactivate`);
export const linkEmployeeUser = (id: number, userId: number) =>
  apiClient.post<EmployeeRow>(`proxy/employees/${id}/link-user`, { userId });
