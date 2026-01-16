import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasAccessToken } from "../shared/auth/tokens";

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();

  if (!hasAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}