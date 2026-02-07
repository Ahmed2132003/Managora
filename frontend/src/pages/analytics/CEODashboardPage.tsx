import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { useProfitLoss } from "../../shared/accounting/hooks";
import { useAlerts } from "../../shared/analytics/hooks";
import { useCashForecast } from "../../shared/analytics/forecast";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { formatCurrency, formatPercent } from "../../shared/analytics/format.ts";
import { useAttendanceRecordsQuery } from "../../shared/hr/hooks";
import {
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./CEODashboardPage.css";

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
      revenue: string;
      expenses: string;
      netProfit: string;
      cashForecast: string;
    };
    chartRevenue: string;
    chartRevenueSubtitle: string;
    chartAbsence: string;
    chartAbsenceSubtitle: string;
    chartAbsenceAvg: string;
    alertsTitle: string;
    alertsBadge: string;
    alertsEmpty: string;    
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
      title: "CEO Dashboard",
      subtitle: "Executive overview of revenue, expenses, and open alerts.",
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
        revenue: "Total revenue",
        expenses: "Total expenses",
        netProfit: "Estimated net profit",
        cashForecast: "30-day cash forecast",
      },
      chartRevenue: "Revenue vs expenses",
      chartRevenueSubtitle: "Daily movement",
      chartAbsence: "Absence rate",
      chartAbsenceSubtitle: "People pulse",
      chartAbsenceAvg: "Average absence",
      alertsTitle: "Top alerts",
      alertsBadge: "Open",
      alertsEmpty: "No active alerts right now.",      
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
      title: "لوحة CEO",
      subtitle: "نظرة شاملة على الإيرادات والمصروفات والتنبيهات المفتوحة.",
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
        revenue: "إجمالي الإيرادات",
        expenses: "إجمالي المصروفات",
        netProfit: "صافي الربح التقديري",
        cashForecast: "توقع السيولة 30 يوم",
      },
      chartRevenue: "الإيرادات مقابل المصروفات",
      chartRevenueSubtitle: "حركة يومية",
      chartAbsence: "معدل الغياب",
      chartAbsenceSubtitle: "نبض الموارد البشرية",
      chartAbsenceAvg: "متوسط الغياب",
      alertsTitle: "أهم التنبيهات",
      alertsBadge: "مفتوحة",
      alertsEmpty: "لا توجد تنبيهات حالياً.",      
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

function buildAbsenceChartData(
  records: Array<{ date: string; status: string }>
) {
  const valuesByDate = new Map<string, { absent: number; total: number }>();

  records.forEach((record) => {
    const entry = valuesByDate.get(record.date) ?? { absent: 0, total: 0 };
    entry.total += 1;
    if (record.status === "absent") {
      entry.absent += 1;
    }
    valuesByDate.set(record.date, entry);
  });

  return Array.from(valuesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      absence: values.total ? values.absent / values.total : 0,
    }));
}

function formatPercentNormalized(value?: string | number | null) {
  if (value === null || value === undefined) {
    return "-";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "-";
  }
  const normalized = numeric > 1 ? numeric / 100 : numeric;
  return formatPercent(String(normalized));
}

function formatAlertDate(value: string, locale: "ar" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale);
}

