import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

import {
  type AttendanceRecord,
  type AttendanceOtpPurpose,
  useAttendanceSelfRequestOtpMutation,
  useAttendanceSelfVerifyOtpMutation,
  useMyAttendanceQuery,
} from "../../shared/hr/hooks";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../shared/navigation/hrSidebarLinks";
import "../DashboardPage.css";
import "./SelfAttendancePage.css";
import { TopbarQuickActions } from "../TopbarQuickActions";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type AttendanceRecordWithApprovals = AttendanceRecord & {
  check_in_approval_status?: string | null;
  check_out_approval_status?: string | null;
};

type Content = {
  brand: string;
  welcome: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  userFallback: string;
  todayLabel: string;
  statusLabel: string;
  statusMap: Record<string, string>;
  detailsTitle: string;
  detailsSubtitle: string;
  otpTitle: string;
  otpSubtitle: string;
  otpCodeLabel: string;
  otpRequestCheckIn: string;
  otpRequestCheckOut: string;
  otpSending: string;
  otpVerifying: string;
  otpVerifySubmit: string;
  otpSentTitle: string;
  otpSentMessage: string;
  otpSendFailedTitle: string;
  otpVerifyFailedTitle: string;
  otpSubmittedTitle: string;
  otpSubmittedMessage: string;
  otpRequestFirst: string;
  otpExpiresIn: (s: number) => string;
  otpExpired: string;
  rows: {
    statusToday: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: string;
    earlyLeaveMinutes: string;
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
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "My Attendance",
    pageSubtitle: "Submit your attendance using Email OTP + GPS. Requests are pending approval.",
    userFallback: "Explorer",
    todayLabel: "Today",
    statusLabel: "Status",
    statusMap: {
      "no-record": "No record",
      "checked-in": "Checked in",
      completed: "Completed",
      present: "Present",
      late: "Late",
      early_leave: "Early leave",
      absent: "Absent",
      incomplete: "Incomplete",
    },
    detailsTitle: "Today’s summary",
    detailsSubtitle: "Live status and timestamps",
    otpTitle: "Email OTP Attendance",
    otpSubtitle:
      "Request a 6-digit code sent to your email. Enter it within 60 seconds; your GPS location will be verified. The request will be pending HR/Manager approval.",
    otpCodeLabel: "6-digit code",
    otpRequestCheckIn: "Request Check-in",
    otpRequestCheckOut: "Request Check-out",
    otpSending: "Sending...",
    otpVerifying: "Verifying...",
    otpVerifySubmit: "Verify & Submit",
    otpSentTitle: "OTP Sent",
    otpSentMessage: "Check your email for the 6-digit code (valid for 60 seconds).",
    otpSendFailedTitle: "Failed to send OTP",
    otpVerifyFailedTitle: "Verification failed",
    otpSubmittedTitle: "Request submitted",
    otpSubmittedMessage: "Recorded successfully and pending HR/Manager approval.",
    otpRequestFirst: "Request an OTP first.",
    otpExpiresIn: (s) => `Code expires in ${s}s`,
    otpExpired: "Code expired. Request again.",
    rows: {
      statusToday: "Status today",
      checkIn: "Check-in",
      checkOut: "Check-out",
      lateMinutes: "Late minutes",
      earlyLeaveMinutes: "Early leave minutes",
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
    welcome: "أهلًا بعودتك",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "حضوري",
    pageSubtitle: "سجل حضورك عبر كود على البريد + التحقق بالموقع. الطلبات تنتظر التأكيد.",
    userFallback: "ضيف",
    todayLabel: "اليوم",
    statusLabel: "الحالة",
    statusMap: {
      "no-record": "لا يوجد سجل",
      "checked-in": "تم الحضور",
      completed: "مكتمل",
      present: "حاضر",
      late: "متأخر",
      early_leave: "انصراف مبكر",
      absent: "غائب",
      incomplete: "غير مكتمل",
    },
    detailsTitle: "ملخص اليوم",
    detailsSubtitle: "الحالة والتوقيتات المباشرة",
    otpTitle: "تسجيل الحضور عبر البريد",
    otpSubtitle:
      "اطلب كود مكون من 6 أرقام على بريدك، أدخله خلال 60 ثانية، ثم سيتم التحقق من موقعك. بعدها الطلب ينتظر موافقة الموارد البشرية/المدير.",
    otpCodeLabel: "كود من 6 أرقام",
    otpRequestCheckIn: "طلب تسجيل حضور",
    otpRequestCheckOut: "طلب تسجيل انصراف",
    otpSending: "جاري الإرسال...",
    otpVerifying: "جاري التحقق...",
    otpVerifySubmit: "تحقق وأرسل الطلب",
    otpSentTitle: "تم إرسال الكود",
    otpSentMessage: "تم إرسال كود من 6 أرقام على بريدك (صالح لمدة 60 ثانية).",
    otpSendFailedTitle: "فشل إرسال الكود",
    otpVerifyFailedTitle: "فشل التحقق",
    otpSubmittedTitle: "تم إرسال الطلب",
    otpSubmittedMessage: "تم تسجيل الطلب وبانتظار موافقة الموارد البشرية/المدير.",
    otpRequestFirst: "اطلب الكود أولًا.",
    otpExpiresIn: (s) => `ينتهي الكود خلال ${s} ثانية`,
    otpExpired: "انتهت صلاحية الكود. اطلب كود جديد.",
    rows: {
      statusToday: "حالة اليوم",
      checkIn: "وقت الحضور",
      checkOut: "وقت الانصراف",
      lateMinutes: "دقائق التأخير",
      earlyLeaveMinutes: "دقائق الانصراف المبكر",
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

function getTodayValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getTimeLabel(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      if (typeof obj.detail === "string") return obj.detail;

      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) return `${key}: ${value.map(String).join(", ")}`;
          return `${key}: ${String(value)}`;
        })
        .join(" | ");
    }

    const status = error.response?.status;
    return status ? `HTTP ${status}` : error.message;
  }

  return String(error);
}

function getErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const detail = obj.detail ?? obj.otp ?? obj.code;
      if (typeof detail === "string" || typeof detail === "number") {
        return String(detail);
      }
    }
  }
  return formatApiError(error);
}





function getGeo(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export function SelfAttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const todayValue = useMemo(() => getTodayValue(), []);
  const [searchTerm, setSearchTerm] = useState("");

  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-language") : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem("managora-theme") : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  const meQuery = useMe();

  // Keep your existing query signature (dateFrom/dateTo) to not break hooks logic
  const myAttendanceQuery = useMyAttendanceQuery({
    dateFrom: todayValue,
    dateTo: todayValue,
  });

  const todayRecord = useMemo<AttendanceRecordWithApprovals | undefined>(() => {
    return myAttendanceQuery.data?.find((record) => record.date === todayValue);
  }, [myAttendanceQuery.data, todayValue]);

  const statusKey = todayRecord
    ? todayRecord.check_out_time
      ? "completed"
      : todayRecord.status || "checked-in"
    : "no-record";

  // ===== NEW OTP FLOW STATE =====
  const [otpPurpose, setOtpPurpose] = useState<AttendanceOtpPurpose>("checkin");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [otpCode, setOtpCode] = useState<string>("");

  const requestOtp = useAttendanceSelfRequestOtpMutation();
  const verifyOtp = useAttendanceSelfVerifyOtpMutation();

  // countdown
  useEffect(() => {
    if (!expiresIn) return;
    const t = setInterval(() => setExpiresIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [expiresIn]);

  const canVerify = useMemo(() => {
    return requestId !== null && expiresIn > 0 && otpCode.trim().length === 6 && !verifyOtp.isPending;
  }, [requestId, expiresIn, otpCode, verifyOtp.isPending]);

  const handleRequestOtp = useCallback(
    async (p: AttendanceOtpPurpose) => {
      try {
        setOtpPurpose(p);
        setOtpCode("");
        const res = await requestOtp.mutateAsync({ purpose: p });
        setRequestId(res.request_id);
        setExpiresIn(res.expires_in);
        notifications.show({
          title: content.otpSentTitle,
          message: content.otpSentMessage,
        });
      } catch (e: unknown) {
        notifications.show({
          title: content.otpSendFailedTitle,
          message: getErrorDetail(e),
          color: "red",
        });
      }
    },
    [content.otpSentTitle, content.otpSentMessage, content.otpSendFailedTitle, requestOtp]
  );

  const handleVerifyOtp = useCallback(async () => {
    if (!canVerify || requestId == null) return;

    try {
      const geo = await getGeo();
      await verifyOtp.mutateAsync({
        request_id: requestId,
        code: otpCode.trim(),
        lat: geo.lat,
        lng: geo.lng,
      });

      notifications.show({
        title: content.otpSubmittedTitle,
        message: content.otpSubmittedMessage,
      });

      setRequestId(null);
      setExpiresIn(0);
      setOtpCode("");

      // refresh my attendance
      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (e: unknown) {
      const msg = getErrorDetail(e);
      notifications.show({
        title: content.otpVerifyFailedTitle,
        message: String(msg),
        color: "red",
      });
    }
  }, [
    canVerify,
    requestId,
    otpCode,
    verifyOtp,
    content.otpSubmittedTitle,
    content.otpSubmittedMessage,
    content.otpVerifyFailedTitle,
    queryClient,
  ]);

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      { path: "/users", label: content.nav.users, icon: "👥", permissions: ["users.view"] },
      {
        path: "/attendance/self",
        label: content.nav.attendanceSelf,
        icon: "🕒",
      },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅", permissions: ["leaves.*"] },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },      
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
      { path: "/admin/audit-logs", label: content.nav.auditLogs, icon: "🛡️", permissions: ["audit.view"] },
      { path: "/setup/templates", label: content.nav.setupTemplates, icon: "🧱" },
      { path: "/setup/progress", label: content.nav.setupProgress, icon: "🚀" },
    ],
    [content.nav]
  );

  const appRole = resolvePrimaryRole(meQuery.data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );

  const employeeNavLinks = useMemo(
    () => [
      {
        path: "/employee/self-service",
        label: isArabic ? "الملف الوظيفي" : "Employee Profile",
        icon: "🪪",
      },
      { path: "/attendance/self", label: content.nav.attendanceSelf, icon: "🕒" },
      { path: "/leaves/balance", label: content.nav.leaveBalance, icon: "📅" },
      { path: "/leaves/request", label: content.nav.leaveRequest, icon: "📝" },
      { path: "/leaves/my", label: content.nav.leaveMyRequests, icon: "📌" },
      { path: "/messages", label: isArabic ? "الرسائل" : "Messages", icon: "✉️" },
    ],
    [content.nav.attendanceSelf, content.nav.leaveBalance, content.nav.leaveMyRequests, content.nav.leaveRequest, isArabic]
  );

  const visibleNavLinks = useMemo(() => {
    if (appRole === "hr") {
      return hrSidebarLinks;
    }

    if (appRole === "employee") {
      return employeeNavLinks;
    }

    const userPermissions = meQuery.data?.permissions ?? [];
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );      
    });
  }, [allowedRolePaths, appRole, employeeNavLinks, hrSidebarLinks, meQuery.data?.permissions, navLinks]);
  
  const companyName =
    meQuery.data?.company.name || content.userFallback;

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page attendance-page"
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
        <TopbarQuickActions isArabic={isArabic} />
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{companyName}</strong>
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
              <span className="nav-icon" aria-hidden="true">🌐</span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>

            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
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
                  <span className="nav-icon" aria-hidden="true">{link.icon}</span>
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
          <section className="hero-panel attendance-hero">
            <div className="hero-panel__intro">
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.todayLabel}</span>
                <span className="pill pill--accent">
                  {content.statusLabel}: {content.statusMap[statusKey]}
                </span>
              </div>
            </div>

            <div className="hero-panel__stats">
              {[
                {
                  label: content.rows.checkIn,
                  value: getTimeLabel(todayRecord?.check_in_time ?? null, isArabic ? "ar" : "en"),
                },
                {
                  label: content.rows.checkOut,
                  value: getTimeLabel(todayRecord?.check_out_time ?? null, isArabic ? "ar" : "en"),
                },
                { label: content.rows.lateMinutes, value: todayRecord?.late_minutes ?? "-" },
                { label: content.rows.earlyLeaveMinutes, value: todayRecord?.early_leave_minutes ?? "-" },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.todayLabel}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid-panels">
            {/* Summary panel (unchanged) */}
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.detailsTitle}</h2>
                  <p>{content.detailsSubtitle}</p>
                </div>
                <span className="attendance-status-pill" data-status={statusKey}>
                  {content.statusMap[statusKey]}
                </span>
              </div>

              <div className="attendance-detail-list">
                <div className="attendance-detail-row">
                  <span>{content.rows.statusToday}</span>
                  <strong>{content.statusMap[statusKey]}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.checkIn}</span>
                  <strong>{getTimeLabel(todayRecord?.check_in_time ?? null, isArabic ? "ar" : "en")}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.checkOut}</span>
                  <strong>{getTimeLabel(todayRecord?.check_out_time ?? null, isArabic ? "ar" : "en")}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.lateMinutes}</span>
                  <strong>{todayRecord?.late_minutes ?? "-"}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.earlyLeaveMinutes}</span>
                  <strong>{todayRecord?.early_leave_minutes ?? "-"}</strong>
                </div>

                {/* Approval info (new but harmless) */}
                <div className="attendance-detail-row">
                  <span>{isArabic ? "تأكيد الحضور" : "Check-in approval"}</span>
                  <strong>{todayRecord?.check_in_approval_status ?? "-"}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{isArabic ? "تأكيد الانصراف" : "Check-out approval"}</span>
                  <strong>{todayRecord?.check_out_approval_status ?? "-"}</strong>
                </div>
              </div>
            </div>

            {/* NEW OTP panel (replaces QR + old action form) */}
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.otpTitle}</h2>
                  <p>{content.otpSubtitle}</p>
                </div>
                <span className="pill">{content.todayLabel}</span>
              </div>

              <div className="attendance-form">
                <div className="attendance-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleRequestOtp("checkin")}
                    disabled={requestOtp.isPending}
                  >
                    {requestOtp.isPending && otpPurpose === "checkin"
                      ? content.otpSending
                      : content.otpRequestCheckIn}
                  </button>

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleRequestOtp("checkout")}
                    disabled={requestOtp.isPending}
                  >
                    {requestOtp.isPending && otpPurpose === "checkout"
                      ? content.otpSending
                      : content.otpRequestCheckOut}
                  </button>
                </div>

                <div className="attendance-fields" style={{ marginTop: 12 }}>
                  <label className="attendance-field">
                    <span>{content.otpCodeLabel}</span>
                    <input
                      inputMode="numeric"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={requestId === null || expiresIn === 0}
                    />
                  </label>
                </div>

                <div className="attendance-actions" style={{ marginTop: 12, alignItems: "center" }}>
                  <span className="attendance-note" style={{ margin: 0 }}>
                    {requestId === null
                      ? content.otpRequestFirst
                      : expiresIn > 0
                      ? content.otpExpiresIn(expiresIn)
                      : content.otpExpired}
                  </span>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleVerifyOtp}
                    disabled={!canVerify}
                  >
                    {verifyOtp.isPending ? content.otpVerifying : content.otpVerifySubmit}
                  </button>
                </div>

                <span className="attendance-note">
                  {isArabic
                    ? "ملاحظة: لا يتم اعتماد الحركة إلا بعد تأكيد الموارد البشرية/المدير."
                    : "Note: the record will be approved only after HR/Manager confirmation."}
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default SelfAttendancePage;