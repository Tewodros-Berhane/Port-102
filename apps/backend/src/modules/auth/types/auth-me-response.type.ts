import type { LocalAuthenticatedMembership } from './local-authenticated-user.type';

export type AuthMeResponse = {
  id: number;
  name: string;
  email: string;
  activeHotel: LocalAuthenticatedMembership['hotel'];
  membership: {
    id: number;
    role: LocalAuthenticatedMembership['role'];
    department: LocalAuthenticatedMembership['department'];
  };
  permissions: string[];
};
