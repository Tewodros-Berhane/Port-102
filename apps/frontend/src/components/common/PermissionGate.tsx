import { hasAllPermissions, hasAnyPermission } from "@/lib/permissions";
export function PermissionGate({
  permissions,
  required,
  requireAll = false,
  fallback = null,
  children,
}: {
  permissions: readonly string[];
  required: string | readonly string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const needs = typeof required === "string" ? [required] : required;
  const allowed = requireAll
    ? hasAllPermissions(permissions, needs)
    : hasAnyPermission(permissions, needs);
  return allowed ? children : fallback;
}
