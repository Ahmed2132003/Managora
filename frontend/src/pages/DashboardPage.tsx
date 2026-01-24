import { useMemo, useState } from "react";
import { clearTokens } from "../shared/auth/tokens";
import { useLocation, useNavigate } from "react-router-dom";
import { useMe } from "../shared/auth/useMe.ts";
import { hasPermission } from "../shared/auth/useCan";
import { useAlerts, useAlert } from "../shared/analytics/hooks";
import { useAnalyticsSummary, useAnalyticsKpis } from "../shared/analytics/insights.ts";
import { useCashForecast } from "../shared/analytics/forecast";
import { formatCurrency } from "../shared/analytics/format.ts";
import "./DashboardPage.css";

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
  rangeLabel: string;  
  stats: {
    revenue: string;
    expenses: string;
    netProfit: string;
    cashBalance: string;
  };
  activityTitle: string;
  activitySubtitle: string;
  insightsTitle: string;
  insightsSubtitle: string;
  forecastTitle: string;
  forecastSubtitle: string;
  forecastLabels: {
    invoicesDue: string;
    expectedCollected: string;
    payroll: string;
    recurring: string;
    topCustomer: string;
    topCategory: string;
  };
  assistantTitle: string;
  assistantFallbackQuestion: string;
  assistantFallbackAnswer: string;
  footer: string;
  userFallback: string;
  searchResultsTitle: string;
  searchResultsSubtitle: string;
  searchEmptyTitle: string;
  searchEmptySubtitle: string;
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
    rangeLabel: "Last 30 days",    
    stats: {
      revenue: "Total revenue",
      expenses: "Total expenses",
      netProfit: "Estimated net profit",
      cashBalance: "Latest cash balance",
    },
    activityTitle: "Smart Alerts",
    activitySubtitle: "Live KPI monitoring",
    insightsTitle: "Insight Pulse",
    insightsSubtitle: "Actual daily movement over the last week",
    forecastTitle: "Cashflow Snapshot",
    forecastSubtitle: "Forecasted inflows and outflows",
    forecastLabels: {
      invoicesDue: "Invoices due",
      expectedCollected: "Expected collected",
      payroll: "Payroll",
      recurring: "Recurring expenses",
      topCustomer: "Top customer",
      topCategory: "Top category",
    },
    assistantTitle: "Copilot",
    assistantFallbackQuestion: "No alerts to investigate right now.",
    assistantFallbackAnswer: "Everything is running within expected thresholds.",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchResultsTitle: "Search results",
    searchResultsSubtitle: "Live data matched in your dashboard",
    searchEmptyTitle: "No results found",
    searchEmptySubtitle: "Try another keyword or check spelling.",
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
    rangeLabel: "آخر ٣٠ يوم",    
    stats: {
      revenue: "إجمالي الإيرادات",
      expenses: "إجمالي المصروفات",
      netProfit: "صافي الربح التقديري",
      cashBalance: "آخر رصيد نقدي",
    },
    activityTitle: "تنبيهات ذكية",
    activitySubtitle: "مراقبة فورية للمؤشرات",
    insightsTitle: "نبض الرؤية",
    insightsSubtitle: "الحركة الفعلية لآخر أسبوع",
    forecastTitle: "ملخص التدفق النقدي",
    forecastSubtitle: "توقعات الدخول والخروج",
    forecastLabels: {
      invoicesDue: "فواتير مستحقة",
      expectedCollected: "تحصيل متوقع",
      payroll: "الرواتب",
      recurring: "مصروفات متكررة",
      topCustomer: "أعلى عميل",
      topCategory: "أعلى تصنيف",
    },
    assistantTitle: "المساعد الذكي",
    assistantFallbackQuestion: "لا توجد تنبيهات لمراجعتها الآن.",
    assistantFallbackAnswer: "كل المؤشرات تعمل ضمن الحدود الطبيعية.",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchResultsTitle: "نتائج البحث",
    searchResultsSubtitle: "بيانات مباشرة مطابقة لكلماتك",
    searchEmptyTitle: "لا توجد نتائج",
    searchEmptySubtitle: "جرّب كلمة مختلفة أو تحقق من الإملاء.",
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

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [searchTerm, setSearchTerm] = useState("");
  const content = useMemo(() => contentMap[language], [language]);
  const userPermissions = data?.permissions ?? [];
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;
  const isArabic = language === "ar";  
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);

  const summaryQuery = useAnalyticsSummary("30d");
  const kpisQuery = useAnalyticsKpis(
    ["revenue_daily", "expenses_daily"],
    range.start,
    range.end
  );
  const alertsQuery = useAlerts({ status: "open", range: "30d" });
  const forecastQuery = useCashForecast();
  const primaryAlertId = alertsQuery.data?.[0]?.id ?? null;
  const alertDetailQuery = useAlert(primaryAlertId);

  const barValues = useMemo(() => {
    if (!kpisQuery.data) {
      return [];
    }

    const pointsByDate = new Map<string, number>();
    kpisQuery.data.forEach((series) => {
      series.points.forEach((point) => {
        const value = point.value ? Number(point.value) : null;
        if (value === null) {
          return;
        }
        const current = pointsByDate.get(point.date) ?? 0;
        pointsByDate.set(point.date, current + value);
      });
    });

    const ordered = Array.from(pointsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);
    const max = Math.max(...ordered.map(([, value]) => value), 1);

    return ordered.map(([date, value]) => ({
      date,
      value,
      height: Math.round((value / max) * 100),
    }));
  }, [kpisQuery.data]);

  const forecastSnapshot = useMemo(() => {
    return (forecastQuery.data ?? []).find(
      (snapshot) => snapshot.horizon_days === 30
    );
  }, [forecastQuery.data]);

  const forecastCards = useMemo(() => {
    if (!forecastSnapshot) {
      return [];
    }

    const inflows = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const topCustomer = inflows.top_customers[0];
    const topCategory = outflows.top_categories[0];

    return [
      {
        label: content.forecastLabels.invoicesDue,
        value: formatCurrency(inflows.invoices_due),
      },
      {
        label: content.forecastLabels.expectedCollected,
        value: formatCurrency(inflows.expected_collected),
      },
      {
        label: `${content.forecastLabels.topCustomer} • ${topCustomer?.customer ?? "-"}`,
        value: formatCurrency(topCustomer?.amount ?? null),
      },
      {
        label: content.forecastLabels.payroll,
        value: formatCurrency(outflows.payroll),
      },
      {
        label: content.forecastLabels.recurring,
        value: formatCurrency(outflows.recurring_expenses),
      },
      {
        label: `${content.forecastLabels.topCategory} • ${topCategory?.category ?? "-"}`,
        value: formatCurrency(topCategory?.amount ?? null),
      },
    ];
  }, [content.forecastLabels, forecastSnapshot]);

  const activityItems = useMemo(() => {
    return (alertsQuery.data ?? []).slice(0, 4);
  }, [alertsQuery.data]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const results: Array<{ label: string; description: string }> = [];

    if (summaryQuery.data) {
      results.push(
        {
          label: content.stats.revenue,
          description: formatCurrency(summaryQuery.data.revenue_total),
        },
        {
          label: content.stats.expenses,
          description: formatCurrency(summaryQuery.data.expenses_total),
        },
        {
          label: content.stats.netProfit,
          description: formatCurrency(summaryQuery.data.net_profit_est),
        },
        {
          label: content.stats.cashBalance,
          description: formatCurrency(summaryQuery.data.cash_balance_latest),
        }
      );
    }

    forecastCards.forEach((card) => {
      results.push({
        label: card.label,
        description: card.value,
      });
    });

    activityItems.forEach((alert) => {
      results.push({
        label: alert.title,
        description: new Date(alert.event_date).toLocaleDateString(
          isArabic ? "ar" : "en"
        ),
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    activityItems,
    content.stats,
    forecastCards,
    isArabic,
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
        permissions: ["attendance.*", "attendance.view_team"],
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
            <span className="dashboard-brand__subtitle">
              {content.subtitle}
            </span>
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
            {isLoading && (
              <span className="sidebar-note">...loading profile</span>
            )}
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
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>
                {content.welcome}, {userName}
              </h1>
              <p>{content.subtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {forecastSnapshot?.as_of_date ?? range.end}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.revenue,
                  value: formatCurrency(summaryQuery.data?.revenue_total ?? null),
                  change: content.rangeLabel,
                },
                {
                  label: content.stats.expenses,
                  value: formatCurrency(summaryQuery.data?.expenses_total ?? null),
                  change: content.rangeLabel,
                },
                {
                  label: content.stats.netProfit,
                  value: formatCurrency(summaryQuery.data?.net_profit_est ?? null),
                  change: content.rangeLabel,
                },
                {
                  label: content.stats.cashBalance,
                  value: formatCurrency(summaryQuery.data?.cash_balance_latest ?? null),
                  change: content.rangeLabel,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{stat.change}</span>
                  </div>
                  <strong>
                    {summaryQuery.isLoading ? content.loadingLabel : stat.value}
                  </strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          {searchTerm.trim().length > 0 && (
            <section className="search-results" aria-live="polite">
              <div className="search-results__header">
                <div>
                  <h2>{content.searchResultsTitle}</h2>
                  <p>{content.searchResultsSubtitle}</p>
                </div>
                <span className="pill pill--accent">
                  {searchResults.length}
                </span>
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
            <div className="panel panel--insights">
              <div className="panel__header">
                <div>
                  <h2>{content.insightsTitle}</h2>
                  <p>{content.insightsSubtitle}</p>
                </div>
                <span className="pill pill--accent">Sync</span>
              </div>
              <div className="bar-chart">
                {barValues.length ? (
                  barValues.map((item) => (
                    <span
                      key={item.date}
                      style={{ height: `${item.height}%` }}
                      title={`${item.date}: ${formatCurrency(item.value.toString())}`}
                    />
                  ))
                ) : (
                  <span className="bar-chart__empty">
                    {kpisQuery.isLoading
                      ? content.loadingLabel
                      : content.searchEmptyTitle}
                  </span>
                )}
              </div>
            </div>

            <div className="panel panel--forecast">
              <div className="panel__header">
                <div>
                  <h2>{content.forecastTitle}</h2>
                  <p>{content.forecastSubtitle}</p>
                </div>
                <span className="pill">
                  {forecastSnapshot?.horizon_days ? `+${forecastSnapshot.horizon_days}d` : "-"}
                </span>
              </div>
              <div className="forecast-grid">
                {forecastCards.length ? (
                  forecastCards.map((card) => (
                    <div key={card.label} className="forecast-card">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </div>
                  ))
                ) : (
                  <div className="forecast-card">
                    <span>{content.loadingLabel}</span>
                    <strong>-</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="panel panel--activity">
              <div className="panel__header">
                <div>
                  <h2>{content.activityTitle}</h2>
                  <p>{content.activitySubtitle}</p>
                </div>
              </div>
              <div className="activity-list">
                {activityItems.length ? (
                  activityItems.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {new Date(item.event_date).toLocaleDateString(
                            isArabic ? "ar" : "en"
                          )}
                        </span>
                      </div>
                      <span className="tag">{item.severity}</span>
                    </div>
                  ))
                ) : (
                  <div className="activity-item">
                    <div>
                      <strong>{content.searchEmptyTitle}</strong>
                      <span>{content.searchEmptySubtitle}</span>
                    </div>
                    <span className="tag">-</span>
                  </div>
                )}
              </div>
            </div>

            <div className="panel panel--assistant">
              <div className="panel__header">
                <div>
                  <h2>{content.assistantTitle}</h2>
                  <p>{isArabic ? "ردود ذكية فورًا" : "Instant smart replies"}</p>
                </div>
              </div>
              <div className="assistant-chat">
                <div className="assistant-message assistant-message--question">
                  {alertDetailQuery.data?.title ?? content.assistantFallbackQuestion}
                </div>
                <div className="assistant-message assistant-message--answer">
                  {alertDetailQuery.data?.message ?? content.assistantFallbackAnswer}
                </div>
              </div>
            </div>            
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}