import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../shared/ui/AppLayout";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { UsersPage } from "../pages/UsersPage.tsx";
import { RequireAuth } from "./RequireAuth";
import { EmployeesPage } from "../pages/hr/EmployeesPage";
import { EmployeeProfilePage } from "../pages/hr/EmployeeProfilePage";
import { DepartmentsPage } from "../pages/hr/DepartmentsPage";
import { JobTitlesPage } from "../pages/hr/JobTitlesPage";

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
