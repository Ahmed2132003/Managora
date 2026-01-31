import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useCreateLeaveBalanceMutation,
  useEmployees,
  useLeaveTypesQuery,
  useMyLeaveBalancesQuery,
} from "../../shared/hr/hooks";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import "../DashboardPage.css";
import "./LeaveBalancePage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  welcome: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  userFallback: string;
  summaryTitle: string;
  summarySubtitle: string;
  tableTitle: string;
  tableSubtitle: string;  
  tableHeaders: {
    type: string;
    year: string;
    allocated: string;
    used: string;
    remaining: string;
  };
  managerSectionTitle: string;
  managerSectionSubtitle: string;
  managerFormTitle: string;
  managerFormSubtitle: string;
  managerEmployeeLabel: string;
  managerLeaveTypeLabel: string;
  managerYearLabel: string;
  managerAllocatedLabel: string;
  managerSubmitLabel: string;
  managerEmployeesTitle: string;
  managerEmployeesSubtitle: string;
  managerEmployeeSearchPlaceholder: string;
  managerSelectEmployeeLabel: string;
  managerEmployeeEmptyState: string;
  managerSuccessMessage: string;
  managerErrorMessage: string;
  totals: {
    allocated: string;
    used: string;
    remaining: string;
  };  
  emptyState: string;
  loadingLabel: string;
  nav: {
    dashboard: string;
    users: string;
    attendanceSelf: string;
    leaveBalance: string;
    leaveRequest: string;
    leaveMyRequests: string;
    employees: string;
    departments: string;
    jobTitles: string;
    hrAttendance: string;
    leaveInbox: string;
    policies: string;
    hrActions: string;
    payroll: string;
    accountingSetup: string;
    journalEntries: string;
    expenses: string;
    collections: string;
    trialBalance: string;
    generalLedger: string;
    profitLoss: string;
    balanceSheet: string;
    agingReport: string;
    customers: string;
    newCustomer: string;
    invoices: string;
    newInvoice: string;
    alertsCenter: string;
    cashForecast: string;
    ceoDashboard: string;
    financeDashboard: string;
    hrDashboard: string;
    copilot: string;
    auditLogs: string;
    setupTemplates: string;
    setupProgress: string;
  };
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Leave Balance",
    pageSubtitle: "Track allocations, usage, and remaining days in one view.",
    userFallback: "Explorer",
    summaryTitle: "Balance summary",
    summarySubtitle: "Totals across all leave types",
    tableTitle: "Balance details",
    tableSubtitle: "Breakdown by leave type",
    tableHeaders: {
      type: "Leave type",
      year: "Year",
      allocated: "Allocated",
      used: "Used",
      remaining: "Remaining",
    },
    managerSectionTitle: "Team leave balances",
    managerSectionSubtitle:
      "Manage leave balances for employees in your company to avoid request errors.",
    managerFormTitle: "Add leave balance",
    managerFormSubtitle: "Assign a balance for a specific employee and leave type.",
    managerEmployeeLabel: "Employee",
    managerLeaveTypeLabel: "Leave type",
    managerYearLabel: "Year",
    managerAllocatedLabel: "Allocated days",
    managerSubmitLabel: "Add balance",
    managerEmployeesTitle: "Company employees",
    managerEmployeesSubtitle: "Select an employee to prefill the form.",
    managerEmployeeSearchPlaceholder: "Search employees...",
    managerSelectEmployeeLabel: "Select",
    managerEmployeeEmptyState: "No employees found yet.",
    managerSuccessMessage: "Leave balance added successfully.",
    managerErrorMessage: "Unable to add leave balance. Please review the details.",
    totals: {
      allocated: "Allocated balance",
      used: "Used balance",
      remaining: "Remaining balance",
    },    
    emptyState: "No leave balance recorded yet.",
    loadingLabel: "Loading...",
    nav: {
      dashboard: "Dashboard",
      users: "Users",
      attendanceSelf: "My Attendance",
      leaveBalance: "Leave Balance",
      leaveRequest: "Leave Request",
      leaveMyRequests: "My Leave Requests",
      employees: "Employees",
      departments: "Departments",
      jobTitles: "Job Titles",
      hrAttendance: "HR Attendance",
      leaveInbox: "Leave Inbox",
      policies: "Policies",
      hrActions: "HR Actions",
      payroll: "Payroll",
      accountingSetup: "Accounting Setup",
      journalEntries: "Journal Entries",
      expenses: "Expenses",
      collections: "Collections",
      trialBalance: "Trial Balance",
      generalLedger: "General Ledger",
      profitLoss: "Profit & Loss",
      balanceSheet: "Balance Sheet",
      agingReport: "AR Aging",
      customers: "Customers",
      newCustomer: "New Customer",
      invoices: "Invoices",
      newInvoice: "New Invoice",
      alertsCenter: "Alerts Center",
      cashForecast: "Cash Forecast",
      ceoDashboard: "CEO Dashboard",
      financeDashboard: "Finance Dashboard",
      hrDashboard: "HR Dashboard",
      copilot: "Copilot",
      auditLogs: "Audit Logs",
      setupTemplates: "Setup Templates",
      setupProgress: "Setup Progress",
    },
  },
  ar: {
    brand: "ماناجورا",
    welcome: "أهلًا بعودتك",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "رصيد الإجازات",
    pageSubtitle: "تابع المخصص والمستخدم والمتبقي في نظرة واحدة.",
    userFallback: "ضيف",
    summaryTitle: "ملخص الرصيد",
    summarySubtitle: "إجماليات كل الأنواع",
    tableTitle: "تفاصيل الرصيد",
    tableSubtitle: "التفاصيل حسب نوع الإجازة",
    tableHeaders: {
      type: "نوع الإجازة",
      year: "السنة",
      allocated: "المخصص",
      used: "المستخدم",
      remaining: "المتبقي",
    },
    managerSectionTitle: "أرصدة الإجازات للفريق",
    managerSectionSubtitle:
      "إدارة أرصدة الإجازات لموظفي الشركة لتجنب أخطاء طلب الإجازة.",
    managerFormTitle: "إضافة رصيد إجازات",
    managerFormSubtitle: "تعيين رصيد لموظف ونوع إجازة محدد.",
    managerEmployeeLabel: "الموظف",
    managerLeaveTypeLabel: "نوع الإجازة",
    managerYearLabel: "السنة",
    managerAllocatedLabel: "عدد الأيام المخصصة",
    managerSubmitLabel: "إضافة الرصيد",
    managerEmployeesTitle: "موظفو الشركة",
    managerEmployeesSubtitle: "اختر موظفًا لتعبئة النموذج تلقائيًا.",
    managerEmployeeSearchPlaceholder: "ابحث عن موظف...",
    managerSelectEmployeeLabel: "اختيار",
    managerEmployeeEmptyState: "لا يوجد موظفون حتى الآن.",
    managerSuccessMessage: "تمت إضافة رصيد الإجازات بنجاح.",
    managerErrorMessage: "تعذر إضافة رصيد الإجازات. تأكد من البيانات.",
    totals: {
      allocated: "الرصيد المخصص",
      used: "الرصيد المستخدم",
      remaining: "الرصيد المتبقي",
    },    
    emptyState: "لا يوجد رصيد مسجل بعد.",
    loadingLabel: "جاري التحميل...",
    nav: {
      dashboard: "لوحة التحكم",
      users: "المستخدمون",
      attendanceSelf: "حضوري",
      leaveBalance: "رصيد الإجازات",
      leaveRequest: "طلب إجازة",
      leaveMyRequests: "طلباتي",
      employees: "الموظفون",
      departments: "الأقسام",
      jobTitles: "المسميات الوظيفية",
      hrAttendance: "حضور الموارد البشرية",
      leaveInbox: "وارد الإجازات",
      policies: "السياسات",
      hrActions: "إجراءات الموارد البشرية",
      payroll: "الرواتب",
      accountingSetup: "إعداد المحاسبة",
      journalEntries: "قيود اليومية",
      expenses: "المصروفات",
      collections: "التحصيلات",
      trialBalance: "ميزان المراجعة",
      generalLedger: "دفتر الأستاذ",
      profitLoss: "الأرباح والخسائر",
      balanceSheet: "الميزانية العمومية",
      agingReport: "أعمار الديون",
      customers: "العملاء",
      newCustomer: "عميل جديد",
      invoices: "الفواتير",
      newInvoice: "فاتورة جديدة",
      alertsCenter: "مركز التنبيهات",
      cashForecast: "توقعات النقد",
      ceoDashboard: "لوحة CEO",
      financeDashboard: "لوحة المالية",
      hrDashboard: "لوحة الموارد البشرية",
      copilot: "المساعد",
      auditLogs: "سجل التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدم الإعداد",
    },
  },
};

