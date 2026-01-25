import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { useMe } from "../../shared/auth/useMe";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import {
  useCreatePolicyRuleMutation,
  usePolicyRulesQuery,
} from "../../shared/hr/hooks";
import type { PolicyRule } from "../../shared/hr/hooks";
import "../DashboardPage.css";
import "./PoliciesPage.css";

type Language = "en" | "ar";

type ThemeMode = "light" | "dark";

type TemplateOption = {
  value: PolicyRule["rule_type"];
  label: string;
  requiresPeriod: boolean;
};

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
  overviewLabel: string;
  stats: {
    total: string;
    active: string;
    inactive: string;
    templates: string;
  };
  form: {
    title: string;
    subtitle: string;
    templateLabel: string;
    ruleNameLabel: string;
    ruleNamePlaceholder: string;
    thresholdLabel: string;
    periodLabel: string;
    actionTypeLabel: string;
    actionValueLabel: string;
    actionWarning: string;
    actionDeduction: string;
    activeLabel: string;
    save: string;
  };
  table: {
    title: string;
    subtitle: string;
    name: string;
    type: string;
    condition: string;
    action: string;
    status: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  statusLabels: {
    active: string;
    inactive: string;
  };
  notifications: {
    missingTitle: string;
    missingMessage: string;
    periodTitle: string;
    periodMessage: string;
    savedTitle: string;
    savedMessage: string;
    errorTitle: string;
  };
  userFallback: string;
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
    searchPlaceholder: "Search policies, rule types...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Policies",
    pageSubtitle: "Define attendance rules and automate actions.",
    overviewLabel: "Policy rules",
    stats: {
      total: "Total rules",
      active: "Active rules",
      inactive: "Inactive rules",
      templates: "Templates used",
    },
    form: {
      title: "Create rule",
      subtitle: "Build a reusable policy template.",
      templateLabel: "Template",
      ruleNameLabel: "Rule name",
      ruleNamePlaceholder: "Enter rule name",
      thresholdLabel: "Threshold",
      periodLabel: "Period (days)",
      actionTypeLabel: "Action type",
      actionValueLabel: "Action value",
      actionWarning: "Warning",
      actionDeduction: "Deduction",
      activeLabel: "Activate rule",
      save: "Save rule",
    },
    table: {
      title: "Current rules",
      subtitle: "Live policy catalog",
      name: "Name",
      type: "Type",
      condition: "Condition",
      action: "Action",
      status: "Status",
      emptyTitle: "No rules yet",
      emptySubtitle: "Create your first policy above.",
      loading: "Loading rules...",
    },
    statusLabels: {
      active: "Active",
      inactive: "Inactive",
    },
    notifications: {
      missingTitle: "Missing data",
      missingMessage: "Choose a template and fill required values.",
      periodTitle: "Missing period",
      periodMessage: "Enter the period in days.",
      savedTitle: "Saved",
      savedMessage: "Policy rule created successfully.",
      errorTitle: "Save failed",
    },
    userFallback: "Explorer",
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
    searchPlaceholder: "ابحث عن سياسة أو نوع قاعدة...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "السياسات",
    pageSubtitle: "عرّف قواعد الحضور تلقائيًا وإجراءات الجزاءات.",
    overviewLabel: "قواعد السياسات",
    stats: {
      total: "إجمالي القواعد",
      active: "قواعد فعالة",
      inactive: "قواعد غير فعالة",
      templates: "عدد القوالب",
    },
    form: {
      title: "إنشاء قاعدة",
      subtitle: "أنشئ قالب سياسة قابل لإعادة الاستخدام.",
      templateLabel: "القالب",
      ruleNameLabel: "اسم القاعدة",
      ruleNamePlaceholder: "أدخل اسم القاعدة",
      thresholdLabel: "الحد",
      periodLabel: "الفترة (أيام)",
      actionTypeLabel: "نوع الإجراء",
      actionValueLabel: "قيمة الإجراء",
      actionWarning: "تنبيه",
      actionDeduction: "خصم",
      activeLabel: "تفعيل القاعدة",
      save: "حفظ القاعدة",
    },
    table: {
      title: "القواعد الحالية",
      subtitle: "سجل السياسات المباشر",
      name: "الاسم",
      type: "النوع",
      condition: "الشرط",
      action: "الإجراء",
      status: "الحالة",
      emptyTitle: "لا توجد قواعد بعد",
      emptySubtitle: "ابدأ بإنشاء أول قاعدة أعلاه.",
      loading: "جاري تحميل القواعد...",
    },
    statusLabels: {
      active: "فعالة",
      inactive: "غير فعالة",
    },
    notifications: {
      missingTitle: "بيانات ناقصة",
      missingMessage: "اختر القالب وحدد القيم المطلوبة.",
      periodTitle: "مدة غير مكتملة",
      periodMessage: "يرجى إدخال عدد الأيام للفترة.",
      savedTitle: "تم الحفظ",
      savedMessage: "تم إنشاء القاعدة بنجاح.",
      errorTitle: "فشل الحفظ",
    },
    userFallback: "ضيف",
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

const templateOptions: TemplateOption[] = [
  {
    value: "late_over_minutes",
    label: "Late > X minutes → action",
    requiresPeriod: false,
  },
  {
    value: "late_count_over_period",
    label: "Late count > N خلال Y يوم → action",
    requiresPeriod: true,
  },
  {
    value: "absent_count_over_period",
    label: "Absent count > N خلال Y يوم → action",
    requiresPeriod: true,
  },
];

export function PoliciesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const meQuery = useMe();
  const queryClient = useQueryClient();
  const rulesQuery = usePolicyRulesQuery();
  const createMutation = useCreatePolicyRuleMutation();

  const [template, setTemplate] = useState<PolicyRule["rule_type"] | null>(
    "late_over_minutes"
  );
  const [threshold, setThreshold] = useState<number | undefined>(5);
  const [periodDays, setPeriodDays] = useState<number | null>(30);
  const [actionType, setActionType] = useState<PolicyRule["action_type"]>("warning");
  const [actionValue, setActionValue] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);
  const [ruleName, setRuleName] = useState("");
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

  const activeTemplate = useMemo(
    () => templateOptions.find((option) => option.value === template),
    [template]
  );

  const autoName = useMemo(() => {
    if (!template) return "";
    switch (template) {
      case "late_over_minutes":
        return `Late > ${threshold ?? 0} minutes`;
      case "late_count_over_period":
        return `Late > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      case "absent_count_over_period":
        return `Absent > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      default:
        return "";
    }
  }, [template, threshold, periodDays]);

  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);

  const filteredRules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return rules;
    }
    return rules.filter((rule) =>
      [rule.name, rule.rule_type, rule.action_type]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rules, searchTerm]);

  const stats = useMemo(() => {
    const activeCount = rules.filter((rule) => rule.is_active).length;
    const templatesUsed = new Set(rules.map((rule) => rule.rule_type)).size;
    return {
      total: rules.length,
      active: activeCount,
      inactive: rules.length - activeCount,
      templates: templatesUsed,
    };
  }, [rules]);

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
        permissions: ["employees.*"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💳",
        permissions: ["payroll.*"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "🧮",
        permissions: ["accounting.*"],
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📘",
        permissions: ["accounting.*"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "💸",
        permissions: ["expenses.*", "accounting.*"],
      },
      {
        path: "/accounting/collections",
        label: content.nav.collections,
        icon: "💰",
        permissions: ["collections.*", "accounting.*"],
      },
      {
        path: "/accounting/trial-balance",
        label: content.nav.trialBalance,
        icon: "📊",
        permissions: ["reports.view"],
      },
      {
        path: "/accounting/general-ledger",
        label: content.nav.generalLedger,
        icon: "📒",
        permissions: ["reports.view"],
      },
      {
        path: "/accounting/profit-loss",
        label: content.nav.profitLoss,
        icon: "📈",
        permissions: ["reports.view"],
      },
      {
        path: "/accounting/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧾",
        permissions: ["reports.view"],
      },
      {
        path: "/accounting/aging-report",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["reports.view"],
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

  async function handleSave() {
    if (!template || threshold == null) {
      notifications.show({
        title: content.notifications.missingTitle,
        message: content.notifications.missingMessage,
        color: "red",
      });
      return;
    }

    if (activeTemplate?.requiresPeriod && !periodDays) {
      notifications.show({
        title: content.notifications.periodTitle,
        message: content.notifications.periodMessage,
        color: "red",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: ruleName.trim() || autoName,
        rule_type: template,
        threshold,
        period_days: activeTemplate?.requiresPeriod ? periodDays : null,
        action_type: actionType,
        action_value: actionType === "deduction" ? String(actionValue ?? 0) : null,
        is_active: isActive,
      });
      notifications.show({
        title: content.notifications.savedTitle,
        message: content.notifications.savedMessage,
      });
      setRuleName("");
      setThreshold(5);
      setPeriodDays(30);
      setActionType("warning");
      setActionValue(undefined);
      setIsActive(true);
      await queryClient.invalidateQueries({ queryKey: ["policies", "rules"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  if (isForbiddenError(rulesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page policies-page"
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
          <section className="hero-panel policies-hero">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.overviewLabel}</span>
                <span className="pill pill--accent">{stats.total}</span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                { label: content.stats.active, value: stats.active },
                { label: content.stats.inactive, value: stats.inactive },
                { label: content.stats.templates, value: stats.templates },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.overviewLabel}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid-panels">
            <div className="panel policies-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.form.title}</h2>
                  <p>{content.form.subtitle}</p>
                </div>
              </div>
              <div className="policies-form">
                <label className="form-field">
                  <span>{content.form.templateLabel}</span>
                  <select
                    value={template ?? ""}
                    onChange={(event) =>
                      setTemplate(event.target.value as PolicyRule["rule_type"])
                    }
                  >
                    {templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>{content.form.ruleNameLabel}</span>
                  <input
                    type="text"
                    placeholder={autoName || content.form.ruleNamePlaceholder}
                    value={ruleName}
                    onChange={(event) => setRuleName(event.target.value)}
                  />
                </label>

                <div className="form-grid">
                  <label className="form-field">
                    <span>{content.form.thresholdLabel}</span>
                    <input
                      type="number"
                      min={1}
                      value={threshold ?? ""}
                      onChange={(event) =>
                        setThreshold(event.target.valueAsNumber || undefined)
                      }
                    />
                  </label>
                  {activeTemplate?.requiresPeriod && (
                    <label className="form-field">
                      <span>{content.form.periodLabel}</span>
                      <input
                        type="number"
                        min={1}
                        value={periodDays ?? ""}
                        onChange={(event) =>
                          setPeriodDays(event.target.valueAsNumber || null)
                        }
                      />
                    </label>
                  )}
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>{content.form.actionTypeLabel}</span>
                    <select
                      value={actionType}
                      onChange={(event) =>
                        setActionType(event.target.value as PolicyRule["action_type"])
                      }
                    >
                      <option value="warning">{content.form.actionWarning}</option>
                      <option value="deduction">{content.form.actionDeduction}</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>{content.form.actionValueLabel}</span>
                    <input
                      type="number"
                      min={0}
                      value={actionValue ?? ""}
                      onChange={(event) =>
                        setActionValue(event.target.valueAsNumber || undefined)
                      }
                      disabled={actionType !== "deduction"}
                    />
                  </label>
                </div>

                <label className="form-toggle">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                  />
                  <span>{content.form.activeLabel}</span>
                </label>

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? content.notifications.savedTitle : content.form.save}
                </button>
              </div>
            </div>

            <div className="panel policies-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.table.title}</h2>
                  <p>{content.table.subtitle}</p>
                </div>
                {rulesQuery.isLoading && (
                  <span className="panel-meta">{content.table.loading}</span>
                )}
              </div>
              <div className="policies-table-wrapper">
                <table className="policies-table">
                  <thead>
                    <tr>
                      <th>{content.table.name}</th>
                      <th>{content.table.type}</th>
                      <th>{content.table.condition}</th>
                      <th>{content.table.action}</th>
                      <th>{content.table.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map((rule) => (
                      <tr key={rule.id}>
                        <td>{rule.name}</td>
                        <td>{rule.rule_type}</td>
                        <td>
                          {rule.rule_type === "late_over_minutes" && (
                            <>Late &gt; {rule.threshold} دقيقة</>
                          )}
                          {rule.rule_type !== "late_over_minutes" && (
                            <>
                              &gt; {rule.threshold} خلال {rule.period_days} يوم
                            </>
                          )}
                        </td>
                        <td>
                          {rule.action_type}
                          {rule.action_type === "deduction" && rule.action_value
                            ? ` (${rule.action_value})`
                            : ""}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              rule.is_active
                                ? "status-pill--approved"
                                : "status-pill--cancelled"
                            }`}
                          >
                            {rule.is_active
                              ? content.statusLabels.active
                              : content.statusLabels.inactive}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!rulesQuery.isLoading && filteredRules.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <div className="policies-empty">
                            <strong>{content.table.emptyTitle}</strong>
                            <span>{content.table.emptySubtitle}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}