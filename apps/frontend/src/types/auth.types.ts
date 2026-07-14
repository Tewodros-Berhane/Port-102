export type Role = { id: number; key: string; name: string };
export type Department = { id: number; key: string; name: string } | null;
export type Session = {
  id: number; fullName: string; email: string; status: string;
  role: Role; department: Department; permissions: string[];
};
export type LoginPayload = { email: string; password: string };
export type BackendLogin = {
  status: "authenticated";
  user: { id: number; email: string; fullName: string; status: string };
  role: Role; department: Department; permissions: string[];
  tokens: { accessToken: string; refreshToken: string; tokenType: "Bearer"; expiresIn: string };
};
