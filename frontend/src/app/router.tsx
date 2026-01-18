import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../shared/ui/AppLayout.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { DashboardPage } from "../pages/DashboardPage.tsx";
import { UsersPage } from "../pages/UsersPage.tsx";
import { RequireAuth } from "./RequireAuth";
import { EmployeesPage } from "../pages/hr/EmployeesPage.tsx";
import { EmployeeProfilePage } from "../pages/hr/EmployeeProfilePage.tsx";
import { DepartmentsPage } from "../pages/hr/DepartmentsPage.tsx";
import { JobTitlesPage } from "../pages/hr/JobTitlesPage.tsx";

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
      { path: "users", element: <UsersPage /> },
      { path: "hr/employees", element: <EmployeesPage /> },
      { path: "hr/employees/:id", element: <EmployeeProfilePage /> },
      { path: "hr/departments", element: <DepartmentsPage /> },
      { path: "hr/job-titles", element: <JobTitlesPage /> },
    ],
  },         
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
