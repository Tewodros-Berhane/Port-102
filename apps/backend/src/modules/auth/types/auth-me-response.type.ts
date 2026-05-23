import type {
  LocalAuthenticatedDepartment,
  LocalAuthenticatedRole,
} from './local-authenticated-user.type';

export type AuthMeResponse = {
  id: number;
  fullName: string;
  email: string;
  status: string;
  role: LocalAuthenticatedRole;
  department: LocalAuthenticatedDepartment;
  permissions: string[];
};
