import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { isForbiddenError } from "../../shared/api/errors.ts";
import {
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
  type JobTitle,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";
import "../DashboardPage.css";
import "./JobTitlesPage.css";

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
  addJobTitle: string;
  filtersTitle: string;
  filtersSubtitle: string;
  searchLabel: string;
  searchHint: string;
  statusLabel: string;
  statusPlaceholder: string;
  clearFilters: string;
  stats: {
    total: string;
    active: string;
    inactive: string;
  };
  table: {
    title: string;
    subtitle: string;
    name: string;
    status: string;
    actions: string;
    edit: string;
    delete: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  modal: {
    titleNew: string;
    titleEdit: string;
    nameLabel: string;
    namePlaceholder: string;
    activeLabel: string;
    cancel: string;
    save: string;
  };
  statusMap: Record<string, string>;
  notifications: {
    createdTitle: string;
    createdMessage: string;
    updatedTitle: string;
    updatedMessage: string;
    deletedTitle: string;
    deletedMessage: string;
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
    searchPlaceholder: "Search job titles...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Job Titles",
    pageSubtitle: "Manage active job titles across your organization.",
    addJobTitle: "Add Job Title",
    filtersTitle: "Job title filters",
    filtersSubtitle: "Refine by keyword or status",
    searchLabel: "Search",
    searchHint: "Search by job title name",
    statusLabel: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",
    stats: {
      total: "Total job titles",
      active: "Active",
      inactive: "Inactive",
    },
    table: {
      title: "Job titles list",
      subtitle: "Live status of all roles",
      name: "Name",
      status: "Status",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      emptyTitle: "No job titles found",
      emptySubtitle: "Try adjusting your search or add a new title.",
      loading: "Loading job titles...",
    },
    modal: {
      titleNew: "New Job Title",
      titleEdit: "Edit Job Title",
      nameLabel: "Job title name",
      namePlaceholder: "e.g. Senior Accountant",
      activeLabel: "Active",
      cancel: "Cancel",
      save: "Save",
    },
    statusMap: {
      active: "Active",
      inactive: "Inactive",
    },
    notifications: {
      createdTitle: "Job title created",
      createdMessage: "Job title created successfully.",
      updatedTitle: "Job title updated",
      updatedMessage: "Job title updated successfully.",
      deletedTitle: "Job title deleted",
      deletedMessage: "Job title deleted successfully.",
      errorTitle: "Something went wrong",
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
    searchPlaceholder: "ابحث عن المسميات الوظيفية...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "المسميات الوظيفية",
    pageSubtitle: "إدارة المسميات النشطة داخل المنشأة.",
    addJobTitle: "إضافة مسمى وظيفي",
    filtersTitle: "فلاتر المسميات",
    filtersSubtitle: "قم بالتصفية بالكلمة أو الحالة",
    searchLabel: "بحث",
    searchHint: "ابحث باسم المسمى الوظيفي",
    statusLabel: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",
    stats: {
      total: "إجمالي المسميات",
      active: "نشطة",
      inactive: "غير نشطة",
    },
    table: {
      title: "قائمة المسميات الوظيفية",
      subtitle: "حالة كل مسمى بشكل مباشر",
      name: "المسمى",
      status: "الحالة",
      actions: "الإجراءات",
      edit: "تعديل",
      delete: "حذف",
      emptyTitle: "لا توجد مسميات",
      emptySubtitle: "جرّب إضافة مسمى جديد أو غيّر البحث.",
      loading: "جاري تحميل المسميات...",
    },
    modal: {
      titleNew: "مسمى وظيفي جديد",
      titleEdit: "تعديل مسمى وظيفي",
      nameLabel: "اسم المسمى الوظيفي",
      namePlaceholder: "مثال: محاسب أول",
      activeLabel: "نشط",
      cancel: "إلغاء",
      save: "حفظ",
    },
    statusMap: {
      active: "نشط",
      inactive: "غير نشط",
    },
    notifications: {
      createdTitle: "تم إنشاء المسمى",
      createdMessage: "تم إنشاء المسمى الوظيفي بنجاح.",
      updatedTitle: "تم تحديث المسمى",
      updatedMessage: "تم تحديث المسمى الوظيفي بنجاح.",
      deletedTitle: "تم حذف المسمى",
      deletedMessage: "تم حذف المسمى الوظيفي بنجاح.",
      errorTitle: "حدث خطأ",
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

const jobTitleSchema = z.object({
  name: z.string().min(1, "المسمى مطلوب"),
  is_active: z.boolean(),
});

type JobTitleFormValues = z.input<typeof jobTitleSchema>;

type StatusFilter = "all" | "active" | "inactive";

const defaultValues: JobTitleFormValues = {
  name: "",
  is_active: true,
};

export function JobTitlesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<JobTitle | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  const meQuery = useMe();
  const jobTitlesQuery = useJobTitles();
  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();

  const form = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues,
  });
  const isActiveValue = useWatch({ control: form.control, name: "is_active" });

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

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, is_active: editing.is_active });
    } else {
      form.reset(defaultValues);
    }
  }, [editing, form]);

  const stats = useMemo(() => {
    const data = jobTitlesQuery.data ?? [];
    const total = data.length;
    const active = data.filter((item) => item.is_active).length;
    return {
      total,
      active,
      inactive: total - active,
    };
  }, [jobTitlesQuery.data]);

  const filteredJobTitles = useMemo(() => {
    const data = jobTitlesQuery.data ?? [];
    const query = searchTerm.trim().toLowerCase();
    return data.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.is_active : !item.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [jobTitlesQuery.data, searchTerm, statusFilter]);

  const userName =
    meQuery.data?.user.first_name ||
    meQuery.data?.user.username ||
    content.userFallback;

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
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
        icon: "🧭",
        permissions: ["hr.attendance.view"],
      },
      {
        path: "/hr/leave-inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.*"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📘",
        permissions: ["policies.view"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "⚡",
        permissions: ["hr.actions.view"],
      },
      {
        path: "/hr/payroll",
        label: content.nav.payroll,
        icon: "💸",
        permissions: ["payroll.view"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "🧮",
      },
      {
        path: "/accounting/journal-entries",
        label: content.nav.journalEntries,
        icon: "📓",
        permissions: ["journal_entries.view"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "💳",
        permissions: ["expenses.view"],
      },
      {
        path: "/accounting/collections",
        label: content.nav.collections,
        icon: "💰",
        permissions: ["collections.view"],
      },
      {
        path: "/accounting/trial-balance",
        label: content.nav.trialBalance,
        icon: "📊",
        permissions: ["trial_balance.view"],
      },
      {
        path: "/accounting/general-ledger",
        label: content.nav.generalLedger,
        icon: "📒",
        permissions: ["general_ledger.view"],
      },
      {
        path: "/accounting/profit-loss",
        label: content.nav.profitLoss,
        icon: "📈",
        permissions: ["profit_loss.view"],
      },
      {
        path: "/accounting/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧾",
        permissions: ["balance_sheet.view"],
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

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  function handleOpenNew() {
    setEditing(null);
    setOpened(true);
  }

  function handleCloseModal() {
    setOpened(false);
    setEditing(null);
  }

  async function handleSubmit(values: JobTitleFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: content.notifications.updatedTitle,
          message: content.notifications.updatedMessage,
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: content.notifications.createdTitle,
          message: content.notifications.createdMessage,
        });
      }
      handleCloseModal();
      await jobTitlesQuery.refetch();
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: content.notifications.deletedTitle,
        message: content.notifications.deletedMessage,
      });
      await jobTitlesQuery.refetch();
    } catch (error) {
      notifications.show({
        title: content.notifications.errorTitle,
        message: String(error),
        color: "red",
      });
    }
  }

  function handleClearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
  }

  if (isForbiddenError(jobTitlesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page job-titles-page"
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
            {meQuery.isLoading && <span className="sidebar-note">...loading profile</span>}
            {meQuery.isError && (
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
          <section className="hero-panel job-titles-hero">
            <div className="job-titles-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <button type="button" className="primary-button" onClick={handleOpenNew}>
                {content.addJobTitle}
              </button>
            </div>
            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                { label: content.stats.active, value: stats.active },
                { label: content.stats.inactive, value: stats.inactive },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{jobTitlesQuery.isLoading ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel job-titles-panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
              <button type="button" className="ghost-button" onClick={handleClearFilters}>
                {content.clearFilters}
              </button>
            </div>
            <div className="job-titles-filters">
              <label className="filter-field">
                {content.searchLabel}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={content.searchHint}
                />
              </label>
              <label className="filter-field">
                {content.statusLabel}
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="all">{content.statusPlaceholder}</option>
                  <option value="active">{content.statusMap.active}</option>
                  <option value="inactive">{content.statusMap.inactive}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel job-titles-panel">
            <div className="panel__header">
              <div>
                <h2>{content.table.title}</h2>
                <p>{content.table.subtitle}</p>
              </div>
            </div>
            {jobTitlesQuery.isLoading ? (
              <div className="job-titles-state job-titles-state--loading">
                {content.table.loading}
              </div>
            ) : filteredJobTitles.length === 0 ? (
              <div className="job-titles-state">
                <strong>{content.table.emptyTitle}</strong>
                <span>{content.table.emptySubtitle}</span>
              </div>
            ) : (
              <div className="job-titles-table-wrapper">
                <table className="job-titles-table">
                  <thead>
                    <tr>
                      <th>{content.table.name}</th>
                      <th>{content.table.status}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobTitles.map((jobTitle) => (
                      <tr key={jobTitle.id}>
                        <td>{jobTitle.name}</td>
                        <td>
                          <span
                            className="status-pill"
                            data-status={jobTitle.is_active ? "active" : "inactive"}
                          >
                            {jobTitle.is_active
                              ? content.statusMap.active
                              : content.statusMap.inactive}
                          </span>
                        </td>
                        <td>
                          <div className="job-titles-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => {
                                setEditing(jobTitle);
                                setOpened(true);
                              }}
                            >
                              {content.table.edit}
                            </button>
                            <button
                              type="button"
                              className="ghost-button ghost-button--danger"
                              onClick={() => handleDelete(jobTitle.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {content.table.delete}
                            </button>
                          </div>
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

      {opened && (
        <div className="job-titles-modal" role="dialog" aria-modal="true">
          <div className="job-titles-modal__backdrop" onClick={handleCloseModal} />
          <div className="job-titles-modal__content">
            <div className="job-titles-modal__header">
              <div>
                <h3>{editing ? content.modal.titleEdit : content.modal.titleNew}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form className="job-titles-form" onSubmit={form.handleSubmit(handleSubmit)}>
              <label className="form-field">
                {content.modal.nameLabel}
                <input
                  type="text"
                  placeholder={content.modal.namePlaceholder}
                  {...form.register("name")}
                />
                {form.formState.errors.name?.message && (
                  <span className="field-error">{form.formState.errors.name?.message}</span>
                )}
              </label>
              <label className="toggle-field">
                <span>{content.modal.activeLabel}</span>
                <input
                  type="checkbox"
                  checked={Boolean(isActiveValue)}
                  onChange={(event) =>
                    form.setValue("is_active", event.currentTarget.checked)
                  }
                />
              </label>
              <div className="job-titles-form__actions">
                <button type="button" className="ghost-button" onClick={handleCloseModal}>
                  {content.modal.cancel}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={createMutation.isPending || updateMutation.isPending}
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