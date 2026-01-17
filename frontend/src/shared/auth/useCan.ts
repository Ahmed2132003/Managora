import { useMemo } from "react";
import { useMe } from "./useMe";

export function hasPermission(permissions: string[], permission: string) {
  if (permissions.includes("*")) {
    return true;
  }
  if (permissions.includes(permission)) {
    return true;
  }
  const [prefix] = permission.split(".");
  return permissions.includes(`${prefix}.*`);
}

export function useCan(permission: string) {
  const { data } = useMe();

  return useMemo(() => {
    return hasPermission(data?.permissions ?? [], permission);
  }, [data?.permissions, permission]);
}