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
import { SelfAttendancePage } from "../pages/attendance/SelfAttendancePage.tsx";
import { HRAttendancePage } from "../pages/hr/HRAttendancePage";
import { LeaveBalancePage } from "../pages/leaves/LeaveBalancePage";
import { LeaveMyRequestsPage } from "../pages/leaves/LeaveMyRequestsPage.tsx";
import { LeaveRequestPage } from "../pages/leaves/LeaveRequestPage.tsx";
import { LeaveInboxPage } from "../pages/hr/LeaveInboxPage.tsx";
import { PoliciesPage } from "../pages/hr/PoliciesPage.tsx";
import { HRActionsPage } from "../pages/hr/HRActionsPage.tsx";
import { PayrollPage } from "../pages/hr/PayrollPage";
import { PayrollPeriodDetailsPage } from "../pages/hr/PayrollPeriodDetailsPage";
import { AccountingSetupWizardPage } from "../pages/accounting/AccountingSetupWizardPage";
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
      { path: "attendance/self", element: <SelfAttendancePage /> },
      { path: "leaves/balance", element: <LeaveBalancePage /> },
      { path: "leaves/request", element: <LeaveRequestPage /> },
      { path: "leaves/my", element: <LeaveMyRequestsPage /> },
      { path: "hr/employees", element: <EmployeesPage /> },
      { path: "hr/employees/:id", element: <EmployeeProfilePage /> },
      { path: "hr/departments", element: <DepartmentsPage /> },
      { path: "hr/job-titles", element: <JobTitlesPage /> },
      { path: "hr/attendance", element: <HRAttendancePage /> },
      { path: "hr/leaves/inbox", element: <LeaveInboxPage /> },
      { path: "hr/policies", element: <PoliciesPage /> },
      { path: "hr/actions", element: <HRActionsPage /> },
      { path: "payroll", element: <PayrollPage /> },
      { path: "payroll/periods/:id", element: <PayrollPeriodDetailsPage /> },
      { path: "accounting/setup", element: <AccountingSetupWizardPage /> },
    ],
  },                                                                                                                                                
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
