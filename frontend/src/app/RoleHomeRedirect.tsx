import { Navigate } from "react-router-dom";
import { useMe } from "../shared/auth/useMe";
import { getDefaultPathForRole, resolvePrimaryRole } from "../shared/auth/roleNavigation";

export function RoleHomeRedirect() {
  const meQuery = useMe();

  if (meQuery.isLoading) {
    return <p className="helper-text">Loading...</p>;
  }

  const role = resolvePrimaryRole(meQuery.data);
  const targetPath = getDefaultPathForRole(role);

  return <Navigate to={targetPath} replace />;
}