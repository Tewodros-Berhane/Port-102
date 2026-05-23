import type {
  LocalAuthenticatedDepartment,
  LocalAuthenticatedRole,
} from './local-authenticated-user.type';
import type { TokenPair } from './token-pair.type';

export type LoginResponse = {
  status: 'authenticated';
  user: {
    id: number;
    email: string;
    fullName: string;
    status: string;
  };
  role: LocalAuthenticatedRole;
  department: LocalAuthenticatedDepartment;
  permissions: string[];
  tokens: TokenPair;
};
