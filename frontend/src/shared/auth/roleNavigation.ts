import type { MeResponse } from "./useMe";

export type AppRole = "manager" | "hr" | "accountant" | "employee";

const ROLE_PRIORITY: AppRole[] = ["manager", "hr", "accountant", "employee"];

export function resolvePrimaryRole(me?: MeResponse): AppRole | null {
  if (!me) {
    return null;
  }
  if (me.user.is_superuser) {
    return "manager";
  }

  const roleSet = new Set(
    me.roles.map((role) => (role.slug || role.name || "").trim().toLowerCase())
  );

  return ROLE_PRIORITY.find((role) => roleSet.has(role)) ?? null;
}

export function getDefaultPathForRole(role: AppRole | null): string {
  if (role === "hr") {
    return "/analytics/hr";
  }
  if (role === "accountant") {
    return "/analytics/finance";
  }
  if (role === "employee") {
    return "/employee/self-service";
  }
  return "/dashboard";
}
