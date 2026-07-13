export type UserRole = "admin" | "manager" | "staff" | "reception";

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    "dashboard",
    "pos",
    "members",
    "vehicles",
    "services",
    "products",
    "orders",
    "reports",
    "inspection",
    "employees",
    "settings",
    "appointments",
  ],

  manager: [
    "dashboard",
    "pos",
    "members",
    "vehicles",
    "services",
    "products",
    "orders",
    "reports",
    "inspection",
    "appointments",
  ],

  staff: [
    "dashboard",
    "pos",
    "members",
    "vehicles",
    "orders",
    "inspection",
    "appointments",
  ],

  reception: [
    "dashboard",
    "pos",
    "members",
    "vehicles",
    "orders",
    "appointments",
  ],
};

export function hasPermission(role: string | undefined, permission: string) {
  if (!role) return false;

  const safeRole = role.toLowerCase() as UserRole;

  return rolePermissions[safeRole]?.includes(permission) ?? false;
}