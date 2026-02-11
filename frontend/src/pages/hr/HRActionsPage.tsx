import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { useMe } from "../../shared/auth/useMe";
import {
  type HRAction,
  type PayrollPeriod,
  type SalaryType,
  useHrActionsQuery,
  usePayrollPeriods,
  useSalaryStructures,
  useUpdateHrActionMutation,
} from "../../shared/hr/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import "../DashboardPage.css";
import "./HRActionsPage.css";

type Language = "en" | "ar";

type ThemeMode = "light" | "dark";

type FormState = {
  action_type: HRAction["action_type"];
  value: string;
  reason: string;
  payroll_period_id: string;
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
  heroTag: string;
  stats: {
    total: string;
    warnings: string;
    deductions: string;
    period: string;
  };
  table: {
    title: string;
    subtitle: string;
    employee: string;
    rule: string;
    action: string;
    value: string;
    reason: string;
    period: string;
    manage: string;
    edit: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  modal: {
    title: string;
    actionType: string;
    value: string;
    reason: string;
    payrollPeriod: string;
    noPeriods: string;    
    cancel: string;
    save: string;
  };
  actionTypes: Record<string, string>;  
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
    searchPlaceholder: "Search actions, employees, rules...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "HR Actions",
    pageSubtitle: "Track warnings and deductions across your workforce.",
    heroTag: "Last 30 days",
    stats: {
      total: "Total actions",
      warnings: "Warnings",
      deductions: "Deductions",
      period: "Active period",
    },
    table: {
      title: "Actions log",
      subtitle: "Latest employee actions and adjustments",
      employee: "Employee",
      rule: "Rule",
      action: "Action",
      value: "Value",
      reason: "Reason",
      period: "Period",
      manage: "Manage",
      edit: "Edit",
      emptyTitle: "No actions recorded yet",
      emptySubtitle: "New warnings and deductions will appear here.",
      loading: "Loading actions...",
    },
    modal: {
      title: "Edit action",
      actionType: "Action type",
      value: "Value",
      reason: "Reason",
      payrollPeriod: "Payroll period",
      noPeriods: "No payroll periods available",      
      cancel: "Cancel",
      save: "Save changes",
    },    
    actionTypes: {
      warning: "Warning",
      deduction: "Deduction",
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
    searchPlaceholder: "ابحث عن الإجراءات أو الموظفين أو القواعد...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "إجراءات الموارد البشرية",
    pageSubtitle: "متابعة التنبيهات والخصومات عبر فريق العمل.",
    heroTag: "آخر ٣٠ يوم",
    stats: {
      total: "إجمالي الإجراءات",
      warnings: "تنبيهات",
      deductions: "خصومات",
      period: "الفترة الحالية",
    },
    table: {
      title: "سجل الإجراءات",
      subtitle: "أحدث الإجراءات والتعديلات للموظفين",
      employee: "الموظف",
      rule: "القاعدة",
      action: "الإجراء",
      value: "القيمة",
      reason: "السبب",
      period: "الفترة",
      manage: "إدارة",
      edit: "تعديل",
      emptyTitle: "لا توجد إجراءات حتى الآن",
      emptySubtitle: "ستظهر التنبيهات والخصومات الجديدة هنا.",
      loading: "جاري تحميل الإجراءات...",
    },
    modal: {
      title: "تعديل الإجراء",
      actionType: "نوع الإجراء",
      value: "القيمة",
      reason: "السبب",
      payrollPeriod: "فترة الراتب",
      noPeriods: "لا توجد فترات رواتب متاحة",      
      cancel: "إلغاء",
      save: "حفظ التعديلات",
    },    
    actionTypes: {
      warning: "تنبيه",
      deduction: "خصم",
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

const actionToneMap: Record<string, string> = {
  warning: "warning",
  deduction: "danger",
};

const defaultFormState: FormState = {
  action_type: "warning",
  value: "",
  reason: "",
  payroll_period_id: "",
};

const salaryPeriodMap: Record<SalaryType, PayrollPeriod["period_type"] | null> = {
  monthly: "monthly",
  weekly: "weekly",
  daily: "daily",
  commission: "monthly",
};

function formatValue(value: string) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export function HRActionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: meData, isLoading: isProfileLoading, isError } = useMe();
  const actionsQuery = useHrActionsQuery();
  const payrollPeriodsQuery = usePayrollPeriods();
  const updateActionMutation = useUpdateHrActionMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAction, setEditingAction] = useState<HRAction | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState("");    
  const salaryStructuresQuery = useSalaryStructures({
    employeeId: editingAction?.employee.id ?? null,
    enabled: Boolean(editingAction),
  });  
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
  const userPermissions = useMemo(() => meData?.permissions ?? [], [meData?.permissions]);  
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

  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);
  const payrollPeriods = useMemo(
    () => payrollPeriodsQuery.data ?? [],
    [payrollPeriodsQuery.data]
  );
  const salaryType = useMemo(() => {
    if (!salaryStructuresQuery.data || salaryStructuresQuery.data.length === 0) {
      return null;
    }
    return salaryStructuresQuery.data[0].salary_type;
  }, [salaryStructuresQuery.data]);
  const payrollPeriodType = salaryType ? salaryPeriodMap[salaryType] : null;
  const filteredPayrollPeriods = useMemo(() => {
    if (!payrollPeriodType) {
      return payrollPeriods;
    }
    return payrollPeriods.filter((period) => period.period_type === payrollPeriodType);
  }, [payrollPeriodType, payrollPeriods]);  
  const derivedPayrollPeriodId = useMemo(() => {
    if (!editingAction) {
      return formState.payroll_period_id;
    }
    if (filteredPayrollPeriods.length === 0) {
      return "";
    }
    if (
      formState.payroll_period_id &&
      filteredPayrollPeriods.some(
        (period) => String(period.id) === formState.payroll_period_id
      )
    ) {
      return formState.payroll_period_id;
    }
    const matched = filteredPayrollPeriods.find(
      (period) =>
        period.start_date === editingAction.period_start &&
        period.end_date === editingAction.period_end
    );
    return String(matched?.id ?? filteredPayrollPeriods[0].id);
  }, [editingAction, filteredPayrollPeriods, formState.payroll_period_id]);
  const filteredActions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return actions;      
    }
    return actions.filter((action) => {
      return (
        action.employee.full_name.toLowerCase().includes(query) ||
        action.rule.name.toLowerCase().includes(query) ||
        action.action_type.toLowerCase().includes(query) ||
        action.reason.toLowerCase().includes(query) ||
        String(action.value).toLowerCase().includes(query)
      );
    });
  }, [actions, searchTerm]);

  const stats = useMemo(() => {
    const warnings = actions.filter((action) => action.action_type === "warning");
    const deductions = actions.filter((action) => action.action_type === "deduction");
    return {
      total: actions.length,
      warnings: warnings.length,
      deductions: deductions.length,
    };
  }, [actions]);

  function handleOpenEdit(action: HRAction) {
    setEditingAction(action);
    setFormState({
      action_type: action.action_type,
      value: action.value ?? "",
      reason: action.reason ?? "",
      payroll_period_id: "",
    });
    setErrorMessage("");
  }

  function handleCloseEdit() {
    setEditingAction(null);
    setErrorMessage("");
    setFormState(defaultFormState);
  }
    
  async function handleSubmitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAction) return;
    const selectedPeriod =
      filteredPayrollPeriods.find(
        (period) => String(period.id) === derivedPayrollPeriodId        
      ) ?? null;  
    try {
      await updateActionMutation.mutateAsync({
        id: editingAction.id,
        data: {
          action_type: formState.action_type,
          value: formState.value,
          reason: formState.reason,
          period_start: selectedPeriod?.start_date ?? null,
          period_end: selectedPeriod?.end_date ?? null,
        },
      });
      await actionsQuery.refetch();
      handleCloseEdit();      
    } catch (error) {
      setErrorMessage(String(error));
    }
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

  if (isForbiddenError(actionsQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page hr-actions-page"
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
          <section className="hero-panel hr-actions-hero">
            <div className="hr-actions-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="hero-tags">
                <span className="pill">{content.heroTag}</span>
                <span className="pill pill--accent">{actions.length}</span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                { label: content.stats.warnings, value: stats.warnings },
                { label: content.stats.deductions, value: stats.deductions },
                { label: content.stats.period, value: content.heroTag },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{actionsQuery.isLoading ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel hr-actions-panel">
            <div className="panel__header">
              <div>
                <h2>{content.table.title}</h2>
                <p>{content.table.subtitle}</p>
              </div>
              <span className="pill pill--accent">{filteredActions.length}</span>
            </div>

            {actionsQuery.isLoading && (
              <div className="hr-actions-state hr-actions-state--loading">
                {content.table.loading}
              </div>
            )}
            {!actionsQuery.isLoading && filteredActions.length === 0 && (
              <div className="hr-actions-state">
                <strong>{content.table.emptyTitle}</strong>
                <span>{content.table.emptySubtitle}</span>
              </div>
            )}

            {filteredActions.length > 0 && (
              <div className="hr-actions-table-wrapper">
                <table className="hr-actions-table">
                  <thead>
                    <tr>
                      <th>{content.table.employee}</th>
                      <th>{content.table.rule}</th>
                      <th>{content.table.action}</th>
                      <th>{content.table.value}</th>
                      <th>{content.table.reason}</th>
                      <th>{content.table.period}</th>
                      <th>{content.table.manage}</th>
                    </tr>
                  </thead>
                  <tbody>                    
                    {filteredActions.map((action) => (
                      <tr key={action.id}>
                        <td>
                          <div className="hr-actions-cell">
                            <strong>{action.employee.full_name}</strong>
                            <span>{action.employee.employee_code}</span>
                          </div>
                        </td>
                        <td>{action.rule.name}</td>
                        <td>
                          <span
                            className="action-pill"
                            data-tone={actionToneMap[action.action_type] ?? "neutral"}
                          >
                            {content.actionTypes[action.action_type] ?? action.action_type}
                          </span>
                        </td>
                        <td>{formatValue(action.value)}</td>
                        <td className="hr-actions-reason">
                          {action.reason || "-"}
                        </td>
                        <td>
                          {action.period_start && action.period_end
                            ? `${action.period_start} → ${action.period_end}`
                            : "-"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => handleOpenEdit(action)}
                          >
                            {content.table.edit}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>                
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>

      {editingAction && (
        <div className="hr-actions-modal" role="dialog" aria-modal="true">
          <div className="hr-actions-modal__backdrop" onClick={handleCloseEdit} />
          <div className="hr-actions-modal__content">
            <div className="hr-actions-modal__header">
              <h3>{content.modal.title}</h3>
              <button type="button" className="ghost-button" onClick={handleCloseEdit}>
                ✕
              </button>
            </div>
            <form className="hr-actions-form" onSubmit={handleSubmitEdit}>
              <label className="form-field">
                {content.modal.actionType}
                <select
                  value={formState.action_type}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      action_type: event.target.value as HRAction["action_type"],
                    }))
                  }
                >
                  <option value="warning">{content.actionTypes.warning}</option>
                  <option value="deduction">{content.actionTypes.deduction}</option>
                </select>
              </label>
              <label className="form-field">
                {content.modal.value}
                <input
                  type="number"
                  step="0.01"
                  value={formState.value}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, value: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                {content.modal.reason}
                <textarea
                  rows={3}
                  value={formState.reason}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, reason: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                {content.modal.payrollPeriod}
                <select
                  value={derivedPayrollPeriodId}                  
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      payroll_period_id: event.target.value,
                    }))
                  }
                  disabled={payrollPeriodsQuery.isLoading}
                >
                  {filteredPayrollPeriods.length === 0 && (
                    <option value="">{content.modal.noPeriods}</option>
                  )}
                  {filteredPayrollPeriods.map((period) => (
                    <option key={period.id} value={String(period.id)}>
                      {period.start_date} → {period.end_date}
                    </option>
                  ))}
                </select>
              </label>
              {errorMessage && <p className="form-error">{errorMessage}</p>}              
              <div className="hr-actions-form__actions">
                <button type="button" className="ghost-button" onClick={handleCloseEdit}>
                  {content.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={updateActionMutation.isPending}
                >
                  {content.modal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}