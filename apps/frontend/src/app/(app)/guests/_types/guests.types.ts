export type Guest = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  documentNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  preferences: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    status: string;
  } | null;
};
export type GuestPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  documentNumber?: string;
};
export type GuestList = {
  items: Guest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
