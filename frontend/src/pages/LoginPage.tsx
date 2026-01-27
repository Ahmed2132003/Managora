import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";

import { http } from "../shared/api/http";
import { endpoints } from "../shared/api/endpoints";
import { hasAccessToken, setTokens } from "../shared/auth/tokens";
import "./LoginPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  footer: string;
  welcome: string;
  heroTitle: string;
  heroSubtitle: string;
  formTitle: string;
  formSubtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  loginLabel: string;
  helperText: string;
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
    footer: "This system is produced by Creativity Code.",
    welcome: "Welcome back",
    heroTitle: "Sign in to continue",
    heroSubtitle: "Secure access to your dashboards, teams, and insights.",
    formTitle: "Login",
    formSubtitle: "Use your work credentials to access the system.",
    usernameLabel: "Username",
    passwordLabel: "Password",
    loginLabel: "Login",
    helperText: "Need help? Contact your administrator.",
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
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    welcome: "أهلًا بعودتك",
    heroTitle: "سجّل الدخول للمتابعة",
    heroSubtitle: "وصول آمن للوحاتك وفرقك ورؤيتك التحليلية.",
    formTitle: "تسجيل الدخول",
    formSubtitle: "استخدم بيانات العمل للوصول إلى النظام.",
    usernameLabel: "اسم المستخدم",
    passwordLabel: "كلمة المرور",
    loginLabel: "دخول",
    helperText: "هل تحتاج للمساعدة؟ تواصل مع مسؤول النظام.",
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

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/dashboard";
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (hasAccessToken()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await http.post(endpoints.auth.login, { username, password });
      const access = response.data?.access;
      const refresh = response.data?.refresh;

      if (!access || !refresh) {
        throw new Error("Missing tokens from login response.");
      }

      setTokens({ access, refresh });

      notifications.show({
        title: isArabic ? "تم تسجيل الدخول" : "Login successful",
        message: isArabic ? "تم تسجيل الدخول بنجاح." : "You have signed in successfully.",        
      });

      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data ?? err.message)
        : "Unknown error";
      notifications.show({
        title: isArabic ? "فشل تسجيل الدخول" : "Login failed",        
        message,
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="login-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="login-page__glow" aria-hidden="true" />
      <header className="login-topbar">
        <div className="login-brand">
          <img src="/managora-logo.png" alt="Managora logo" />
          <div>
            <span className="login-brand__title">{content.brand}</span>
            <span className="login-brand__subtitle">{content.subtitle}</span>
          </div>
        </div>
        <div className="login-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder={content.searchPlaceholder}
            aria-label={content.searchPlaceholder}
          />
        </div>
      </header>

      <div className="login-shell">
        <aside className="login-sidebar">
          <div className="sidebar-card">
            <p>{content.welcome}</p>
            <strong>{content.heroTitle}</strong>
            <span className="sidebar-note">{content.helperText}</span>
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
              {[
                { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
                { path: "/users", label: content.nav.users, icon: "👥" },
                { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
                { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅" },
                { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
                { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
                { path: "/hr/employees", label: content.nav.employees, icon: "🧑‍💼" },
                { path: "/hr/departments", label: content.nav.departments, icon: "🏢" },
                { path: "/hr/job-titles", label: content.nav.jobTitles, icon: "🧩" },
                { path: "/hr/attendance", label: content.nav.hrAttendance, icon: "📍" },
                { path: "/hr/leaves/inbox", label: content.nav.leaveInbox, icon: "📥" },
                { path: "/hr/policies", label: content.nav.policies, icon: "📚" },
                { path: "/hr/actions", label: content.nav.hrActions, icon: "✅" },
                { path: "/payroll", label: content.nav.payroll, icon: "💸" },
                { path: "/accounting/setup", label: content.nav.accountingSetup, icon: "⚙️" },
                {
                  path: "/accounting/journal-entries",
                  label: content.nav.journalEntries,
                  icon: "📒",
                },
                { path: "/accounting/expenses", label: content.nav.expenses, icon: "🧾" },
                { path: "/collections", label: content.nav.collections, icon: "💼" },
                {
                  path: "/accounting/reports/trial-balance",
                  label: content.nav.trialBalance,
                  icon: "📈",
                },
                {
                  path: "/accounting/reports/general-ledger",
                  label: content.nav.generalLedger,
                  icon: "📊",
                },
                {
                  path: "/accounting/reports/pnl",
                  label: content.nav.profitLoss,
                  icon: "📉",
                },
                {
                  path: "/accounting/reports/balance-sheet",
                  label: content.nav.balanceSheet,
                  icon: "🧮",
                },
                {
                  path: "/accounting/reports/ar-aging",
                  label: content.nav.agingReport,
                  icon: "⏳",
                },
                { path: "/customers", label: content.nav.customers, icon: "🤝" },
                { path: "/customers/new", label: content.nav.newCustomer, icon: "➕" },
                { path: "/invoices", label: content.nav.invoices, icon: "📄" },
                { path: "/invoices/new", label: content.nav.newInvoice, icon: "🧾" },
                { path: "/analytics/alerts", label: content.nav.alertsCenter, icon: "🚨" },
                { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
                { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
                { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
                { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
                { path: "/copilot", label: content.nav.copilot, icon: "🤖" },
                { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️" },
                { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
                { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
              ].map((link) => (
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
        </aside>

        <main className="login-main">
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.heroTitle}</h1>
              <p>{content.heroSubtitle}</p>
            </div>
            <div className="login-card">
              <div className="login-card__header">
                <img
                  className="login-logo"
                  src="/managora-logo.png"
                  alt="Managora logo"
                />
                <div>
                  <h2>{content.formTitle}</h2>
                  <p>{content.formSubtitle}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                <label className="field">
                  <span>{content.usernameLabel}</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                    autoComplete="username"
                  />
                </label>
                <label className="field">
                  <span>{content.passwordLabel}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <button type="submit" className="action-button" disabled={isSubmitting}>
                  {isSubmitting ? content.loginLabel + "..." : content.loginLabel}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>

      <footer className="login-footer">{content.footer}</footer>
    </div>
  );
}