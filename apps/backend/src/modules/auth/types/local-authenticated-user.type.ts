import type { Request } from 'express';

export type LocalAuthenticatedRole = {
  id: number;
  key: string;
  name: string;
};

export type LocalAuthenticatedDepartment = {
  id: number;
  key: string;
  name: string;
} | null;

export type LocalAuthenticatedUser = {
  id: number;
  email: string;
  fullName: string;
  status: string;
  tokenVersion: number;
  role: LocalAuthenticatedRole;
  department: LocalAuthenticatedDepartment;
  permissions: string[];
};

export type LocalAuthRequest = Request & {
  user: LocalAuthenticatedUser;
};
