import type { Request } from 'express';

export type LocalAuthenticatedMembership = {
  id: number;
  hotel: {
    id: number;
    name: string;
    code: string;
  };
  role: {
    id: number;
    key: string;
    name: string;
  };
  department: {
    id: number;
    key: string;
    name: string;
  } | null;
};

export type LocalAuthenticatedUser = {
  id: number;
  email: string;
  fullName: string;
  tokenVersion: number;
  memberships: LocalAuthenticatedMembership[];
};

export type LocalAuthRequest = Request & {
  user: LocalAuthenticatedUser;
};
