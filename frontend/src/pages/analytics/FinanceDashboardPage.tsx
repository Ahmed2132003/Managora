import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import {
  useAccountMappings,
  useAccounts,
  useExpenses,
  useGeneralLedger,
  useProfitLoss,
} from "../../shared/accounting/hooks";
import { useCustomers } from "../../shared/customers/hooks";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { formatCurrency, formatNumber } from "../../shared/analytics/format.ts";
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
        vendors: "Top customers",
        vendorsEmpty: "No customer data available.",        
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
        vendors: "أعلى العملاء",
        vendorsEmpty: "لسه مفيش عملاء.",        
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
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);  
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

  const accountsQuery = useAccounts();
  const accountMappingsQuery = useAccountMappings();
  const expensesQuery = useExpenses({
    dateFrom: selection.start,
    dateTo: selection.end,
  });
  const customersQuery = useCustomers({});
  const pnlQuery = useProfitLoss(selection.start, selection.end);

  const receivablesAccountId = useMemo(() => {
    const mapping = accountMappingsQuery.data?.find(
      (item) => item.key === "ACCOUNTS_RECEIVABLE"      
    );
    if (mapping?.account) {
      return mapping.account;
    }
    const accounts = accountsQuery.data ?? [];
    const receivablesAccount = accounts.find((account) => {
      const name = account.name.toLowerCase();
      return (
        name.includes("receivable") ||
        name.includes("ذمم") ||
        name.includes("مدينة")
      );
    });
    return receivablesAccount?.id;
  }, [accountMappingsQuery.data, accountsQuery.data]);

  const receivablesLedgerQuery = useGeneralLedger(
    receivablesAccountId,
    selection.start,
    selection.end
  );
  
  const receivablesBalance = useMemo(() => {
    const lines = receivablesLedgerQuery.data?.lines ?? [];
    if (lines.length === 0) {
      return null;
    }
    const filteredLines = lines.filter((line) => {
      const description = `${line.description ?? ""} ${line.memo ?? ""}`.toLowerCase();
      return !description.includes("سلف") && !description.includes("advance");
    });
    const balance = filteredLines.reduce((sum, line) => {
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      return sum + (debit - credit);
    }, 0);
    return formatNumber(String(Math.abs(balance)));    
  }, [receivablesLedgerQuery.data?.lines]);

  const pnlTotals = useMemo(() => {
    const incomeTotal = Math.abs(Number(pnlQuery.data?.income_total ?? 0));
    const expenseTotal = Math.abs(Number(pnlQuery.data?.expense_total ?? 0));
    return {
      incomeTotal,
      expenseTotal,
      netProfit: incomeTotal - expenseTotal,
    };
  }, [pnlQuery.data?.income_total, pnlQuery.data?.expense_total]);

  const forecastNetValue = useMemo(() => {
    if (!pnlQuery.data) {
      return "-";
    }
    return formatCurrency(String(pnlTotals.netProfit));
  }, [pnlQuery.data, pnlTotals.netProfit]);

  const cashBalance = forecastNetValue;

  const forecastChartData = useMemo(() => {
    if (!pnlQuery.data) {
      return [];
    }
    return [
      {
        horizon: isArabic ? "الفترة الحالية" : "Selected range",
        inflows: pnlTotals.incomeTotal,
        outflows: pnlTotals.expenseTotal,
        net: pnlTotals.netProfit,
      },
    ];
  }, [isArabic, pnlQuery.data, pnlTotals]);

  const expenseCategoryLabels = useMemo(
    () => ({
      salary: isArabic ? "الرواتب" : "Salary",
      advertising: isArabic ? "الإعلانات" : "Advertising",
      other: isArabic ? "أخرى" : "Other",
    }),
    [isArabic]
  );

  const expenseCategoryData = useMemo(() => {
    const expenses = expensesQuery.data ?? [];
    const totals = expenses.reduce<Record<string, number>>((acc, expense) => {
      const key = expense.category || "other";
      acc[key] = (acc[key] ?? 0) + Number(expense.amount ?? 0);
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([key, amount]) => ({
        name: expenseCategoryLabels[key as keyof typeof expenseCategoryLabels] ?? key,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expensesQuery.data, expenseCategoryLabels]);

  const expenseSpikeSummary = useMemo(() => {
    const expenses = expensesQuery.data ?? [];
    if (expenses.length === 0) {
      return content.page.expenseAlertEmpty;
    }
    const amounts = expenses.map((expense) => Number(expense.amount ?? 0));
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const average = total / amounts.length;
    const maxAmount = Math.max(...amounts);
    if (average > 0 && maxAmount >= average * 1.5) {
      return `${content.page.expenseAlertOpen} • ${formatCurrency(String(maxAmount))}`;
    }
    return content.page.expenseAlertOk;
  }, [content.page.expenseAlertEmpty, content.page.expenseAlertOk, content.page.expenseAlertOpen, expensesQuery.data]);

  const topCustomers = useMemo(() => {
    const customers = customersQuery.data ?? [];
    return customers
      .filter((customer) => customer.is_active)
      .map((customer) => ({
        ...customer,
        credit: Number(customer.credit_limit ?? 0),
      }))
      .sort((a, b) => b.credit - a.credit)
      .slice(0, 5);
  }, [customersQuery.data]);

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
        description: cashBalance ?? "-",        
      },
      {
        label: content.page.stats.receivables,
        description: receivablesBalance ?? "-",        
      },
      {
        label: content.page.stats.expenseAlert,
        description: expenseSpikeSummary,        
      },
      {
        label: content.page.stats.forecastNet,
        description: forecastNetValue,        
      }
    );

    topCustomers.forEach((customer) => {      
      results.push({
        label: customer.name,
        description: formatCurrency(String(customer.credit)),        
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    cashBalance,
    expenseSpikeSummary,
    content.page.stats,
    forecastNetValue,
    receivablesBalance,
    searchTerm,
    topCustomers,
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
    [content.nav]
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
                  value: cashBalance ?? "-",
                  isLoading: pnlQuery.isLoading,                  
                },
                {
                  label: content.page.stats.receivables,
                  value: receivablesBalance ?? "-",
                  isLoading: receivablesLedgerQuery.isLoading,
                },
                {
                  label: content.page.stats.expenseAlert,
                  value: expenseSpikeSummary,
                  isLoading: expensesQuery.isLoading,
                },
                {
                  label: content.page.stats.forecastNet,
                  value: forecastNetValue,
                  isLoading: pnlQuery.isLoading,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{rangeLabel}</span>
                  </div>
                  <strong>{stat.isLoading ? content.loadingLabel : stat.value}</strong>
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
              {expensesQuery.isLoading ? (                
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
              {pnlQuery.isLoading ? (                
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
                  <p>{isArabic ? "قائمة بأعلى العملاء حسب حد الائتمان" : "Top customers by credit limit"}</p>                  
                </div>
              </div>
              {customersQuery.isLoading ? (                
                <span className="helper-text">{content.loadingLabel}</span>
              ) : topCustomers.length ? (                
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{isArabic ? "العميل" : "Customer"}</th>
                        <th>{isArabic ? "حد الائتمان" : "Credit limit"}</th>                        
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomers.map((customer) => (                        
                        <tr key={customer.id}>
                          <td>{customer.name}</td>
                          <td>{formatCurrency(String(customer.credit))}</td>                          
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