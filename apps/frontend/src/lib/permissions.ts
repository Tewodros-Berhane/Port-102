export function hasPermission(permissions: readonly string[], permission: string) { return permissions.includes(permission); }
export function hasAnyPermission(permissions: readonly string[], required: readonly string[]) { return required.some((item) => permissions.includes(item)); }
export function hasAllPermissions(permissions: readonly string[], required: readonly string[]) { return required.every((item) => permissions.includes(item)); }
