export type Permission = {
  id: number;
  key: string;
  name: string;
  category: string;
  description: string | null;
};
export type RoleRow = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
};
export type RolesResponse = { items: RoleRow[] };
export type RolePayload = {
  key: string;
  name: string;
  description?: string | null;
  permissionKeys?: string[];
};
