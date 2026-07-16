export type UserRow = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  role: { id: number; key: string; name: string };
  department: { id: number; key: string; name: string } | null;
};
export type UsersResponse = {
  items: UserRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export type CreateUserPayload = {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  roleId: number;
  departmentId?: number | null;
};
export type UpdateUserPayload = {
  email?: string;
  fullName?: string;
  phone?: string | null;
  departmentId?: number | null;
};
