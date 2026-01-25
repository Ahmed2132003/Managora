import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { useMe } from "../../shared/auth/useMe";
import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";
import "../DashboardPage.css";
import "./AccountingSetupWizardPage.css";

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
  heroTags: {
    stepOne: string;
    stepTwo: string;
  };
  stats: {
    templates: string;
    mappings: string;
    accounts: string;
    progress: string;
  };
  templates: {
    title: string;
    subtitle: string;
    accountsLabel: string;
    examplesLabel: string;
    costCentersLabel: string;
    applyLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
  };
  mappings: {
    title: string;
    subtitle: string;
    selectPlaceholder: string;
    missingTitle: string;
    saveLabel: string;
    loading: string;
  };
  labels: {
    required: string;
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

type TemplatePreview = {
  key: string;
  name: string;
  description: string;
  accountCount: number;
  examples: string[];
  costCenters: string[];
};

type Account = {
  id: number;
  code: string;
  name: string;
};

type AccountMapping = {
  id: number;
  key: string;
  account: number | null;
  required: boolean;
};

const mappingKeys = [
  {
    key: "PAYROLL_SALARIES_EXPENSE",
    label: "Salaries Expense",
    required: true,
  },
  {
    key: "PAYROLL_PAYABLE",
    label: "Payroll Payable",
    required: true,
  },
  {
    key: "EXPENSE_DEFAULT_CASH",
    label: "Expense Default Cash (Optional)",
    required: false,
  },
  {
    key: "EXPENSE_DEFAULT_AP",
    label: "Expense Default AP (Optional)",
    required: false,
  },
];

const templates: TemplatePreview[] = [
  {
    key: "services_small",
    name: "Services Small",
    description: "خطة حسابات لشركة خدمات صغيرة مع مصروفات تشغيل أساسية.",
    accountCount: 12,
    examples: ["Cash", "Bank", "Accounts Receivable", "Revenue - Services"],
    costCenters: ["Admin", "Sales", "Operations"],
  },
  {
    key: "trading_basic",
    name: "Trading Basic",
    description: "مناسبة للشركات التجارية مع مخزون وتكلفة بضائع.",
    accountCount: 10,
    examples: ["Inventory", "Accounts Payable", "Sales Revenue", "COGS"],
    costCenters: ["Admin", "Sales", "Warehouse"],
  },
];

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search templates, accounts, mapping keys...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Accounting Setup",
    pageSubtitle: "Configure your chart of accounts and core payroll mappings.",
    heroTags: {
      stepOne: "Step 1: Templates",
      stepTwo: "Step 2: Mappings",
    },
    stats: {
      templates: "Templates",
      mappings: "Required mappings",
      accounts: "Accounts loaded",
      progress: "Setup progress",
    },
    templates: {
      title: "Choose a template",
      subtitle: "Kickstart your chart of accounts in minutes.",
      accountsLabel: "accounts",
      examplesLabel: "Examples",
      costCentersLabel: "Cost centers",
      applyLabel: "Apply Template",
      emptyTitle: "No templates matched",
      emptySubtitle: "Try another keyword or clear the search.",
    },
    mappings: {
      title: "Account mapping",
      subtitle: "Map payroll and expense defaults to your accounts.",
      selectPlaceholder: "Select account",
      missingTitle: "Required mappings missing",
      saveLabel: "Finish setup",
      loading: "Loading mappings...",
    },
    labels: {
      required: "Required",
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
    searchPlaceholder: "ابحث عن القوالب أو الحسابات أو المفاتيح...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "إعداد المحاسبة",
    pageSubtitle: "اضبط دليل الحسابات وربط المرتبات والمصروفات.",
    heroTags: {
      stepOne: "الخطوة ١: القوالب",
      stepTwo: "الخطوة ٢: الربط",
    },
    stats: {
      templates: "القوالب",
      mappings: "الربط المطلوب",
      accounts: "الحسابات المحملة",
      progress: "تقدم الإعداد",
    },
    templates: {
      title: "اختيار قالب",
      subtitle: "ابدأ دليل الحسابات بسرعة.",
      accountsLabel: "حساب",
      examplesLabel: "أمثلة",
      costCentersLabel: "مراكز التكلفة",
      applyLabel: "تطبيق القالب",
      emptyTitle: "لا توجد قوالب مطابقة",
      emptySubtitle: "جرّب كلمة أخرى أو امسح البحث.",
    },
    mappings: {
      title: "ربط الحسابات",
      subtitle: "اربط المرتبات والمصروفات بالحسابات المناسبة.",
      selectPlaceholder: "اختر حساب",
      missingTitle: "هناك حقول مطلوبة",
      saveLabel: "إنهاء الإعداد",
      loading: "جاري تحميل الربط...",
    },
    labels: {
      required: "مطلوب",
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

export function AccountingSetupWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: meData, isLoading: isProfileLoading, isError } = useMe();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountMappings, setAccountMappings] = useState<
    Record<string, number | null>
  >({});
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
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
  const userPermissions = meData?.permissions ?? [];
  const userName =
    meData?.user.first_name || meData?.user.username || content.userFallback;

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

  const accountOptions = accounts.map((account) => ({
    value: String(account.id),
    label: `${account.code} - ${account.name}`,
  }));

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return templates;
    }
    return templates.filter((template) =>
      [template.name, template.description, ...template.examples]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm]);

  const handleApplyTemplate = async (templateKey: string) => {
    setActiveKey(templateKey);
    try {
      const response = await http.post(endpoints.accounting.applyTemplate, {
        template_key: templateKey,
      });
      const accountsCreated = response.data?.accounts_created ?? 0;
      const costCentersCreated = response.data?.cost_centers_created ?? 0;
      notifications.show({
        title: "Template applied",
        message: `تم إنشاء ${accountsCreated} حساب و ${costCentersCreated} مركز تكلفة.`,
      });
    } catch (err) {
      notifications.show({
        title: "Apply failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setActiveKey(null);
    }
  };

  const loadMappings = async () => {
    setLoadingMappings(true);
    try {
      const [accountsRes, mappingsRes] = await Promise.all([
        http.get(endpoints.accounting.accounts),
        http.get(endpoints.accounting.mappings),
      ]);
      const accountsData = accountsRes.data ?? [];
      const mappingsData: AccountMapping[] = mappingsRes.data ?? [];
      setAccounts(accountsData);
      setAccountMappings(
        mappingsData.reduce<Record<string, number | null>>((acc, mapping) => {
          acc[mapping.key] = mapping.account ?? null;
          return acc;
        }, {})
      );
    } catch (err) {
      notifications.show({
        title: "Load failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setLoadingMappings(false);
    }
  };

  useEffect(() => {
    void loadMappings();
  }, []);

  const missingRequired = mappingKeys.filter(
    (mapping) => mapping.required && !accountMappings[mapping.key]
  );

  const handleSaveMappings = async () => {
    if (missingRequired.length > 0) {
      notifications.show({
        title: "Missing required mappings",
        message: "يرجى تحديد الحسابات المطلوبة قبل الإنهاء.",
        color: "red",
      });
      return;
    }
    setSavingMappings(true);
    try {
      const payload: Record<string, number | null> = {};
      mappingKeys.forEach((mapping) => {
        const value = accountMappings[mapping.key];
        if (value) {
          payload[mapping.key] = value;
        }
      });
      await http.post(endpoints.accounting.mappingsBulkSet, payload);
      notifications.show({
        title: "Mappings saved",
        message: "تم حفظ إعدادات الربط للحسابات.",
      });
      await loadMappings();
    } catch (err) {
      notifications.show({
        title: "Save failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setSavingMappings(false);
    }
  };

  const requiredCount = mappingKeys.filter((mapping) => mapping.required).length;
  const completedRequired = requiredCount - missingRequired.length;

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

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page accounting-setup-page"
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
            {isProfileLoading && <span className="sidebar-note">...loading profile</span>}
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
          <section className="hero-panel accounting-setup-hero">
            <div className="accounting-setup-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="hero-tags">
                <span className="pill">{content.heroTags.stepOne}</span>
                <span className="pill pill--accent">{content.heroTags.stepTwo}</span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.templates,
                  value: templates.length,
                },
                {
                  label: content.stats.mappings,
                  value: `${completedRequired}/${requiredCount}`,
                },
                {
                  label: content.stats.accounts,
                  value: accounts.length,
                },
                {
                  label: content.stats.progress,
                  value:
                    requiredCount === 0
                      ? "-"
                      : `${Math.round((completedRequired / requiredCount) * 100)}%`,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{loadingMappings ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel accounting-setup-panel">
            <div className="panel__header">
              <div>
                <h2>{content.templates.title}</h2>
                <p>{content.templates.subtitle}</p>
              </div>
              <span className="pill pill--accent">{filteredTemplates.length}</span>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="accounting-setup-state">
                <strong>{content.templates.emptyTitle}</strong>
                <span>{content.templates.emptySubtitle}</span>
              </div>
            ) : (
              <div className="accounting-setup-grid">
                {filteredTemplates.map((template) => (
                  <div key={template.key} className="setup-card">
                    <div className="setup-card__header">
                      <div>
                        <h3>{template.name}</h3>
                        <p>{template.description}</p>
                      </div>
                      <span className="pill">
                        {template.accountCount} {content.templates.accountsLabel}
                      </span>
                    </div>
                    <div className="setup-card__body">
                      <div className="setup-card__tags">
                        <span className="setup-card__label">
                          {content.templates.examplesLabel}
                        </span>
                        <div className="setup-card__chips">
                          {template.examples.map((example) => (
                            <span key={example} className="setup-chip">
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="setup-card__tags">
                        <span className="setup-card__label">
                          {content.templates.costCentersLabel}
                        </span>
                        <div className="setup-card__chips">
                          {template.costCenters.map((center) => (
                            <span key={center} className="setup-chip setup-chip--muted">
                              {center}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="setup-card__actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleApplyTemplate(template.key)}
                        disabled={activeKey === template.key}
                      >
                        {activeKey === template.key ? "..." : content.templates.applyLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel accounting-setup-panel">
            <div className="panel__header">
              <div>
                <h2>{content.mappings.title}</h2>
                <p>{content.mappings.subtitle}</p>
              </div>
              <span className="pill">
                {completedRequired}/{requiredCount}
              </span>
            </div>

            {loadingMappings ? (
              <div className="accounting-setup-state accounting-setup-state--loading">
                {content.mappings.loading}
              </div>
            ) : (
              <div className="mapping-grid">
                {mappingKeys.map((mapping) => (
                  <label key={mapping.key} className="filter-field">
                    <span className="mapping-label">
                      {mapping.label}
                      {mapping.required && (
                        <span className="required-indicator">{content.labels.required}</span>
                      )}
                    </span>
                    <select
                      value={accountMappings[mapping.key] ?? ""}
                      onChange={(event) => {
                        const value = event.target.value ? Number(event.target.value) : null;
                        setAccountMappings((prev) => ({
                          ...prev,
                          [mapping.key]: value,
                        }));
                      }}
                    >
                      <option value="">{content.mappings.selectPlaceholder}</option>
                      {accountOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                {missingRequired.length > 0 && (
                  <div className="accounting-setup-state accounting-setup-state--warning">
                    <strong>{content.mappings.missingTitle}</strong>
                    <span>
                      {missingRequired.map((mapping) => mapping.label).join(", ")}
                    </span>
                  </div>
                )}

                <div className="mapping-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSaveMappings}
                    disabled={missingRequired.length > 0 || savingMappings}
                  >
                    {savingMappings ? "..." : content.mappings.saveLabel}
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>
    </div>
  );
}