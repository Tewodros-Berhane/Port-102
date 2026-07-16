export type EmployeeRow = {
  id: number;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: "ACTIVE" | "INACTIVE";
  hireDate: string | null;
  department: { id: number; key: string; name: string } | null;
  user: { id: number; email: string; fullName: string; status: string } | null;
};
export type EmployeesResponse = {
  items: EmployeeRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export type EmployeePayload = {
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: number | null;
  hireDate?: string | null;
};
