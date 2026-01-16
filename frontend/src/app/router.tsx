import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../shared/ui/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { RequireAuth } from "./RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
    ],
  },  
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
