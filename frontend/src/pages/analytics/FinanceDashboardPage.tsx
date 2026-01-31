import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { useAnalyticsSummary, useAnalyticsBreakdown } from "../../shared/analytics/insights.ts";
import { useAlerts } from "../../shared/analytics/hooks";
import { useCashForecast } from "../../shared/analytics/forecast";
import { useAgingReport } from "../../shared/accounting/hooks";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { formatCurrency } from "../../shared/analytics/format.ts";
import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./FinanceDashboardPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  rangeLabel: string;
  welcome: string;
  footer: string;
  userFallback: string;
  loadingLabel: string;
  searchResultsTitle: string;
  searchResultsSubtitle: string;
  searchEmptyTitle: string;
  searchEmptySubtitle: string;
  page: {
    title: string;
    subtitle: string;
    rangeTitle: string;
    rangeSubtitle: string;
    rangeHint: string;
    rangeOptions: {
      seven: string;
      thirty: string;
      ninety: string;
      custom: string;
    };
    stats: {
      cashBalance: string;
      receivables: string;
      expenseAlert: string;
      forecastNet: string;
    };
    charts: {
      expenseCategory: string;
      expenseCategorySubtitle: string;
      cashForecast: string;
      cashForecastSubtitle: string;
      vendors: string;
      vendorsEmpty: string;
    };
    expenseAlertOpen: string;
    expenseAlertOk: string;
    expenseAlertEmpty: string;
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
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    rangeLabel: "Last 30 days",
    welcome: "Welcome back",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    loadingLabel: "Loading...",
    searchResultsTitle: "Search results",
    searchResultsSubtitle: "Live data matched in your dashboard",
    searchEmptyTitle: "No results found",
    searchEmptySubtitle: "Try another keyword or check spelling.",
    page: {
      title: "Finance Dashboard",
      subtitle: "Cash, receivables, and vendor spending in one view.",
      rangeTitle: "Timeline",
      rangeSubtitle: "Choose the reporting range for insights.",
      rangeHint: "Select start and end dates to show results.",
      rangeOptions: {
        seven: "7 days",
        thirty: "30 days",
        ninety: "90 days",
        custom: "Custom",
      },
      stats: {
        cashBalance: "Current cash balance",
        receivables: "Open receivables",
        expenseAlert: "Expense spike alert",
        forecastNet: "Forecast net (next 30d)",
      },
      charts: {
        expenseCategory: "Expense by category",
        expenseCategorySubtitle: "Top 6 categories",
        cashForecast: "Cash forecast",
        cashForecastSubtitle: "In, out, and net",
        vendors: "Top vendors",
        vendorsEmpty: "No vendor data available.",
      },
      expenseAlertOpen: "Open",
      expenseAlertOk: "OK",
      expenseAlertEmpty: "No expense spikes detected.",
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
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    rangeLabel: "آخر ٣٠ يوم",
    welcome: "أهلًا بعودتك",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    loadingLabel: "جاري التحميل...",
    searchResultsTitle: "نتائج البحث",
    searchResultsSubtitle: "بيانات مباشرة مطابقة لكلماتك",
    searchEmptyTitle: "لا توجد نتائج",
    searchEmptySubtitle: "جرّب كلمة مختلفة أو تحقق من الإملاء.",
    page: {
      title: "لوحة المالية",
      subtitle: "ملخص السيولة والمصروفات والذمم المدينة.",
      rangeTitle: "النطاق الزمني",
      rangeSubtitle: "حدد الفترة المطلوبة لتحليل المؤشرات.",
      rangeHint: "اختر تاريخ البداية والنهاية لعرض البيانات.",
      rangeOptions: {
        seven: "٧ أيام",
        thirty: "٣٠ يوم",
        ninety: "٩٠ يوم",
        custom: "مخصص",
      },
      stats: {
        cashBalance: "رصيد النقدية الحالي",
        receivables: "إجمالي الذمم المدينة",
        expenseAlert: "تنبيه مصروفات مرتفعة",
        forecastNet: "صافي التوقع (30 يوم)",
      },
      charts: {
        expenseCategory: "المصروفات حسب الفئة",
        expenseCategorySubtitle: "أعلى 6 فئات",
        cashForecast: "توقع السيولة",
        cashForecastSubtitle: "الداخل والخارج والصافي",
        vendors: "أعلى الموردين",
        vendorsEmpty: "لسه مفيش داتا.",
      },
      expenseAlertOpen: "مفتوح",
      expenseAlertOk: "جيد",
      expenseAlertEmpty: "لا توجد طفرات مصروفات.",
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

export function FinanceDashboardPage() {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const content = useMemo(() => contentMap[language], [language]);
  const userPermissions = data?.permissions ?? [];
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;
  const isArabic = language === "ar";

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

  const selection = useMemo(
    () => buildRangeSelection(range, customStart, customEnd),
    [range, customStart, customEnd]
  );

  const summaryQuery = useAnalyticsSummary(selection.rangeParam);
  const alertsQuery = useAlerts({ status: "open", range: selection.rangeParam });
  const forecastQuery = useCashForecast();
  const agingQuery = useAgingReport();
  const expensesByCategoryQuery = useAnalyticsBreakdown(
    "expense_by_category_daily",
    "expense_category",
    selection.end,
    6
  );
  const vendorsQuery = useAnalyticsBreakdown(
    "expense_by_vendor_daily",
    "vendor",
    selection.end,
    5
  );

  const expenseSpikeAlert = useMemo(() => {
    return (alertsQuery.data ?? []).find((alert) => alert.rule_key === "expense_spike");
  }, [alertsQuery.data]);

  const arTotal = useMemo(() => {
    if (!agingQuery.data?.length) {
      return null;
    }
    const total = agingQuery.data.reduce((sum, row) => sum + Number(row.total_due ?? 0), 0);
    return formatCurrency(String(total));
  }, [agingQuery.data]);

  const forecastChartData = useMemo(() => {
    return (forecastQuery.data ?? []).map((snapshot) => ({
      horizon: `${snapshot.horizon_days} ${isArabic ? "يوم" : "days"}`,
      inflows: Number(snapshot.expected_inflows),
      outflows: Number(snapshot.expected_outflows),
      net: Number(snapshot.net_expected),
    }));
  }, [forecastQuery.data, isArabic]);

  const expenseCategoryData = useMemo(() => {
    return (expensesByCategoryQuery.data?.items ?? []).map((item) => ({
      name: item.dimension_id,
      amount: Number(item.amount ?? 0),
    }));
  }, [expensesByCategoryQuery.data]);

  const forecast30 = useMemo(() => {
    return (forecastQuery.data ?? []).find((snapshot) => snapshot.horizon_days === 30);
  }, [forecastQuery.data]);

  const showCustomHint = range === "custom" && (!selection.start || !selection.end);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case "7d":
        return content.page.rangeOptions.seven;
      case "30d":
        return content.page.rangeOptions.thirty;
      case "90d":
        return content.page.rangeOptions.ninety;
      case "custom":
        return content.page.rangeOptions.custom;
      default:
        return content.page.rangeOptions.thirty;
    }
  }, [content.page.rangeOptions, range]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const results: Array<{ label: string; description: string }> = [];

    results.push(
      {
        label: content.page.stats.cashBalance,
        description: formatCurrency(summaryQuery.data?.cash_balance_latest ?? null),
      },
      {
        label: content.page.stats.receivables,
        description: arTotal ?? "-",
      },
      {
        label: content.page.stats.expenseAlert,
        description: expenseSpikeAlert ? expenseSpikeAlert.title : content.page.expenseAlertEmpty,
      },
      {
        label: content.page.stats.forecastNet,
        description: formatCurrency(forecast30?.net_expected ?? null),
      }
    );

    vendorsQuery.data?.items?.forEach((vendor) => {
      results.push({
        label: vendor.dimension_id,
        description: formatCurrency(vendor.amount ?? null),
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    arTotal,
    content.page.expenseAlertEmpty,
    content.page.stats,
    expenseSpikeAlert,
    forecast30?.net_expected,
    searchTerm,
    summaryQuery.data,
    vendorsQuery.data?.items,
  ]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
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
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
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
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [navLinks, userPermissions]);

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
                {isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account data."}
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
              <h1>{content.page.title}</h1>
              <p>{content.page.subtitle}</p>
              <div className="hero-tags">
                <span className="pill">{rangeLabel}</span>
                <span className="pill pill--accent">
                  {selection.start && selection.end
                    ? `${selection.start} → ${selection.end}`
                    : content.rangeLabel}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.page.stats.cashBalance,
                  value: formatCurrency(summaryQuery.data?.cash_balance_latest ?? null),
                },
                {
                  label: content.page.stats.receivables,
                  value: arTotal ?? "-",
                },
                {
                  label: content.page.stats.expenseAlert,
                  value: expenseSpikeAlert ? expenseSpikeAlert.title : content.page.expenseAlertEmpty,
                },
                {
                  label: content.page.stats.forecastNet,
                  value: formatCurrency(forecast30?.net_expected ?? null),
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{rangeLabel}</span>
                  </div>
                  <strong>{summaryQuery.isLoading ? content.loadingLabel : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.page.rangeTitle}</h2>
                <p>{content.page.rangeSubtitle}</p>
              </div>
              <span className="pill pill--accent">{rangeLabel}</span>
            </div>
            <div className="panel-actions">
              {[
                { value: "7d" as RangeOption, label: content.page.rangeOptions.seven },
                { value: "30d" as RangeOption, label: content.page.rangeOptions.thirty },
                { value: "90d" as RangeOption, label: content.page.rangeOptions.ninety },
                { value: "custom" as RangeOption, label: content.page.rangeOptions.custom },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`action-button${
                    range === option.value ? "" : " action-button--ghost"
                  }`}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="filters-grid">
                <label className="field">
                  <span>{isArabic ? "من" : "From"}</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{isArabic ? "إلى" : "To"}</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </label>
              </div>
            )}
            {showCustomHint && <p className="helper-text">{content.page.rangeHint}</p>}
          </section>

          {searchTerm.trim().length > 0 && (
            <section className="search-results" aria-live="polite">
              <div className="search-results__header">
                <div>
                  <h2>{content.searchResultsTitle}</h2>
                  <p>{content.searchResultsSubtitle}</p>
                </div>
                <span className="pill pill--accent">{searchResults.length}</span>
              </div>
              {searchResults.length ? (
                <ul className="search-results__list">
                  {searchResults.map((result, index) => (
                    <li key={`${result.label}-${index}`}>
                      <strong>{result.label}</strong>
                      <span>{result.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-results__empty">
                  <strong>{content.searchEmptyTitle}</strong>
                  <span>{content.searchEmptySubtitle}</span>
                </div>
              )}
            </section>
          )}

          <section className="grid-panels">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.expenseCategory}</h2>
                  <p>{content.page.charts.expenseCategorySubtitle}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {expensesByCategoryQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : expenseCategoryData.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={expenseCategoryData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                      <Bar dataKey="amount" name={isArabic ? "الإجمالي" : "Total"} fill="#228be6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <span className="helper-text">{content.searchEmptyTitle}</span>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.cashForecast}</h2>
                  <p>{content.page.charts.cashForecastSubtitle}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {forecastQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : forecastChartData.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={forecastChartData}>
                      <XAxis dataKey="horizon" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="inflows"
                        name={isArabic ? "الداخل" : "Inflows"}
                        stroke="#2f9e44"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="outflows"
                        name={isArabic ? "الخارج" : "Outflows"}
                        stroke="#f03e3e"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        name={isArabic ? "الصافي" : "Net"}
                        stroke="#1971c2"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <span className="helper-text">{content.searchEmptyTitle}</span>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.vendors}</h2>
                  <p>{isArabic ? "قائمة بالموردين الأكثر إنفاقًا" : "Highest spend vendors"}</p>
                </div>
              </div>
              {vendorsQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : vendorsQuery.data?.items?.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "المورد" : "Vendor"}</th>
                        <th>{isArabic ? "الإجمالي" : "Total"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorsQuery.data.items.map((item) => (
                        <tr key={item.dimension_id}>
                          <td>{item.dimension_id}</td>
                          <td>{formatCurrency(item.amount ?? null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <span className="helper-text">{content.page.charts.vendorsEmpty}</span>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}