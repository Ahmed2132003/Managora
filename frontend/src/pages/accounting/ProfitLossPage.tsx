import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import {
  type ProfitLossAccount,
  useProfitLoss,
} from "../../shared/accounting/hooks";
import { useCan, hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { TablePagination, useClientPagination } from "../../shared/ui";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";
import "../DashboardPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  welcome: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  footer: string;
  userFallback: string;
  searchPlaceholder: string;
  pageTitle: string;
  pageSubtitle: string;
  summaryTitle: string;
  summarySubtitle: string;
  filtersTitle: string;
  filtersSubtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  rangeLabel: string;
  stats: {
    income: string;
    expenses: string;
    net: string;
    margin: string;
  };
  filters: {
    dateFrom: string;
    dateTo: string;
  };
  table: {
    account: string;
    name: string;
    type: string;
    debit: string;
    credit: string;
    net: string;
    loading: string;
    empty: string;
  };
  actions: {
    exportCsv: string;
  };
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
    catalog: string;
    sales: string;
    alertsCenter: string;
    cashForecast: string;
    ceoDashboard: string;
    financeDashboard: string;
    hrDashboard: string;
    auditLogs: string;
    setupTemplates: string;
    setupProgress: string;
  };
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    welcome: "Welcome back",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchPlaceholder: "Search P&L accounts...",
    pageTitle: "Profit & Loss",
    pageSubtitle: "Understand profitability across income and expenses.",
    summaryTitle: "Performance Snapshot",
    summarySubtitle: "Income, expenses, and profitability at a glance.",
    filtersTitle: "Filters",
    filtersSubtitle: "Select a period to refresh the report.",
    tableTitle: "Income & expenses",
    tableSubtitle: "Breakdown by account for the selected period.",
    rangeLabel: "Last 30 days",
    stats: {
      income: "Income",
      expenses: "Expenses",
      net: "Net profit",
      margin: "Profit margin",
    },
    filters: {
      dateFrom: "Date from",
      dateTo: "Date to",
    },
    table: {
      account: "Account",
      name: "Name",
      type: "Type",
      debit: "Debit",
      credit: "Credit",
      net: "Net",
      loading: "Loading P&L...",
      empty: "Select a date range to view the P&L.",
    },
    actions: {
      exportCsv: "Export CSV",
    },
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
      catalog: "Products & Services",
      sales: "Sales",
      alertsCenter: "Alerts Center",
      cashForecast: "Cash Forecast",
      ceoDashboard: "CEO Dashboard",
      financeDashboard: "Finance Dashboard",
      hrDashboard: "HR Dashboard",
      auditLogs: "Audit Logs",
      setupTemplates: "Setup Templates",
      setupProgress: "Setup Progress",
    },
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    welcome: "أهلًا بعودتك",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchPlaceholder: "ابحث في حسابات الأرباح والخسائر...",
    pageTitle: "الأرباح والخسائر",
    pageSubtitle: "تابع الأداء المالي بين الإيرادات والمصروفات.",
    summaryTitle: "ملخص الأداء",
    summarySubtitle: "نظرة سريعة على الربحية.",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "اختر الفترة لعرض التقرير.",
    tableTitle: "الإيرادات والمصروفات",
    tableSubtitle: "تفصيل الحسابات للفترة المحددة.",
    rangeLabel: "آخر ٣٠ يوم",
    stats: {
      income: "الإيرادات",
      expenses: "المصروفات",
      net: "صافي الربح",
      margin: "هامش الربح",
    },
    filters: {
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
    },
    table: {
      account: "الحساب",
      name: "الاسم",
      type: "النوع",
      debit: "مدين",
      credit: "دائن",
      net: "الصافي",
      loading: "جاري تحميل التقرير...",
      empty: "اختر فترة لعرض التقرير.",
    },
    actions: {
      exportCsv: "تصدير CSV",
    },
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
      catalog: "الخدمات والمنتجات",
      sales: "المبيعات",
      alertsCenter: "مركز التنبيهات",
      cashForecast: "توقعات النقد",
      ceoDashboard: "لوحة CEO",
      financeDashboard: "لوحة المالية",
      hrDashboard: "لوحة الموارد البشرية",
      auditLogs: "سجل التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدم الإعداد",
    },
  },
};

