export const PERMISSION_CODES = [
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "users.reset_password",  
  "employees.*",
  "employees.view_team",
  "attendance.*",
  "attendance.view_team",
  "leaves.*",
  "accounting.*",
  "expenses.*",
  "invoices.*",
  "approvals.*",
] as const;

export const ROLE_PERMISSIONS = {
  Admin: ["*"],
  HR: ["employees.*", "attendance.*", "leaves.*", "users.view"],
  Accountant: ["accounting.*", "expenses.*", "invoices.*"],
  Manager: ["approvals.*", "attendance.view_team", "employees.view_team"],
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
export type RoleName = keyof typeof ROLE_PERMISSIONS;