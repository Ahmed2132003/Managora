import { useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useAttendanceRecordsQuery,
  useDepartments,
  useEmployees,
  useAttendancePendingApprovalsQuery,
  useAttendanceApproveRejectMutation,
  type AttendancePendingItem,
} from "../../shared/hr/hooks";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import "../DashboardPage.css";
import "./HRAttendancePage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type AttendanceQrTokenResponse = {
  token: string;
  valid_from: string;
  valid_until: string;
  worksite_id: number;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  // try common keys used across JWT setups
  return (
    window.localStorage.getItem("access") ||
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("jwt") ||
    null
  );
}

function useAttendanceQrGenerateMutationLocal() {
  return useMutation<AttendanceQrTokenResponse, Error, { worksite_id?: number; expires_minutes?: number }>({
    mutationFn: async (payload) => {
      const token = getAuthToken();
      const res = await fetch("/api/attendance/qr/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload ?? {}),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      return (await res.json()) as AttendanceQrTokenResponse;
    },
  });
}

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

  rangeLabel: string;
  filtersTitle: string;
  filtersSubtitle: string;
  searchLabel: string;
  searchHint: string;
  fromLabel: string;
  toLabel: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  employeeLabel: string;
  employeePlaceholder: string;
  statusLabel: string;
  statusPlaceholder: string;
  clearFilters: string;

  stats: {
    total: string;
    present: string;
    late: string;
    absent: string;
  };

  email: {
    title: string;
    subtitle: string;
    senderEmail: string;
    appPassword: string;
    active: string;
    save: string;
    savedTitle: string;
    savedMessage: string;
    failedTitle: string;
    failedMessage: string;
    passwordHint: string;
  };

  approvals: {
    title: string;
    subtitle: string;
    refresh: string;
    rejectReasonLabel: string;
    rejectReasonPlaceholder: string;
    empty: string;
    employee: string;
    date: string;
    action: string;
    time: string;
    distance: string;
    approve: string;
    reject: string;
    approvedTitle: string;
    rejectedTitle: string;
    failedTitle: string;
    failedMessage: string;
  };

  qr: {
    title: string;
    subtitle: string;
    generate: string;
    validFrom: string;
    validUntil: string;
    worksite: string;
    linkLabel: string;
  };

  table: {
    title: string;
    subtitle: string;
    employee: string;
    date: string;
    checkIn: string;
    checkOut: string;
    late: string;
    early: string;
    method: string;
    status: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };

  statusMap: Record<string, string>;
  methodMap: Record<string, string>;

  notifications: {
    qrTitle: string;
    qrMessage: string;
    qrFailedTitle: string;
    qrFailedMessage: string;
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
    searchPlaceholder: "Search attendance, employees, codes...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",

    pageTitle: "HR Attendance",
    pageSubtitle: "Review daily attendance, QR tokens, and approve self-service requests.",

    rangeLabel: "Date range",
    filtersTitle: "Attendance filters",
    filtersSubtitle: "Slice data by date, department, or status",
    searchLabel: "Search",
    searchHint: "Search by name or code",
    fromLabel: "From",
    toLabel: "To",
    departmentLabel: "Department",
    departmentPlaceholder: "All departments",
    employeeLabel: "Employee",
    employeePlaceholder: "Select employee",
    statusLabel: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",

    stats: {
      total: "Total records",
      present: "Present",
      late: "Late",
      absent: "Absent",
    },

    email: {
      title: "Attendance email sender (Company)",
      subtitle:
        "Enter the company email + app password used to send OTP codes to employees (Gmail App Password).",
      senderEmail: "Sender email",
      appPassword: "App password",
      active: "Active",
      save: "Save",
      savedTitle: "Saved",
      savedMessage: "Email config updated.",
      failedTitle: "Failed",
      failedMessage: "Could not save email config.",
      passwordHint: "We never return it after saving.",
    },

    approvals: {
      title: "Pending approvals",
      subtitle: "Approve or reject self-service attendance requests.",
      refresh: "Refresh",
      rejectReasonLabel: "Reject reason (optional)",
      rejectReasonPlaceholder: "Reason shown to employee",
      empty: "No pending requests.",
      employee: "Employee",
      date: "Date",
      action: "Action",
      time: "Time",
      distance: "Distance (m)",
      approve: "Approve",
      reject: "Reject",
      approvedTitle: "Approved",
      rejectedTitle: "Rejected",
      failedTitle: "Failed",
      failedMessage: "Operation failed.",
    },

    qr: {
      title: "Company QR token",
      subtitle: "Daily QR code based on the company schedule",
      generate: "Refresh token",
      validFrom: "Valid from",
      validUntil: "Valid until",
      worksite: "Worksite",
      linkLabel: "Link",
    },

    table: {
      title: "Attendance log",
      subtitle: "Live check-in and check-out status",
      employee: "Employee",
      date: "Date",
      checkIn: "Check-in",
      checkOut: "Check-out",
      late: "Late mins",
      early: "Early mins",
      method: "Method",
      status: "Status",
      emptyTitle: "No attendance records yet",
      emptySubtitle: "Try another date range or search term.",
      loading: "Loading attendance...",
    },

    statusMap: {
      present: "Present",
      late: "Late",
      early_leave: "Early leave",
      absent: "Absent",
      incomplete: "Incomplete",
    },

    methodMap: {
      manual: "Manual",
      qr: "QR",
      gps: "GPS",
    },

    notifications: {
      qrTitle: "QR generated",
      qrMessage: "QR token generated successfully.",
      qrFailedTitle: "Failed to generate QR",
      qrFailedMessage: "Something went wrong while creating the QR token.",
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
    searchPlaceholder: "ابحث عن الحضور أو الموظفين أو الأكواد...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",

    pageTitle: "حضور الموارد البشرية",
    pageSubtitle: "راجع سجلات الحضور، أكواد QR، واعتماد طلبات الحضور الذاتية.",

    rangeLabel: "النطاق الزمني",
    filtersTitle: "فلاتر الحضور",
    filtersSubtitle: "فرز البيانات حسب التاريخ أو القسم أو الحالة",
    searchLabel: "بحث",
    searchHint: "ابحث بالاسم أو الكود",
    fromLabel: "من",
    toLabel: "إلى",
    departmentLabel: "القسم",
    departmentPlaceholder: "كل الأقسام",
    employeeLabel: "الموظف",
    employeePlaceholder: "اختر الموظف",
    statusLabel: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",

    stats: {
      total: "إجمالي السجلات",
      present: "حاضر",
      late: "متأخر",
      absent: "غائب",
    },

    email: {
      title: "إعداد بريد إرسال OTP (الشركة)",
      subtitle:
        "أدخل بريد الشركة وكلمة مرور التطبيقات لإرسال أكواد OTP للموظفين (Gmail App Password).",
      senderEmail: "بريد المُرسل",
      appPassword: "كلمة مرور التطبيقات",
      active: "مفعل",
      save: "حفظ",
      savedTitle: "تم الحفظ",
      savedMessage: "تم تحديث إعدادات البريد.",
      failedTitle: "فشل",
      failedMessage: "تعذر حفظ إعدادات البريد.",
      passwordHint: "لن يتم إرجاعها بعد الحفظ.",
    },

    approvals: {
      title: "طلبات اعتماد معلقة",
      subtitle: "اعتماد أو رفض طلبات الحضور الذاتية.",
      refresh: "تحديث",
      rejectReasonLabel: "سبب الرفض (اختياري)",
      rejectReasonPlaceholder: "سيظهر السبب للموظف",
      empty: "لا توجد طلبات معلقة.",
      employee: "الموظف",
      date: "التاريخ",
      action: "الإجراء",
      time: "الوقت",
      distance: "المسافة (م)",
      approve: "اعتماد",
      reject: "رفض",
      approvedTitle: "تم الاعتماد",
      rejectedTitle: "تم الرفض",
      failedTitle: "فشل",
      failedMessage: "فشلت العملية.",
    },

    qr: {
      title: "رمز QR الخاص بالشركة",
      subtitle: "رمز QR يومي مرتبط بجدول الشركة",
      generate: "تحديث الرمز",
      validFrom: "بداية الصلاحية",
      validUntil: "نهاية الصلاحية",
      worksite: "الموقع",
      linkLabel: "الرابط",
    },

    table: {
      title: "سجل الحضور",
      subtitle: "تفاصيل الدخول والخروج المباشرة",
      employee: "الموظف",
      date: "التاريخ",
      checkIn: "وقت الدخول",
      checkOut: "وقت الخروج",
      late: "دقائق تأخير",
      early: "دقائق انصراف",
      method: "الطريقة",
      status: "الحالة",
      emptyTitle: "لا توجد سجلات حضور",
      emptySubtitle: "جرّب تعديل التاريخ أو البحث.",
      loading: "جاري تحميل سجلات الحضور...",
    },

    statusMap: {
      present: "حاضر",
      late: "متأخر",
      early_leave: "انصراف مبكر",
      absent: "غائب",
      incomplete: "غير مكتمل",
    },

    methodMap: {
      manual: "يدوي",
      qr: "QR",
      gps: "GPS",
    },

    notifications: {
      qrTitle: "تم إنشاء الكود",
      qrMessage: "تم إنشاء كود QR بنجاح.",
      qrFailedTitle: "تعذر إنشاء الكود",
      qrFailedMessage: "حدث خطأ أثناء إنشاء كود QR.",
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

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getErrorDetail(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return fallback;

  const maybe = error as { response?: { data?: unknown } };
  const data = maybe.response?.data;

  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;

    // Join first-level fields
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") parts.push(`${k}: ${v}`);
      else if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`);
    }
    if (parts.length) return parts.join(" | ");
  }

  return fallback;
}

export function HRAttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: meData, isLoading: isProfileLoading, isError } = useMe();

  // filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // QR
  const [qrToken, setQrToken] = useState<{
    token: string;
    valid_from: string;
    valid_until: string;
    worksite_id: number;
  } | null>(null);

  // UI prefs
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
  const userPermissions = useMemo(
    () => meData?.permissions ?? [],
    [meData?.permissions]
  );

  // persist prefs
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-language", language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("managora-theme", theme);
    }
  }, [theme]);

  const userName =
    meData?.user.first_name || meData?.user.username || content.userFallback;

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees({
    search: employeeSearch,
    filters: { departmentId: departmentId ?? undefined },
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map(
        (dept: { id: number; name: string }) => ({
          value: String(dept.id),
          label: dept.name,
        })
      ),
    [departmentsQuery.data]
  );

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map(
        (employee: { id: number; full_name: string; employee_code: string }) => ({
          value: String(employee.id),
          label: `${employee.full_name} (${employee.employee_code})`,
        })
      ),
    [employeesQuery.data]
  );

  const attendanceQuery = useAttendanceRecordsQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    departmentId: departmentId ?? undefined,
    employeeId: employeeId ?? undefined,
    status: status ?? undefined,
    search: employeeSearch || undefined,
  });

  // QR generate (local hook so this page doesn't depend on a missing export)
  const qrGenerateMutation = useAttendanceQrGenerateMutationLocal();

  // Approvals
  const pendingApprovals = useAttendancePendingApprovalsQuery();
  const approveReject = useAttendanceApproveRejectMutation();
  const [rejectReason, setRejectReason] = useState("");

  async function handleApproval(item: AttendancePendingItem, op: "approve" | "reject") {
    try {
      await approveReject.mutateAsync({
        record_id: item.record_id,
        op,
        action: item.action,
        reason: op === "reject" ? rejectReason || "Rejected" : null,
      });
      notifications.show({
        title: op === "approve" ? content.approvals.approvedTitle : content.approvals.rejectedTitle,
        message: `${item.employee_name} - ${item.action} (${item.date})`,
      });
      setRejectReason("");
      await pendingApprovals.refetch();
    } catch (error: unknown) {
      notifications.show({
        title: content.approvals.failedTitle,
        message: getErrorDetail(error, content.approvals.failedMessage),
        color: "red",
      });
    }
  }

  const stats = useMemo(() => {
    const rows = attendanceQuery.data ?? [];
    return {
      total: rows.length,
      present: rows.filter((record: { status?: string }) => record.status === "present").length,
      late: rows.filter((record: { status?: string }) => record.status === "late").length,
      absent: rows.filter((record: { status?: string }) => record.status === "absent").length,
    };
  }, [attendanceQuery.data]);

  const qrTokenValue = qrToken?.token ?? "";
  const qrLink = useMemo(() => {
    if (!qrTokenValue || typeof window === "undefined") return null;
    const url = new URL("/attendance/self", window.location.origin);
    url.searchParams.set("qr_token", qrTokenValue);
    url.searchParams.set("auto", "1");
    return url.toString();
  }, [qrTokenValue]);

  const qrImage = useMemo(() => {
    if (!qrLink) return null;
    const encoded = encodeURIComponent(qrLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
  }, [qrLink]);

  const qrLinkLabel = useMemo(() => {
    if (!qrLink) return "";
    try {
      const url = new URL(qrLink);
      return `${url.origin}${url.pathname}`;
    } catch {
      return qrLink;
    }
  }, [qrLink]);

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
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝", permissions: ["leaves.*"] },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌", permissions: ["leaves.*"] },
      { path: "/hr/employees", label: content.nav.employees, icon: "🧑‍💼", permissions: ["employees.*", "hr.employees.view"] },
      { path: "/hr/departments", label: content.nav.departments, icon: "🏢", permissions: ["hr.departments.view"] },
      { path: "/hr/job-titles", label: content.nav.jobTitles, icon: "🧩", permissions: ["hr.job_titles.view"] },
      { path: "/hr/attendance", label: content.nav.hrAttendance, icon: "📍", permissions: ["attendance.*", "attendance.view_team"] },
      { path: "/hr/leaves/inbox", label: content.nav.leaveInbox, icon: "📥", permissions: ["leaves.*"] },
      { path: "/hr/policies", label: content.nav.policies, icon: "📚", permissions: ["employees.*"] },
      { path: "/hr/actions", label: content.nav.hrActions, icon: "✅", permissions: ["approvals.*"] },
      { path: "/payroll", label: content.nav.payroll, icon: "💸", permissions: ["hr.payroll.view", "hr.payroll.*"] },
      { path: "/accounting/setup", label: content.nav.accountingSetup, icon: "⚙️", permissions: ["accounting.manage_coa", "accounting.*"] },
      { path: "/accounting/journal-entries", label: content.nav.journalEntries, icon: "📒", permissions: ["accounting.journal.view", "accounting.*"] },
      { path: "/accounting/expenses", label: content.nav.expenses, icon: "🧾", permissions: ["expenses.view", "expenses.*"] },
      { path: "/collections", label: content.nav.collections, icon: "💼", permissions: ["accounting.view", "accounting.*"] },
      { path: "/accounting/reports/trial-balance", label: content.nav.trialBalance, icon: "📈", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/general-ledger", label: content.nav.generalLedger, icon: "📊", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/pnl", label: content.nav.profitLoss, icon: "📉", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/balance-sheet", label: content.nav.balanceSheet, icon: "🧮", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/accounting/reports/ar-aging", label: content.nav.agingReport, icon: "⏳", permissions: ["accounting.reports.view", "accounting.*"] },
      { path: "/customers", label: content.nav.customers, icon: "🤝", permissions: ["customers.view", "customers.*"] },
      { path: "/customers/new", label: content.nav.newCustomer, icon: "➕", permissions: ["customers.create", "customers.*"] },
      { path: "/invoices", label: content.nav.invoices, icon: "📄", permissions: ["invoices.*"] },
      { path: "/invoices/new", label: content.nav.newInvoice, icon: "🧾", permissions: ["invoices.*"] },
      { path: "/analytics/alerts", label: content.nav.alertsCenter, icon: "🚨", permissions: ["analytics.alerts.view", "analytics.alerts.manage"] },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      { path: "/copilot", label: content.nav.copilot, icon: "🤖" },
      { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const visibleNavLinks = useMemo(() => {
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) return true;
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [navLinks, userPermissions]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  function handleClearFilters() {
    setDateFrom("");
    setDateTo("");
    setDepartmentId(null);
    setEmployeeId(null);
    setEmployeeSearch("");
    setStatus(null);
  }

  async function handleGenerateQr() {
    try {
      const token = await qrGenerateMutation.mutateAsync({});
      setQrToken(token);
      notifications.show({
        title: content.notifications.qrTitle,
        message: content.notifications.qrMessage,
      });
    } catch (error: unknown) {
      notifications.show({
        title: content.notifications.qrFailedTitle,
        message: getErrorDetail(error, content.notifications.qrFailedMessage),
        color: "red",
      });
    }
  }

  if (
    isForbiddenError(attendanceQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(employeesQuery.error)
  ) {
    return <AccessDenied />;
  }

  return (
    <div
      className="dashboard-page hr-attendance-page"
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
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
          />
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{userName}</strong>
            {isProfileLoading && (
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
          <section className="hero-panel hr-attendance-hero">
            <div className="hr-attendance-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {dateFrom || dateTo ? `${dateFrom || "--"} → ${dateTo || "--"}` : "--"}
                </span>
              </div>
            </div>

            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: stats.total },
                { label: content.stats.present, value: stats.present },
                { label: content.stats.late, value: stats.late },
                { label: content.stats.absent, value: stats.absent },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                  </div>
                  <strong>{attendanceQuery.isLoading ? "-" : stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          {/* Pending approvals */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.approvals.title}</h2>
                <p>{content.approvals.subtitle}</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => pendingApprovals.refetch()}
                disabled={pendingApprovals.isFetching}
              >
                {pendingApprovals.isFetching ? `${content.approvals.refresh}...` : content.approvals.refresh}
              </button>
            </div>

            <div className="attendance-filters">
              <label className="filter-field" style={{ gridColumn: "1 / -1" }}>
                {content.approvals.rejectReasonLabel}
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder={content.approvals.rejectReasonPlaceholder}
                />
              </label>
            </div>

            {pendingApprovals.isLoading ? (
              <div className="attendance-state attendance-state--loading">
                {isArabic ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : !(pendingApprovals.data ?? []).length ? (
              <div className="attendance-state">
                <strong>{content.approvals.empty}</strong>
              </div>
            ) : (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>{content.approvals.employee}</th>
                      <th>{content.approvals.date}</th>
                      <th>{content.approvals.action}</th>
                      <th>{content.approvals.time}</th>
                      <th>{content.approvals.distance}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(pendingApprovals.data ?? []).map((item) => (
                      <tr key={`${item.record_id}-${item.action}`}>
                        <td>{item.employee_name}</td>
                        <td>{item.date}</td>
                        <td>{item.action}</td>
                        <td>{new Date(item.time).toLocaleString(isArabic ? "ar" : "en")}</td>
                        <td>{item.distance_meters ?? "-"}</td>
                        <td>
                          <div className="attendance-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleApproval(item, "approve")}
                              disabled={approveReject.isPending}
                              style={{ padding: "10px 14px" }}
                            >
                              {content.approvals.approve}
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => handleApproval(item, "reject")}
                              disabled={approveReject.isPending}
                              style={{ padding: "10px 14px" }}
                            >
                              {content.approvals.reject}
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

          {/* Filters */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
              <button type="button" className="ghost-button" onClick={handleClearFilters}>
                {content.clearFilters}
              </button>
            </div>
            <div className="attendance-filters">
              <label className="filter-field">
                {content.searchLabel}
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder={content.searchHint}
                />
              </label>
              <label className="filter-field">
                {content.fromLabel}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="filter-field">
                {content.toLabel}
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
              <label className="filter-field">
                {content.departmentLabel}
                <select
                  value={departmentId ?? ""}
                  onChange={(event) =>
                    setDepartmentId(event.target.value ? event.target.value : null)
                  }
                >
                  <option value="">{content.departmentPlaceholder}</option>
                  {departmentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                {content.employeeLabel}
                <select
                  value={employeeId ?? ""}
                  onChange={(event) =>
                    setEmployeeId(event.target.value ? event.target.value : null)
                  }
                >
                  <option value="">{content.employeePlaceholder}</option>
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                {content.statusLabel}
                <select
                  value={status ?? ""}
                  onChange={(event) => setStatus(event.target.value || null)}
                >
                  <option value="">{content.statusPlaceholder}</option>
                  {Object.entries(content.statusMap).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* QR */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.qr.title}</h2>
                <p>{content.qr.subtitle}</p>
              </div>
            </div>

            <div className="attendance-qr-grid">
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateQr}
                disabled={qrGenerateMutation.isPending}
              >
                {qrGenerateMutation.isPending
                  ? `${content.qr.generate}...`
                  : content.qr.generate}
              </button>
            </div>

            {qrToken && (
              <div className="qr-token-card">
                <div className="qr-token-image">
                  {qrImage ? (
                    <img src={qrImage} alt="Company QR" />
                  ) : (
                    <span>{content.notifications.qrFailedMessage}</span>
                  )}
                </div>
                <div className="qr-token-meta">
                  <span>
                    {content.qr.validFrom}:{" "}
                    {new Date(qrToken.valid_from).toLocaleString(isArabic ? "ar" : "en")}
                  </span>
                  <span>
                    {content.qr.validUntil}:{" "}
                    {new Date(qrToken.valid_until).toLocaleString(isArabic ? "ar" : "en")}
                  </span>
                  <span>
                    {content.qr.worksite}: {qrToken.worksite_id}
                  </span>
                  {qrLink && (
                    <span style={{ wordBreak: "break-all" }}>
                      {content.qr.linkLabel}:{" "}
                      <a href={qrLink} target="_blank" rel="noreferrer">
                        {qrLinkLabel}
                      </a>
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Table */}
          <section className="panel hr-attendance-panel">
            <div className="panel__header">
              <div>
                <h2>{content.table.title}</h2>
                <p>{content.table.subtitle}</p>
              </div>
            </div>

            {attendanceQuery.isLoading ? (
              <div className="attendance-state attendance-state--loading">
                {content.table.loading}
              </div>
            ) : (attendanceQuery.data ?? []).length === 0 ? (
              <div className="attendance-state">
                <strong>{content.table.emptyTitle}</strong>
                <span>{content.table.emptySubtitle}</span>
              </div>
            ) : (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>{content.table.employee}</th>
                      <th>{content.table.date}</th>
                      <th>{content.table.checkIn}</th>
                      <th>{content.table.checkOut}</th>
                      <th>{content.table.late}</th>
                      <th>{content.table.early}</th>
                      <th>{content.table.method}</th>
                      <th>{content.table.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceQuery.data ?? []).map((record: { id: number; date: string; status: string; method: string; check_in_time: string | null; check_out_time: string | null; late_minutes: number | null; early_leave_minutes: number | null; employee: { full_name: string; employee_code: string } }) => (
                      <tr key={record.id}>
                        <td>
                          <div className="attendance-employee">
                            <strong>{record.employee.full_name}</strong>
                            <span>{record.employee.employee_code}</span>
                          </div>
                        </td>
                        <td>{record.date}</td>
                        <td>{formatTime(record.check_in_time)}</td>
                        <td>{formatTime(record.check_out_time)}</td>
                        <td>{record.late_minutes || "-"}</td>
                        <td>{record.early_leave_minutes || "-"}</td>
                        <td>{content.methodMap[record.method] ?? record.method}</td>
                        <td>
                          <span className="status-pill" data-status={record.status}>
                            {content.statusMap[record.status] ?? record.status}
                          </span>
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
    </div>
  );
}