export function CEODashboardPage() {  
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

  const profitLossQuery = useProfitLoss(selection.start, selection.end);
  const alertsQuery = useAlerts({ status: "open", range: selection.rangeParam });
  const forecastQuery = useCashForecast();
  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: selection.start,
      dateTo: selection.end,
    },
    Boolean(selection.start && selection.end)
  );

  const revenueChartData = useMemo(() => {
    if (!selection.start || !selection.end || !profitLossQuery.data) {
      return [];
    }
    const incomeTotal = Math.abs(Number(profitLossQuery.data.income_total ?? 0));
    const expenseTotal = Math.abs(Number(profitLossQuery.data.expense_total ?? 0));
    return [
      { date: selection.start, revenue: incomeTotal, expenses: expenseTotal },
      { date: selection.end, revenue: incomeTotal, expenses: expenseTotal },
    ];
  }, [profitLossQuery.data, selection.end, selection.start]);

  const absenceChartData = useMemo(() => {
    return buildAbsenceChartData(attendanceQuery.data ?? []);
  }, [attendanceQuery.data]);

  const incomeTotal = useMemo(() => {
    if (!profitLossQuery.data) {
      return null;
    }
    return Math.abs(Number(profitLossQuery.data.income_total ?? 0));
  }, [profitLossQuery.data]);
  const expenseTotal = useMemo(() => {
    if (!profitLossQuery.data) {
      return null;
    }
    return Math.abs(Number(profitLossQuery.data.expense_total ?? 0));
  }, [profitLossQuery.data]);
  const netProfitTotal = useMemo(() => {
    if (incomeTotal === null || expenseTotal === null) {
      return null;
    }
    return incomeTotal - expenseTotal;
  }, [expenseTotal, incomeTotal]);
  const absenceSummary = useMemo(() => {
    const records = attendanceQuery.data ?? [];
    const total = records.length;
    const absent = records.filter((record) => record.status === "absent").length;
    return {
      total,
      absent,
      rate: total ? absent / total : null,
    };
  }, [attendanceQuery.data]);

  const resolvedRevenueTotal = incomeTotal !== null ? String(incomeTotal) : null;
  const resolvedExpensesTotal = expenseTotal !== null ? String(expenseTotal) : null;
  const resolvedNetProfit = netProfitTotal !== null ? String(netProfitTotal) : null;
  const resolvedAbsenceAvg =
    absenceSummary.rate !== null ? String(absenceSummary.rate) : null;

  const topAlerts = useMemo(() => {
    const severityRank: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...(alertsQuery.data ?? [])]
      .sort((a, b) => {
        const rankDiff =
          (severityRank[b.severity?.toLowerCase?.() ?? ""] ?? 0) -
          (severityRank[a.severity?.toLowerCase?.() ?? ""] ?? 0);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
      })
      .slice(0, 5);
  }, [alertsQuery.data]);

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
        label: content.page.stats.revenue,
        description: formatCurrency(resolvedRevenueTotal),        
      },
      {
        label: content.page.stats.expenses,
        description: formatCurrency(resolvedExpensesTotal),        
      },
      {
        label: content.page.stats.netProfit,
        description: formatCurrency(resolvedNetProfit),        
      },
      {
        label: content.page.stats.cashForecast,
        description: formatCurrency(forecast30?.net_expected ?? null),
      }
    );

    topAlerts.forEach((alert) => {
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
    content.page.stats,
    forecast30?.net_expected,
    isArabic,
    searchTerm,
    resolvedExpensesTotal,
    resolvedNetProfit,
    resolvedRevenueTotal,
    topAlerts,
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
                  label: content.page.stats.revenue,
                  value: formatCurrency(resolvedRevenueTotal),                  
                },
                {
                  label: content.page.stats.expenses,
                  value: formatCurrency(resolvedExpensesTotal),                  
                },
                {
                  label: content.page.stats.netProfit,
                  value: formatCurrency(resolvedNetProfit),                  
                },
                {
                  label: content.page.stats.cashForecast,
                  value: formatCurrency(forecast30?.net_expected ?? null),
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{rangeLabel}</span>
                  </div>
                  <strong>
                    {profitLossQuery.isLoading ? content.loadingLabel : stat.value}
                  </strong>                  
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
                  <h2>{content.page.chartRevenue}</h2>
                  <p>{content.page.chartRevenueSubtitle}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              <div className="panel__metrics">
                <div>
                  <span>{content.page.stats.revenue}</span>
                  <strong>
                    {profitLossQuery.isLoading                    
                      ? content.loadingLabel
                      : formatCurrency(resolvedRevenueTotal)}
                  </strong>
                </div>
                <div>
                  <span>{content.page.stats.expenses}</span>
                  <strong>
                    {profitLossQuery.isLoading                    
                      ? content.loadingLabel
                      : formatCurrency(resolvedExpensesTotal)}
                  </strong>
                </div>
              </div>
              {profitLossQuery.isLoading ? (                
                <span className="helper-text">{content.loadingLabel}</span>
              ) : revenueChartData.length ? (                
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={revenueChartData}>                                     
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name={isArabic ? "الإيرادات" : "Revenue"}
                        stroke="#1971c2"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name={isArabic ? "المصروفات" : "Expenses"}
                        stroke="#f03e3e"
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
                  <h2>{content.page.chartAbsence}</h2>
                  <p>{content.page.chartAbsenceSubtitle}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              <div className="panel__metrics">
                <div>
                  <span>{content.page.chartAbsenceAvg}</span>
                  <strong>
                    {attendanceQuery.isLoading                    
                      ? content.loadingLabel
                      : formatPercentNormalized(resolvedAbsenceAvg)}
                  </strong>
                </div>
              </div>
              {attendanceQuery.isLoading ? (                
                <span className="helper-text">{content.loadingLabel}</span>
              ) : absenceChartData.length ? (                
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={absenceChartData}>                      
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value: number) => formatPercentNormalized(value)} />
                      <Tooltip
                        formatter={(value: number) => formatPercentNormalized(value)}
                      />
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
                  <h2>{content.page.alertsTitle}</h2>
                  <p>{isArabic ? "آخر التنبيهات المفتوحة" : "Latest open alerts"}</p>
                </div>
                <span className="pill pill--accent">{content.page.alertsBadge}</span>
              </div>
              {alertsQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : topAlerts.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "العنوان" : "Title"}</th>
                        <th>{isArabic ? "الحدة" : "Severity"}</th>
                        <th>{isArabic ? "التاريخ" : "Date"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAlerts.map((alert) => (
                        <tr key={alert.id}>
                          <td>{alert.title}</td>
                          <td>
                            <span className="status-pill">{alert.severity}</span>
                          </td>
                          <td>{formatAlertDate(alert.event_date, isArabic ? "ar" : "en")}</td>                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <span className="helper-text">{content.page.alertsEmpty}</span>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}