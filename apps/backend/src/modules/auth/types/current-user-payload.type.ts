export type CurrentUserPayload = {
  sub: number;
  email: string;
  roleKey: string;
  roleId: number;
  departmentId?: number | null;
  tokenVersion: number;
};