function formatDays(value: string | number) {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toFixed(2);
}

export function LeaveBalancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-language")
        : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-theme")
        : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  const balancesQuery = useMyLeaveBalancesQuery();
  const meQuery = useMe();

  const totals = useMemo(() => {    
    const balances = balancesQuery.data ?? [];
    return balances.reduce(
      (acc, balance) => {
        acc.allocated += Number(balance.allocated_days);
        acc.used += Number(balance.used_days);
        acc.remaining += Number(balance.remaining_days);
        return acc;
      },
      { allocated: 0, used: 0, remaining: 0 }
    );
  }, [balancesQuery.data]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      {
        path: "/users",
        label: content.nav.users,
        icon: "👥",
        permissions: ["users.view"],
      },
      {
        path: "/attendance/self",
        label: content.nav.attendanceSelf,
        icon: "🕒",
      },
      {
        path: "/leaves/balance",
        label: content.nav.leaveBalance,
        icon: "📅",
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/request",
        label: content.nav.leaveRequest,
        icon: "📝",
        permissions: ["leaves.*"],
      },
      {
        path: "/leaves/my",
        label: content.nav.leaveMyRequests,
        icon: "📌",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍💼",
        permissions: ["employees.*", "hr.employees.view"],
      },
      {
        path: "/hr/departments",
        label: content.nav.departments,
        icon: "🏢",
        permissions: ["hr.departments.view"],
      },
      {
        path: "/hr/job-titles",
        label: content.nav.jobTitles,
        icon: "🧩",
        permissions: ["hr.job_titles.view"],
      },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "📍",
        permissions: ["attendance.*", "attendance.view_team"],
      },
      {
        path: "/hr/leaves/inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📚",
        permissions: ["employees.*"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "✅",
        permissions: ["approvals.*"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💸",
        permissions: ["hr.payroll.view", "hr.payroll.*"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "⚙️",
        permissions: ["accounting.manage_coa", "accounting.*"],
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📒",
        permissions: ["accounting.journal.view", "accounting.*"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "🧾",
        permissions: ["expenses.view", "expenses.*"],
      },
      {
        path: "/collections",
        label: content.nav.collections,
        icon: "💼",
        permissions: ["accounting.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/trial-balance",
        label: content.nav.trialBalance,
        icon: "📈",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/general-ledger",
        label: content.nav.generalLedger,
        icon: "📊",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/pnl",
        label: content.nav.profitLoss,
        icon: "📉",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧮",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/accounting/reports/ar-aging",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["accounting.reports.view", "accounting.*"],
      },
      {
        path: "/customers",
        label: content.nav.customers,
        icon: "🤝",
        permissions: ["customers.view", "customers.*"],
      },
      {
        path: "/customers/new",
        label: content.nav.newCustomer,
        icon: "➕",
        permissions: ["customers.create", "customers.*"],
      },
      {
        path: "/invoices",
        label: content.nav.invoices,
        icon: "📄",
        permissions: ["invoices.*"],
      },
      {
        path: "/invoices/new",
        label: content.nav.newInvoice,
        icon: "🧾",
        permissions: ["invoices.*"],
      },
      {
        path: "/analytics/alerts",
        label: content.nav.alertsCenter,
        icon: "🚨",
        permissions: ["analytics.alerts.view", "analytics.alerts.manage"],
      },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      {
        path: "/analytics/finance",
        label: content.nav.financeDashboard,
        icon: "💹",
      },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      { path: "/copilot", label: content.nav.copilot, icon: "🤖" },
      {
        path: "/admin/audit-logs",
        label: content.nav.auditLogs,
        icon: "🛡️",
        permissions: ["audit.view"],
      },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const visibleNavLinks = useMemo(() => {
    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [meQuery.data?.permissions, navLinks]);

  const userName =
    meQuery.data?.user.first_name ||
    meQuery.data?.user.username ||
    content.userFallback;

  const isManagerOrHr = useMemo(() => {
    if (meQuery.data?.user.is_superuser) {
      return true;
    }
    const roles = meQuery.data?.roles ?? [];
    return roles.some((role) => {
      const roleName = role.slug || role.name;
      return ["manager", "hr"].includes(roleName.toLowerCase());
    });
  }, [meQuery.data?.roles, meQuery.data?.user.is_superuser]);

  const [managerEmployeeSearch, setManagerEmployeeSearch] = useState("");
  const employeesQuery = useEmployees({
    filters: { status: "active" },
    search: managerEmployeeSearch,
    enabled: isManagerOrHr,
  });
  const leaveTypesQuery = useLeaveTypesQuery();
  const createLeaveBalanceMutation = useCreateLeaveBalanceMutation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [allocatedDays, setAllocatedDays] = useState("");
  const [managerStatus, setManagerStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filteredEmployees = useMemo(() => {
    const employees = employeesQuery.data ?? [];
    if (!managerEmployeeSearch) {
      return employees;
    }
    const search = managerEmployeeSearch.toLowerCase();
    return employees.filter((employee) =>
      `${employee.full_name} ${employee.employee_code}`.toLowerCase().includes(search)
    );
  }, [employeesQuery.data, managerEmployeeSearch]);

  async function handleAddLeaveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManagerStatus(null);

    if (!selectedEmployeeId || !selectedLeaveTypeId || !allocatedDays) {
      setManagerStatus({ type: "error", message: content.managerErrorMessage });
      return;
    }

    try {
      await createLeaveBalanceMutation.mutateAsync({
        employee: selectedEmployeeId,
        leave_type: selectedLeaveTypeId,
        year: selectedYear,
        allocated_days: Number(allocatedDays),
      });
      setManagerStatus({ type: "success", message: content.managerSuccessMessage });
      setAllocatedDays("");
    } catch {      
      setManagerStatus({ type: "error", message: content.managerErrorMessage });
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page leave-balance-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="dashboard-page__glow" aria-hidden="true" />
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <img src="/managora-logo.svg" alt="Managora logo" />
          <div>
            <span className="dashboard-brand__title">{content.brand}</span>
            <span className="dashboard-brand__subtitle">{content.subtitle}</span>
          </div>
        </div>
        <div className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder={content.searchPlaceholder}
            aria-label={content.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{userName}</strong>
            {meQuery.isLoading && (
              <span className="sidebar-note">...loading profile</span>
            )}
            {meQuery.isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic
                  ? "تعذر تحميل بيانات الحساب."
                  : "Unable to load account data."}
              </span>
            )}
          </div>
          <nav className="sidebar-nav" aria-label={content.navigationLabel}>
            <button
              type="button"
              className="nav-item"
              onClick={() =>
                setLanguage((prev) => (prev === "en" ? "ar" : "en"))
              }
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() =>
                setTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>
            <div className="sidebar-links">
              <span className="sidebar-links__title">
                {content.navigationLabel}
              </span>
              {visibleNavLinks.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  className={`nav-item${
                    location.pathname === link.path ? " nav-item--active" : ""
                  }`}
                  onClick={() => navigate(link.path)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {link.icon}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="pill-button" onClick={handleLogout}>
              {content.logoutLabel}
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="hero-panel leave-balance-hero">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.summaryTitle}</span>
                <span className="pill pill--accent">
                  {balancesQuery.isLoading ? content.loadingLabel : formatDays(totals.remaining)}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.totals.remaining,
                  value: formatDays(totals.remaining),
                },
                {
                  label: content.totals.used,
                  value: formatDays(totals.used),
                },
                {
                  label: content.totals.allocated,
                  value: formatDays(totals.allocated),
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.summaryTitle}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid-panels">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.summaryTitle}</h2>
                  <p>{content.summarySubtitle}</p>
                </div>
                <span className="pill">{balancesQuery.data?.length ?? 0}</span>
              </div>
              <div className="leave-balance-summary">
                <div className="leave-balance-card">
                  <span>{content.totals.remaining}</span>
                  <strong>{formatDays(totals.remaining)}</strong>
                </div>
                <div className="leave-balance-card">
                  <span>{content.totals.used}</span>
                  <strong>{formatDays(totals.used)}</strong>
                </div>
                <div className="leave-balance-card">
                  <span>{content.totals.allocated}</span>
                  <strong>{formatDays(totals.allocated)}</strong>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.tableTitle}</h2>
                  <p>{content.tableSubtitle}</p>
                </div>
                <span className="pill">
                  {balancesQuery.isLoading ? content.loadingLabel : content.tableHeaders.year}
                </span>
              </div>
              <div className="leave-table-wrapper">
                <table className="leave-table">
                  <thead>
                    <tr>
                      <th>{content.tableHeaders.type}</th>
                      <th>{content.tableHeaders.year}</th>
                      <th>{content.tableHeaders.allocated}</th>
                      <th>{content.tableHeaders.used}</th>
                      <th>{content.tableHeaders.remaining}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(balancesQuery.data ?? []).map((balance) => (
                      <tr key={balance.id}>
                        <td>{balance.leave_type.name}</td>
                        <td>{balance.year}</td>
                        <td>{formatDays(balance.allocated_days)}</td>
                        <td>{formatDays(balance.used_days)}</td>
                        <td>{formatDays(balance.remaining_days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!balancesQuery.isLoading && (balancesQuery.data ?? []).length === 0 && (
                <div className="leave-empty">{content.emptyState}</div>
              )}
            </div>
            {isManagerOrHr && (
              <div className="panel leave-balance-manager">
                <div className="panel__header">
                  <div>
                    <h2>{content.managerSectionTitle}</h2>
                    <p>{content.managerSectionSubtitle}</p>
                  </div>
                  <span className="pill">
                    {employeesQuery.data?.length ?? 0}
                  </span>
                </div>
                <div className="leave-balance-manager__grid">
                  <div className="leave-balance-manager__form">
                    <div className="panel__header">
                      <div>
                        <h3>{content.managerFormTitle}</h3>
                        <p>{content.managerFormSubtitle}</p>
                      </div>
                    </div>
                    <form onSubmit={handleAddLeaveBalance}>
                      <div className="leave-balance-manager__fields">
                        <label className="leave-balance-manager__field">
                          <span>{content.managerEmployeeLabel}</span>
                          <select
                            value={selectedEmployeeId ?? ""}
                            onChange={(event) =>
                              setSelectedEmployeeId(
                                event.target.value ? Number(event.target.value) : null
                              )
                            }
                          >
                            <option value="">
                              {content.managerEmployeeLabel}
                            </option>
                            {(employeesQuery.data ?? []).map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.full_name} • {employee.employee_code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="leave-balance-manager__field">
                          <span>{content.managerLeaveTypeLabel}</span>
                          <select
                            value={selectedLeaveTypeId ?? ""}
                            onChange={(event) =>
                              setSelectedLeaveTypeId(
                                event.target.value ? Number(event.target.value) : null
                              )
                            }
                          >
                            <option value="">
                              {content.managerLeaveTypeLabel}
                            </option>
                            {(leaveTypesQuery.data ?? []).map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="leave-balance-manager__row">
                          <label className="leave-balance-manager__field">
                            <span>{content.managerYearLabel}</span>
                            <input
                              type="number"
                              value={selectedYear}
                              onChange={(event) =>
                                setSelectedYear(Number(event.target.value))
                              }
                            />
                          </label>
                          <label className="leave-balance-manager__field">
                            <span>{content.managerAllocatedLabel}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={allocatedDays}
                              onChange={(event) => setAllocatedDays(event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="leave-balance-manager__actions">
                        <button
                          type="submit"
                          className="pill-button"
                          disabled={createLeaveBalanceMutation.isPending}
                        >
                          {createLeaveBalanceMutation.isPending
                            ? content.loadingLabel
                            : content.managerSubmitLabel}
                        </button>
                        {managerStatus && (
                          <span
                            className={`leave-balance-manager__status leave-balance-manager__status--${managerStatus.type}`}
                          >
                            {managerStatus.message}
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                  <div className="leave-balance-manager__list">
                    <div className="panel__header">
                      <div>
                        <h3>{content.managerEmployeesTitle}</h3>
                        <p>{content.managerEmployeesSubtitle}</p>
                      </div>
                      <input
                        className="leave-balance-manager__search"
                        type="text"
                        placeholder={content.managerEmployeeSearchPlaceholder}
                        value={managerEmployeeSearch}
                        onChange={(event) => setManagerEmployeeSearch(event.target.value)}
                      />
                    </div>
                    <div className="leave-table-wrapper">
                      <table className="leave-table leave-balance-manager__table">
                        <thead>
                          <tr>
                            <th>{content.managerEmployeeLabel}</th>
                            <th>{content.nav.departments}</th>
                            <th>{content.managerSelectEmployeeLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.map((employee) => (
                            <tr key={employee.id}>
                              <td>
                                {employee.full_name}
                                <div className="leave-balance-manager__meta">
                                  {employee.employee_code}
                                </div>
                              </td>
                              <td>{employee.department?.name ?? "-"}</td>
                              <td>
                                <button
                                  type="button"
                                  className="pill-button pill-button--ghost"
                                  onClick={() => setSelectedEmployeeId(employee.id)}
                                >
                                  {content.managerSelectEmployeeLabel}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!employeesQuery.isLoading && filteredEmployees.length === 0 && (
                      <div className="leave-empty">
                        {content.managerEmployeeEmptyState}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>          
        </main>
      </div>
    </div>
  );
}