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
  useApproveLeaveRequestMutation,
  useLeaveApprovalsInboxQuery,
  useRejectLeaveRequestMutation,
} from "../../shared/hr/hooks";
import type { LeaveRequest } from "../../shared/hr/hooks";
import "../DashboardPage.css";
import "./LeaveInboxPage.css";

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
  overviewLabel: string;
  stats: {
    pending: string;
    totalDays: string;
    averageDays: string;
    employees: string;
  };
  table: {
    title: string;
    subtitle: string;
    employee: string;
    type: string;
    dates: string;
    days: string;
    status: string;
    action: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
    review: string;
  };
  reviewPanel: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptySubtitle: string;
    employee: string;
    type: string;
    dates: string;
    days: string;
    reason: string;
    rejectReasonLabel: string;
    rejectReasonPlaceholder: string;
    approve: string;
    reject: string;
    pendingBadge: string;
  };
  statusLabels: {
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
  };
  notifications: {
    approveTitle: string;
    approveMessage: string;
    rejectTitle: string;
    rejectMessage: string;
    approveError: string;
    rejectError: string;
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
    searchPlaceholder: "Search employees, leave types, statuses...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Leave Inbox",
    pageSubtitle: "Review pending leave approvals and keep teams moving.",
    overviewLabel: "Pending approvals",
    stats: {
      pending: "Pending requests",
      totalDays: "Total days",
      averageDays: "Average duration",
      employees: "Employees impacted",
    },
    table: {
      title: "Approvals queue",
      subtitle: "Requests waiting for review",
      employee: "Employee",
      type: "Leave type",
      dates: "Dates",
      days: "Days",
      status: "Status",
      action: "Action",
      emptyTitle: "No pending requests",
      emptySubtitle: "All caught up for now.",
      loading: "Loading requests...",
      review: "Review",
    },
    reviewPanel: {
      title: "Request review",
      subtitle: "Approve or reject with notes.",
      emptyTitle: "Select a request",
      emptySubtitle: "Pick a row to review details.",
      employee: "Employee",
      type: "Leave type",
      dates: "Dates",
      days: "Days",
      reason: "Reason",
      rejectReasonLabel: "Rejection reason (optional)",
      rejectReasonPlaceholder: "Add an optional note...",
      approve: "Approve",
      reject: "Reject",
      pendingBadge: "Pending",
    },
    statusLabels: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    },
    notifications: {
      approveTitle: "Approved",
      approveMessage: "Leave request approved.",
      rejectTitle: "Rejected",
      rejectMessage: "Leave request rejected.",
      approveError: "Approval failed",
      rejectError: "Rejection failed",
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
    searchPlaceholder: "ابحث عن الموظف أو نوع الإجازة أو الحالة...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "وارد الإجازات",
    pageSubtitle: "راجع طلبات الإجازة المعلقة وابقِ الفريق متحركًا.",
    overviewLabel: "طلبات معلقة",
    stats: {
      pending: "طلبات معلقة",
      totalDays: "إجمالي الأيام",
      averageDays: "متوسط المدة",
      employees: "عدد الموظفين",
    },
    table: {
      title: "قائمة المراجعة",
      subtitle: "طلبات بانتظار الاعتماد",
      employee: "الموظف",
      type: "نوع الإجازة",
      dates: "التواريخ",
      days: "الأيام",
      status: "الحالة",
      action: "إجراء",
      emptyTitle: "لا توجد طلبات معلقة",
      emptySubtitle: "تمت مراجعة كل الطلبات حتى الآن.",
      loading: "جاري تحميل الطلبات...",
      review: "مراجعة",
    },
    reviewPanel: {
      title: "مراجعة الطلب",
      subtitle: "وافق أو ارفض مع ملاحظات.",
      emptyTitle: "اختر طلبًا",
      emptySubtitle: "حدد طلبًا لعرض التفاصيل.",
      employee: "الموظف",
      type: "نوع الإجازة",
      dates: "التواريخ",
      days: "عدد الأيام",
      reason: "السبب",
      rejectReasonLabel: "سبب الرفض (اختياري)",
      rejectReasonPlaceholder: "أضف ملاحظة اختيارية...",
      approve: "موافقة",
      reject: "رفض",
      pendingBadge: "معلق",
    },
    statusLabels: {
      pending: "معلق",
      approved: "معتمد",
      rejected: "مرفوض",
      cancelled: "ملغي",
    },
    notifications: {
      approveTitle: "تمت الموافقة",
      approveMessage: "تم اعتماد الطلب.",
      rejectTitle: "تم الرفض",
      rejectMessage: "تم رفض الطلب.",
      approveError: "فشل الموافقة",
      rejectError: "فشل الرفض",
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

const statusClasses: Record<string, string> = {
  pending: "status-pill--pending",
  approved: "status-pill--approved",
  rejected: "status-pill--rejected",
  cancelled: "status-pill--cancelled",
};

export function LeaveInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const meQuery = useMe();
  const queryClient = useQueryClient();
  const inboxQuery = useLeaveApprovalsInboxQuery({ status: "pending" });
  const approveMutation = useApproveLeaveRequestMutation();
  const rejectMutation = useRejectLeaveRequestMutation();
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
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

  const requests = useMemo(() => inboxQuery.data ?? [], [inboxQuery.data]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return requests;
    }
    return requests.filter((request) => {
      const employee = request.employee?.full_name ?? "";
      const leaveType = request.leave_type.name ?? "";
      const status = request.status ?? "";
      return [employee, leaveType, status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [requests, searchTerm]);

  const stats = useMemo(() => {
    const totalDays = requests.reduce((sum, request) => sum + Number(request.days ?? 0), 0);    
    const uniqueEmployees = new Set(
      requests.map((request) => request.employee?.id ?? request.employee?.full_name)
    );
    return {
      totalRequests: requests.length,
      totalDays,
      averageDays: requests.length ? totalDays / requests.length : 0,
      employees: Array.from(uniqueEmployees).filter(Boolean).length,
    };
  }, [requests]);

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

  async function handleApprove() {
    if (!selected) return;
    try {
      await approveMutation.mutateAsync(selected.id);
      notifications.show({
        title: content.notifications.approveTitle,
        message: content.notifications.approveMessage,
        color: "green",
      });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "balances", "my"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.approveError,
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleReject() {
    if (!selected) return;
    try {
      await rejectMutation.mutateAsync({
        id: selected.id,
        reason: rejectReason.trim() || undefined,
      });
      notifications.show({
        title: content.notifications.rejectTitle,
        message: content.notifications.rejectMessage,
        color: "yellow",
      });
      setSelected(null);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.rejectError,
        message: String(error),
        color: "red",
      });
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  if (isForbiddenError(inboxQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page leave-inbox-page"
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
          <section className="hero-panel leave-inbox-hero">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.overviewLabel}</span>
                <span className="pill pill--accent">{stats.totalRequests}</span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.pending,
                  value: stats.totalRequests,
                },
                {
                  label: content.stats.totalDays,
                  value: stats.totalDays,
                },
                {
                  label: content.stats.averageDays,
                  value: stats.averageDays.toFixed(1),
                },
                {
                  label: content.stats.employees,
                  value: stats.employees,
                },
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
            <div className="panel leave-inbox-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.table.title}</h2>
                  <p>{content.table.subtitle}</p>
                </div>
                {inboxQuery.isLoading && (
                  <span className="panel-meta">{content.table.loading}</span>
                )}
              </div>
              <div className="leave-inbox-table-wrapper">
                <table className="leave-inbox-table">
                  <thead>
                    <tr>
                      <th>{content.table.employee}</th>
                      <th>{content.table.type}</th>
                      <th>{content.table.dates}</th>
                      <th>{content.table.days}</th>
                      <th>{content.table.status}</th>
                      <th>{content.table.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.employee?.full_name ?? "-"}</td>
                        <td>{request.leave_type.name}</td>
                        <td>
                          {request.start_date} → {request.end_date}
                        </td>
                        <td>{request.days}</td>
                        <td>
                          <span
                            className={`status-pill ${
                              statusClasses[request.status] ?? "status-pill--pending"
                            }`}
                          >
                            {content.statusLabels[request.status as keyof Content["statusLabels"]] ??
                              request.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setSelected(request)}
                          >
                            {content.table.review}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!inboxQuery.isLoading && filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="leave-inbox-empty">
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

            <div className="panel leave-inbox-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.reviewPanel.title}</h2>
                  <p>{content.reviewPanel.subtitle}</p>
                </div>
                {selected && (
                  <span className="status-pill status-pill--pending">
                    {content.reviewPanel.pendingBadge}
                  </span>
                )}
              </div>
              {!selected && (
                <div className="leave-inbox-empty">
                  <strong>{content.reviewPanel.emptyTitle}</strong>
                  <span>{content.reviewPanel.emptySubtitle}</span>
                </div>
              )}
              {selected && (
                <div className="leave-inbox-review">
                  <div className="leave-inbox-review__details">
                    <div>
                      <span>{content.reviewPanel.employee}</span>
                      <strong>{selected.employee?.full_name ?? "-"}</strong>
                    </div>
                    <div>
                      <span>{content.reviewPanel.type}</span>
                      <strong>{selected.leave_type.name}</strong>
                    </div>
                    <div>
                      <span>{content.reviewPanel.dates}</span>
                      <strong>
                        {selected.start_date} → {selected.end_date}
                      </strong>
                    </div>
                    <div>
                      <span>{content.reviewPanel.days}</span>
                      <strong>{selected.days}</strong>
                    </div>
                    {selected.reason && (
                      <div>
                        <span>{content.reviewPanel.reason}</span>
                        <strong>{selected.reason}</strong>
                      </div>
                    )}
                  </div>
                  <div className="leave-inbox-review__field">
                    <label htmlFor="reject-reason">
                      {content.reviewPanel.rejectReasonLabel}
                    </label>
                    <textarea
                      id="reject-reason"
                      value={rejectReason}
                      placeholder={content.reviewPanel.rejectReasonPlaceholder}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="leave-inbox-review__actions">
                    <button
                      type="button"
                      className="ghost-button ghost-button--danger"
                      onClick={handleReject}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending
                        ? content.notifications.rejectTitle
                        : content.reviewPanel.reject}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending
                        ? content.notifications.approveTitle
                        : content.reviewPanel.approve}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}