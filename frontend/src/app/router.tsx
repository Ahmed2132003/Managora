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
import { JournalEntriesPage } from "../pages/accounting/JournalEntriesPage.tsx";
import { JournalEntryDetailsPage } from "../pages/accounting/JournalEntryDetailsPage.tsx";
import { ExpensesPage } from "../pages/accounting/ExpensesPage";
import { TrialBalancePage } from "../pages/accounting/TrialBalancePage.tsx";
import { GeneralLedgerPage } from "../pages/accounting/GeneralLedgerPage.tsx";
import { ProfitLossPage } from "../pages/accounting/ProfitLossPage.tsx";
import { BalanceSheetPage } from "../pages/accounting/BalanceSheetPage.tsx";
import { AgingReportPage } from "../pages/accounting/AgingReportPage";
import { CollectionsPage } from "../pages/accounting/CollectionsPage.tsx";
import { CustomersPage } from "../pages/customers/CustomersPage";
import { CustomerFormPage } from "../pages/customers/CustomerFormPage.tsx";
import { InvoiceDetailsPage } from "../pages/invoices/InvoiceDetailsPage.tsx";
import { InvoiceFormPage } from "../pages/invoices/InvoiceFormPage";
import { InvoicesPage } from "../pages/invoices/InvoicesPage";
import { AlertsCenterPage } from "../pages/analytics/AlertsCenterPage";
import { CashForecastPage } from "../pages/analytics/CashForecastPage.tsx";
import { CEODashboardPage } from "../pages/analytics/CEODashboardPage.tsx";
import { FinanceDashboardPage } from "../pages/analytics/FinanceDashboardPage.tsx";
import { HRDashboardPage } from "../pages/analytics/HRDashboardPage.tsx";
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
      { path: "accounting/journal-entries", element: <JournalEntriesPage /> },
      { path: "accounting/journal-entries/:id", element: <JournalEntryDetailsPage /> },
      { path: "accounting/expenses", element: <ExpensesPage /> },
      { path: "collections", element: <CollectionsPage /> },      
      { path: "accounting/reports/trial-balance", element: <TrialBalancePage /> },
      { path: "accounting/reports/general-ledger", element: <GeneralLedgerPage /> },
      { path: "accounting/reports/pnl", element: <ProfitLossPage /> },
      { path: "accounting/reports/balance-sheet", element: <BalanceSheetPage /> },
      { path: "accounting/reports/ar-aging", element: <AgingReportPage /> },      
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/new", element: <CustomerFormPage /> },
      { path: "customers/:id/edit", element: <CustomerFormPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "invoices/new", element: <InvoiceFormPage /> },
      { path: "invoices/:id", element: <InvoiceDetailsPage /> },
      { path: "analytics/alerts", element: <AlertsCenterPage /> },
      { path: "analytics/forecast", element: <CashForecastPage /> },      
      { path: "analytics/ceo", element: <CEODashboardPage /> },
      { path: "analytics/finance", element: <FinanceDashboardPage /> },
      { path: "analytics/hr", element: <HRDashboardPage /> },
    ],
  },                                                                                                                                  
  {    
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
