export type DepartmentRow = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type DepartmentsResponse = {
  items: DepartmentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
export type CreateDepartment = {
  key: string;
  name: string;
  description?: string;
};