export function ProfitLossPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(
    () => data?.permissions ?? [],
    [data?.permissions]
  );
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;

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

  const pnlQuery = useProfitLoss(dateFrom || undefined, dateTo || undefined);
  const canExport = useCan("export.accounting");

  const allRows = useMemo<ProfitLossAccount[]>(() => {    
    if (!pnlQuery.data) {
      return [];
    }
    return [...pnlQuery.data.income_accounts, ...pnlQuery.data.expense_accounts];
  }, [pnlQuery.data]);

  const incomeTotal = useMemo(() => {
    const total = Number(pnlQuery.data?.income_total ?? 0);
    return Math.abs(total);
  }, [pnlQuery.data?.income_total]);
  const expenseTotal = useMemo(() => {
    const total = Number(pnlQuery.data?.expense_total ?? 0);
    return Math.abs(total);
  }, [pnlQuery.data?.expense_total]);
  const netProfit = useMemo(
    () => incomeTotal - expenseTotal,
    [expenseTotal, incomeTotal]
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return allRows;      
    }
    return allRows.filter((row: ProfitLossAccount) => {      
      return (
        row.code.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query)
      );
    });
  }, [allRows, searchTerm]);

  const profitMargin = useMemo(() => {
    if (incomeTotal === 0) {      
      return 0;
    }
    return (netProfit / incomeTotal) * 100;
  }, [incomeTotal, netProfit]);

  const {
    page,
    setPage,
    totalPages,
    paginatedRows,
  } = useClientPagination(filteredRows, 10);

  function handleExport() {
    if (!pnlQuery.data) {
      return;
    }
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit", "Net"];
    const rows = allRows.map((row) => [
      row.code,
      row.name,
      row.type,
      row.debit,
      row.credit,
      row.net,
    ]);
    downloadCsv(
      `pnl-${dateFrom || "start"}-${dateTo || "end"}.csv`,
      headers,
      rows
    );
  }

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
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
        path: "/employee/self-service",
        label:
          language === "ar"
            ? "الخدمات الذاتية للموظف"
            : "Employee Self-Service",
        icon: "🧑‍💼",
      },
      {
        path: "/messages",
        label: language === "ar" ? "الرسائل" : "Messages",
        icon: "✉️",
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
        path: "/catalog",
        label: content.nav.catalog,
        icon: "📦",
        permissions: ["catalog.*", "invoices.*"],
      },
      {
        path: "/sales",
        label: content.nav.sales,
        icon: "🛒",
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
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      {
        path: "/admin/audit-logs",
        label: content.nav.auditLogs,
        icon: "🛡️",
        permissions: ["audit.view"],
      },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav, language]
  );

  const appRole = resolvePrimaryRole(data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);

  const visibleNavLinks = useMemo(() => {
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }

      if (appRole === "accountant") {
        return true;
      }

      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [allowedRolePaths, appRole, navLinks, userPermissions]);

  if (isForbiddenError(pnlQuery.error)) {
    return <AccessDenied />;
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page"
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
            <p>{content.welcome}</p>
            <strong>{userName}</strong>
            {isLoading && <span className="sidebar-note">...loading profile</span>}
            {isError && (
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
              onClick={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>
            <div className="sidebar-links">
              <span className="sidebar-links__title">{content.navigationLabel}</span>
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
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {new Date().toLocaleDateString(isArabic ? "ar" : "en")}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.income,
                  value: formatAmount(incomeTotal),                  
                },
                {
                  label: content.stats.expenses,
                  value: formatAmount(expenseTotal),                  
                },
                {
                  label: content.stats.net,
                  value: formatAmount(netProfit),                  
                },
                {
                  label: content.stats.margin,
                  value: `${profitMargin.toFixed(1)}%`,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.rangeLabel}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
              <div className="panel-actions panel-actions--right">
                <button
                  type="button"
                  className={`action-button action-button--ghost${
                    !canExport || !pnlQuery.data ? " action-button--disabled" : ""
                  }`}
                  onClick={handleExport}
                  disabled={!canExport || !pnlQuery.data}
                >
                  {content.actions.exportCsv}
                </button>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.filters.dateFrom}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.dateTo}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.tableTitle}</h2>
                <p>{content.tableSubtitle}</p>
              </div>
            </div>
            <div className="table-wrapper">
              {pnlQuery.isLoading ? (
                <p className="helper-text">{content.table.loading}</p>
              ) : filteredRows.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.table.account}</th>
                      <th>{content.table.name}</th>
                      <th>{content.table.type}</th>
                      <th>{content.table.debit}</th>
                      <th>{content.table.credit}</th>
                      <th>{content.table.net}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row: ProfitLossAccount) => (                      
                      <tr key={row.account_id}>
                        <td>{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.type}</td>
                        <td>{formatAmount(row.debit)}</td>
                        <td>{formatAmount(row.credit)}</td>
                        <td>{formatAmount(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="helper-text">{content.table.empty}</p>
              )}
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPreviousPage={() => setPage((prev: number) => prev - 1)}
                onNextPage={() => setPage((prev: number) => prev + 1)}                
                disabled={!filteredRows.length || pnlQuery.isLoading}
              />
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}