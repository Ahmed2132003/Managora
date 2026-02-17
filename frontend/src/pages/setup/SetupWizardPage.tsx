import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import "../DashboardPage.css";
import "./SetupWizardPage.css";
import { TopbarQuickActions } from "../TopbarQuickActions";

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
  pageTitle: string;
  pageSubtitle: string;
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
    subtitle: "Launch your company workspace in minutes.",
    searchPlaceholder: "Search dashboards, setup steps, teams...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Company Setup",
    pageSubtitle: "Pick a template, review progress, and go live quickly.",
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
    subtitle: "جهّز شركتك خلال دقائق وبخطوات واضحة.",
    searchPlaceholder: "ابحث عن الخطوات أو الفرق أو التقارير...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "إعداد الشركة",
    pageSubtitle: "اختر القالب المناسب وتابع التقدّم حتى الانطلاق.",
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
      hrAttendance: "حضور الموارد",
      leaveInbox: "وارد الإجازات",
      policies: "السياسات",
      hrActions: "إجراءات الموارد",
      payroll: "الرواتب",
      accountingSetup: "إعداد المحاسبة",
      journalEntries: "قيود اليومية",
      expenses: "المصروفات",
      collections: "التحصيلات",
      trialBalance: "ميزان المراجعة",
      generalLedger: "الأستاذ العام",
      profitLoss: "الأرباح والخسائر",
      balanceSheet: "الميزانية العمومية",
      agingReport: "أعمار الذمم",
      customers: "العملاء",
      newCustomer: "عميل جديد",
      invoices: "الفواتير",
      newInvoice: "فاتورة جديدة",
      catalog: "الخدمات والمنتجات",
      sales: "المبيعات",
      alertsCenter: "مركز التنبيهات",
      cashForecast: "توقع التدفق النقدي",
      ceoDashboard: "لوحة المدير التنفيذي",
      financeDashboard: "لوحة المالية",
      hrDashboard: "لوحة الموارد",
      auditLogs: "سجلات التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدّم الإعداد",
    },
  },
};

export type SetupWizardContext = {
  language: Language;
  isArabic: boolean;
};

export function SetupWizardPage() {
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
  const [search, setSearch] = useState("");
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);
  const companyName = data?.company.name || content.brand;
  const outletContext = useMemo<SetupWizardContext>(
    () => ({
      language,
      isArabic,
    }),
    [language, isArabic]
  );

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

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

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
        permissions: ["leaves.balance"],
      },
      {
        path: "/leaves/request",
        label: content.nav.leaveRequest,
        icon: "📝",
        permissions: ["leaves.request"],
      },
      {
        path: "/leaves/my-requests",
        label: content.nav.leaveMyRequests,
        icon: "✅",
        permissions: ["leaves.my_requests"],
      },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍🤝‍🧑",
        permissions: ["employees.view"],
      },
      {
        path: "/hr/departments",
        label: content.nav.departments,
        icon: "🏢",
        permissions: ["departments.view"],
      },
      {
        path: "/hr/job-titles",
        label: content.nav.jobTitles,
        icon: "🎯",
        permissions: ["jobtitles.view"],
      },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "🕒",
        permissions: ["attendance.view_team"],
      },
      {
        path: "/hr/leave-inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.view_requests"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📌",
        permissions: ["policies.view"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "⚡",
        permissions: ["hr_actions.view"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💰",
        permissions: ["payroll.view"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "📘",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/journal",
        label: content.nav.journalEntries,
        icon: "📒",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "💳",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/collections",
        label: content.nav.collections,
        icon: "🏦",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/trial-balance",
        label: content.nav.trialBalance,
        icon: "📊",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/general-ledger",
        label: content.nav.generalLedger,
        icon: "📈",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/profit-loss",
        label: content.nav.profitLoss,
        icon: "📉",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧾",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/aging-report",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["accounting.view"],
      },
      {
        path: "/sales/customers",
        label: content.nav.customers,
        icon: "🧑‍💼",
        permissions: ["customers.view"],
      },
      {
        path: "/sales/customers/new",
        label: content.nav.newCustomer,
        icon: "➕",
        permissions: ["customers.create"],
      },
      {
        path: "/sales/invoices",
        label: content.nav.invoices,
        icon: "🧾",
        permissions: ["invoices.view"],
      },
      {
        path: "/sales/invoices/new",
        label: content.nav.newInvoice,
        icon: "🧾",
        permissions: ["invoices.create"],
      },
      { path: "/alerts", label: content.nav.alertsCenter, icon: "🚨" },
      { path: "/forecast", label: content.nav.cashForecast, icon: "💡" },
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
      className="dashboard-page setup-wizard-page"
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
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
                  className={`nav-item${location.pathname === link.path ? " nav-item--active" : ""}`}
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
          <section className="hero-panel setup-hero">
            <div className="setup-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="setup-hero__meta">
                <span className="setup-pill">{isArabic ? "خطوات واضحة" : "Guided steps"}</span>
                <span className="setup-pill">{isArabic ? "جاهز للإطلاق" : "Ready to launch"}</span>
              </div>
            </div>
          </section>

          <Outlet context={outletContext} />
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>
    </div>
  );
}