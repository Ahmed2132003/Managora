import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import {
  useAnalyticsSummary,
  useAnalyticsKpis,
  useAnalyticsBreakdown,
} from "../../shared/analytics/insights.ts";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { formatNumber, formatPercent } from "../../shared/analytics/format.ts";
import {
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./HRDashboardPage.css";

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
      absenceAvg: string;
      latenessAvg: string;
      overtimeTotal: string;
    };
    charts: {
      absenceTrend: string;
      latenessTrend: string;
      breakdownTitle: string;
      breakdownEmpty: string;
    };
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
      title: "HR Dashboard",
      subtitle: "Track absence, lateness, and overtime trends.",
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
        absenceAvg: "Average absence",
        latenessAvg: "Average lateness",
        overtimeTotal: "Overtime hours",
      },
      charts: {
        absenceTrend: "Absence trend",
        latenessTrend: "Lateness trend",
        breakdownTitle: "Top absence departments",
        breakdownEmpty: "No absence data yet.",        
      },
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
      title: "لوحة الموارد البشرية",
      subtitle: "متابعة الغياب والتأخير والساعات الإضافية.",
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
        absenceAvg: "متوسط الغياب",
        latenessAvg: "متوسط التأخير",
        overtimeTotal: "ساعات إضافية",
      },
      charts: {
        absenceTrend: "اتجاه الغياب",
        latenessTrend: "اتجاه التأخير",
        breakdownTitle: "أكثر الأقسام غيابًا",
        breakdownEmpty: "لسه مفيش داتا للغياب.",        
      },
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

const kpiKeys = ["absence_rate_daily", "lateness_rate_daily", "overtime_hours_daily"];

function buildChartData(series: Array<{ key: string; points: { date: string; value: string | null }[] }>) {
  const valuesByDate = new Map<string, Record<string, number | null>>();

  series.forEach((kpi) => {
    kpi.points.forEach((point) => {
      const entry = valuesByDate.get(point.date) ?? {};
      entry[kpi.key] = point.value ? Number(point.value) : null;
      valuesByDate.set(point.date, entry);
    });
  });

  return Array.from(valuesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      absence: values.absence_rate_daily ?? 0,
      lateness: values.lateness_rate_daily ?? 0,
      overtime: values.overtime_hours_daily ?? 0,
    }));
}

export function HRDashboardPage() {
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
  const kpisQuery = useAnalyticsKpis(kpiKeys, selection.start, selection.end);
  const breakdownQuery = useAnalyticsBreakdown(
    "absence_by_department_daily",    
    "department",
    selection.end,
    5
  );

  const chartData = useMemo(() => {
    if (!kpisQuery.data) {
      return [];
    }
    return buildChartData(kpisQuery.data);
  }, [kpisQuery.data]);

  const overtimeTotal = useMemo(() => {
    const overtimeSeries = kpisQuery.data?.find((series) => series.key === "overtime_hours_daily");
    if (!overtimeSeries) {
      return null;
    }
    const total = overtimeSeries.points.reduce((sum, point) => sum + Number(point.value ?? 0), 0);
    return formatNumber(String(total));
  }, [kpisQuery.data]);

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
        label: content.page.stats.absenceAvg,
        description: formatPercent(summaryQuery.data?.absence_rate_avg ?? null),
      },
      {
        label: content.page.stats.latenessAvg,
        description: formatPercent(summaryQuery.data?.lateness_rate_avg ?? null),
      },
      {
        label: content.page.stats.overtimeTotal,
        description: overtimeTotal ?? "-",
      }
    );

    breakdownQuery.data?.items?.forEach((item) => {
      results.push({
        label: item.dimension_id,
        description: formatNumber(item.amount ?? null),
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    breakdownQuery.data?.items,
    content.page.stats,
    overtimeTotal,
    searchTerm,
    summaryQuery.data,
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
                  label: content.page.stats.absenceAvg,
                  value: formatPercent(summaryQuery.data?.absence_rate_avg ?? null),
                },
                {
                  label: content.page.stats.latenessAvg,
                  value: formatPercent(summaryQuery.data?.lateness_rate_avg ?? null),
                },
                {
                  label: content.page.stats.overtimeTotal,
                  value: overtimeTotal ?? "-",
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
                  <h2>{content.page.charts.absenceTrend}</h2>
                  <p>{isArabic ? "الاتجاه اليومي" : "Daily movement"}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {kpisQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : chartData.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatPercent(String(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="absence"
                        name={isArabic ? "الغياب" : "Absence"}
                        stroke="#845ef7"
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
                  <h2>{content.page.charts.latenessTrend}</h2>
                  <p>{isArabic ? "الاتجاه اليومي" : "Daily movement"}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {kpisQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : chartData.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatPercent(String(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="lateness"
                        name={isArabic ? "التأخير" : "Lateness"}
                        stroke="#fab005"
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
                  <h2>{content.page.charts.breakdownTitle}</h2>
                  <p>{isArabic ? "أعلى الأقسام غيابًا" : "Highest absences"}</p>                  
                </div>
              </div>
              {breakdownQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : breakdownQuery.data?.items?.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "القسم" : "Department"}</th>
                        <th>{isArabic ? "القيمة" : "Value"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdownQuery.data.items.map((item) => (
                        <tr key={item.dimension_id}>
                          <td>{item.dimension_id}</td>
                          <td>{formatNumber(item.amount ?? null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <span className="helper-text">{content.page.charts.breakdownEmpty}</span>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}