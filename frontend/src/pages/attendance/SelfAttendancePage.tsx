import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";

import {
  type AttendanceActionPayload,
  type AttendanceRecord,
  useCheckInMutation,
  useCheckOutMutation,
  useAttendanceCompanyQrQuery,
  useMyAttendanceQuery,
} from "../../shared/hr/hooks";
import { useMe } from "../../shared/auth/useMe";
import { clearTokens } from "../../shared/auth/tokens";
import { hasPermission } from "../../shared/auth/useCan";
import "../DashboardPage.css";
import "./SelfAttendancePage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

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
  actionTitle: string;
  actionSubtitle: string;
  qrTitle: string;
  qrSubtitle: string;
  qrUnavailable: string;
  qrValidFrom: string;
  qrValidUntil: string;
  qrWorksite: string;
  fields: {
    employeeId: string;
    method: string;    
    shiftId: string;
    worksiteId: string;
    qrToken: string;
    shiftPlaceholder: string;
    qrPlaceholder: string;
    worksitePlaceholder: string;
  };
  rows: {
    statusToday: string;
    checkIn: string;
    checkOut: string;
    lateMinutes: string;
    earlyLeaveMinutes: string;
  };
  actions: {
    checkIn: string;
    checkOut: string;
  };
  methodOptions: Array<{ value: AttendanceActionPayload["method"]; label: string }>;
  notifications: {
    missingEmployeeTitle: string;
    missingEmployeeMessage: string;
    methodWarningTitle: string;
    methodWarningMessage: string;
    locationTitle: string;
    locationMessage: string;
    qrLocationTitle: string;
    qrLocationMessage: string;
    worksiteTitle: string;
    worksiteMessage: string;    
    qrTitle: string;
    qrMessage: string;
    shiftTitle: string;
    shiftMessage: string;
    checkInTitle: string;
    checkInMessage: string;
    checkOutTitle: string;
    checkOutMessage: string;
    failedTitle: string;
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
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "My Attendance",
    pageSubtitle: "Track today’s check-in and check-out moments with confidence.",
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
    actionTitle: "Self-service actions",
    actionSubtitle: "Submit check-in or check-out on your own",
    qrTitle: "Company QR code",
    qrSubtitle: "Scan this code to check in or out within the allowed time window.",
    qrUnavailable: "QR settings are not configured yet. Contact HR.",
    qrValidFrom: "Valid from",
    qrValidUntil: "Valid until",
    qrWorksite: "Worksite",    
    fields: {
      employeeId: "Employee ID",
      method: "Method",
      shiftId: "Shift ID",
      worksiteId: "Worksite ID (optional)",
      qrToken: "QR Token",
      shiftPlaceholder: "Example: 3",
      qrPlaceholder: "Paste the QR token",
      worksitePlaceholder: "Required for GPS",
    },
    rows: {
      statusToday: "Status today",
      checkIn: "Check-in",
      checkOut: "Check-out",
      lateMinutes: "Late minutes",
      earlyLeaveMinutes: "Early leave minutes",
    },
    actions: {
      checkIn: "Check-in",
      checkOut: "Check-out",
    },
    methodOptions: [
      { value: "gps", label: "GPS" },
      { value: "qr", label: "QR" },
      { value: "manual", label: "Manual" },
    ],
    notifications: {
      missingEmployeeTitle: "Missing info",
      missingEmployeeMessage: "Please enter the employee ID before continuing.",
      methodWarningTitle: "Attendance method",
      methodWarningMessage:
        "Checking in for someone else must be manual. Location data will be ignored.",
      locationTitle: "Location required",
      locationMessage:
        "We could not read the location, so we’ll use manual check-in instead.",
      qrLocationTitle: "Location required",
      qrLocationMessage: "Location is required for QR attendance. Please enable GPS.",
      worksiteTitle: "Worksite required",      
      worksiteMessage:
        "Provide a worksite ID to enable GPS attendance. Manual mode will be used.",
      qrTitle: "QR token required",
      qrMessage: "Please paste the QR token before continuing.",
      shiftTitle: "Missing shift",
      shiftMessage: "Please enter a shift ID before continuing.",
      checkInTitle: "Checked in",
      checkInMessage: "Attendance has been recorded successfully.",
      checkOutTitle: "Checked out",
      checkOutMessage: "Checkout has been recorded successfully.",
      failedTitle: "Action failed",
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
    welcome: "أهلًا بعودتك",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "حضوري",
    pageSubtitle: "تابع تسجيل الحضور والانصراف اليوم بثقة.",
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
    actionTitle: "إجراءات الحضور",
    actionSubtitle: "سجل حضورك أو انصرافك بنفسك",
    qrTitle: "رمز QR الخاص بالشركة",
    qrSubtitle: "امسح الرمز لتسجيل الحضور أو الانصراف ضمن الوقت المسموح.",
    qrUnavailable: "لم يتم إعداد رمز QR بعد. تواصل مع الموارد البشرية.",
    qrValidFrom: "بداية الصلاحية",
    qrValidUntil: "نهاية الصلاحية",
    qrWorksite: "موقع العمل",    
    fields: {
      employeeId: "رقم الموظف",
      method: "الطريقة",
      shiftId: "رقم الوردية",
      worksiteId: "معرف الموقع (اختياري)",
      qrToken: "كود QR",
      shiftPlaceholder: "مثال: 3",
      qrPlaceholder: "الصق كود الـ QR هنا",
      worksitePlaceholder: "مطلوب لطريقة GPS",
    },
    rows: {
      statusToday: "حالة اليوم",
      checkIn: "وقت الحضور",
      checkOut: "وقت الانصراف",
      lateMinutes: "دقائق التأخير",
      earlyLeaveMinutes: "دقائق الانصراف المبكر",
    },
    actions: {
      checkIn: "تسجيل حضور",
      checkOut: "تسجيل انصراف",
    },
    methodOptions: [
      { value: "gps", label: "GPS" },
      { value: "qr", label: "QR" },
      { value: "manual", label: "يدوي" },
    ],
    notifications: {
      missingEmployeeTitle: "بيانات ناقصة",
      missingEmployeeMessage: "من فضلك أدخل رقم الموظف قبل المتابعة.",
      methodWarningTitle: "طريقة تسجيل الحضور",
      methodWarningMessage:
        "تسجيل الحضور لشخص آخر يجب أن يكون يدويًا. سيتم تجاهل بيانات الموقع.",
      locationTitle: "الموقع مطلوب",
      locationMessage:
        "لم نتمكن من قراءة الموقع، سيتم تسجيل الحضور بالطريقة اليدوية.",
      qrLocationTitle: "الموقع مطلوب",
      qrLocationMessage: "الموقع مطلوب لتسجيل الحضور عبر QR. فعّل GPS.",
      worksiteTitle: "الموقع مطلوب",      
      worksiteMessage:
        "أدخل معرف الموقع لتفعيل تسجيل الحضور بالموقع. سيتم استخدام الطريقة اليدوية.",
      qrTitle: "مطلوب كود QR",
      qrMessage: "من فضلك أدخل كود الـ QR قبل المتابعة.",
      shiftTitle: "بيانات ناقصة",
      shiftMessage: "من فضلك أدخل الوردية قبل المتابعة.",
      checkInTitle: "تم تسجيل الحضور",
      checkInMessage: "تم تسجيل الحضور بنجاح",
      checkOutTitle: "تم تسجيل الانصراف",
      checkOutMessage: "تم تسجيل الانصراف بنجاح",
      failedTitle: "عملية غير مكتملة",
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

function normalizeCoordinate(value: number) {
  return Number(value.toFixed(6));
}

async function readGeolocation() {
  if (!navigator.geolocation) {
    return null;
  }
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function formatApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      if (typeof obj.detail === "string") {
        return obj.detail;
      }

      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            const parts = value.map((v) => String(v));
            return `${key}: ${parts.join(", ")}`;
          }
          return `${key}: ${String(value)}`;
        })
        .join(" | ");
    }

    const status = error.response?.status;
    return status ? `HTTP ${status}` : error.message;
  }

  return String(error);
}

export function SelfAttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const todayValue = useMemo(() => getTodayValue(), []);
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const [worksiteId, setWorksiteId] = useState<number | undefined>(undefined);
  const [method, setMethod] = useState<AttendanceActionPayload["method"]>("gps");
  const [qrToken, setQrToken] = useState("");
  const [qrTokenTouched, setQrTokenTouched] = useState(false);  
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

  const meQuery = useMe();
  const myAttendanceQuery = useMyAttendanceQuery({
    dateFrom: todayValue,
    dateTo: todayValue,
  });
  const companyQrQuery = useAttendanceCompanyQrQuery();
  const qrImage = useMemo(() => {
    const token = companyQrQuery.data?.token;
    if (!token) {
      return null;
    }
    const encoded = encodeURIComponent(token);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
  }, [companyQrQuery.data?.token]);

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

  const companyQrToken = companyQrQuery.data?.token ?? "";
  const effectiveQrToken = qrTokenTouched ? qrToken : companyQrToken;

  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();

  const todayRecord = useMemo<AttendanceRecord | undefined>(() => {
    return myAttendanceQuery.data?.find((record) => record.date === todayValue);
  }, [myAttendanceQuery.data, todayValue]);

  const statusKey = todayRecord
    ? todayRecord.check_out_time
      ? "completed"
      : todayRecord.status || "checked-in"
    : "no-record";

  const hasOpenCheckIn = Boolean(
    todayRecord?.check_in_time && !todayRecord?.check_out_time
  );

  const resolvedEmployeeId =
    employeeId ?? meQuery.data?.employee?.id ?? todayRecord?.employee?.id;
  const isSelfCheckIn =
    Boolean(meQuery.data?.employee?.id) &&
    resolvedEmployeeId === meQuery.data?.employee?.id;

  async function handleAction(action: "check-in" | "check-out") {
    if (!resolvedEmployeeId) {
      notifications.show({
        title: content.notifications.missingEmployeeTitle,
        message: content.notifications.missingEmployeeMessage,
        color: "red",
      });
      return;
    }

    let resolvedMethod: AttendanceActionPayload["method"] = method;
    let locationValue: { lat: number; lng: number } | null = null;

    if (!isSelfCheckIn) {
      notifications.show({
        title: content.notifications.methodWarningTitle,
        message: content.notifications.methodWarningMessage,
        color: "yellow",
      });
      resolvedMethod = "manual";
    } else if (method === "gps") {
      locationValue = await readGeolocation();

      if (!locationValue) {
        notifications.show({
          title: content.notifications.locationTitle,
          message: content.notifications.locationMessage,
          color: "yellow",
        });
        resolvedMethod = "manual";
      } else if (!worksiteId) {
        notifications.show({
          title: content.notifications.worksiteTitle,
          message: content.notifications.worksiteMessage,
          color: "yellow",
        });
        resolvedMethod = "manual";
      }
    } else if (method === "qr") {
      locationValue = await readGeolocation();
      if (!locationValue) {
        notifications.show({
          title: content.notifications.qrLocationTitle,
          message: content.notifications.qrLocationMessage,
          color: "red",
        });
        return;
      }
    }

    if (resolvedMethod === "qr" && !effectiveQrToken.trim()) {      
      notifications.show({
        title: content.notifications.qrTitle,
        message: content.notifications.qrMessage,
        color: "red",
      });
      return;
    }

    if (resolvedMethod !== "qr" && !shiftId) {
      notifications.show({
        title: content.notifications.shiftTitle,
        message: content.notifications.shiftMessage,
        color: "red",
      });
      return;
    }
    const payload: AttendanceActionPayload = {
      employee_id: resolvedEmployeeId,
      shift_id: resolvedMethod === "qr" ? undefined : shiftId,
      method: resolvedMethod,
    };

    if (resolvedMethod === "gps") {
      payload.worksite_id = worksiteId;
      payload.lat = locationValue
        ? normalizeCoordinate(locationValue.lat)
        : undefined;
      payload.lng = locationValue
        ? normalizeCoordinate(locationValue.lng)
        : undefined;
    }

    if (resolvedMethod === "qr") {
      payload.qr_token = effectiveQrToken.trim();      
      payload.lat = locationValue
        ? normalizeCoordinate(locationValue.lat)
        : undefined;
      payload.lng = locationValue
        ? normalizeCoordinate(locationValue.lng)
        : undefined;
    }

    try {
      if (action === "check-in") {
        await checkInMutation.mutateAsync(payload);
        notifications.show({
          title: content.notifications.checkInTitle,
          message: content.notifications.checkInMessage,
        });
      } else {
        await checkOutMutation.mutateAsync(payload);
        notifications.show({
          title: content.notifications.checkOutTitle,
          message: content.notifications.checkOutMessage,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (error) {
      notifications.show({
        title: content.notifications.failedTitle,
        message: formatApiError(error),
        color: "red",
      });
    }
  }

  const navLinks = useMemo(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      {
        path: "/users",
        label: content.nav.users,
        icon: "👥",
        permissions: ["users.view"],
      },
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
                  value: getTimeLabel(
                    todayRecord?.check_in_time ?? null,
                    isArabic ? "ar" : "en"
                  ),
                },
                {
                  label: content.rows.checkOut,
                  value: getTimeLabel(
                    todayRecord?.check_out_time ?? null,
                    isArabic ? "ar" : "en"
                  ),
                },
                {
                  label: content.rows.lateMinutes,
                  value: todayRecord?.late_minutes ?? "-",
                },
                {
                  label: content.rows.earlyLeaveMinutes,
                  value: todayRecord?.early_leave_minutes ?? "-",
                },
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
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.detailsTitle}</h2>
                  <p>{content.detailsSubtitle}</p>
                </div>
                <span
                  className="attendance-status-pill"
                  data-status={statusKey}
                >
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
                  <strong>
                    {getTimeLabel(
                      todayRecord?.check_in_time ?? null,
                      isArabic ? "ar" : "en"
                    )}
                  </strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.checkOut}</span>
                  <strong>
                    {getTimeLabel(
                      todayRecord?.check_out_time ?? null,
                      isArabic ? "ar" : "en"
                    )}
                  </strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.lateMinutes}</span>
                  <strong>{todayRecord?.late_minutes ?? "-"}</strong>
                </div>
                <div className="attendance-detail-row">
                  <span>{content.rows.earlyLeaveMinutes}</span>
                  <strong>{todayRecord?.early_leave_minutes ?? "-"}</strong>
                </div>
              </div>
            </div>

            <div className="panel attendance-qr-panel">
              <div className="panel__header">
                <div>
                  <h2>{content.qrTitle}</h2>
                  <p>{content.qrSubtitle}</p>
                </div>
                <span className="pill">{content.todayLabel}</span>
              </div>
              {companyQrQuery.isLoading ? (
                <div className="attendance-qr-state">
                  {isArabic ? "جارٍ تحميل رمز QR..." : "Loading QR code..."}
                </div>
              ) : companyQrQuery.data ? (
                <div className="attendance-qr-card">
                  <div className="attendance-qr-image">
                    {qrImage ? (
                      <img src={qrImage} alt="Company QR" />
                    ) : (
                      <span>{content.qrUnavailable}</span>
                    )}
                  </div>
                  <div className="attendance-qr-details">
                    <label className="attendance-field">
                      <span>{content.fields.qrToken}</span>
                      <input type="text" value={companyQrQuery.data.token} readOnly />
                    </label>
                    <div className="attendance-qr-meta">
                      <span>
                        {content.qrValidFrom}:{" "}
                        {new Date(companyQrQuery.data.valid_from).toLocaleString(
                          isArabic ? "ar" : "en"
                        )}
                      </span>
                      <span>
                        {content.qrValidUntil}:{" "}
                        {new Date(companyQrQuery.data.valid_until).toLocaleString(
                          isArabic ? "ar" : "en"
                        )}
                      </span>
                      <span>
                        {content.qrWorksite}: {companyQrQuery.data.worksite_id}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="attendance-qr-state">{content.qrUnavailable}</div>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.actionTitle}</h2>
                  <p>{content.actionSubtitle}</p>                  
                </div>
                <span className="pill">{content.todayLabel}</span>
              </div>
              <div className="attendance-form">
                <div className="attendance-fields">
                  <label className="attendance-field">
                    <span>{content.fields.employeeId}</span>
                    <input
                      type="number"
                      min={1}
                      placeholder={
                        isArabic ? "مثال: 12" : "Example: 12"
                      }
                      value={resolvedEmployeeId ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setEmployeeId(value ? Number(value) : undefined);
                      }}
                    />
                  </label>
                  <label className="attendance-field">
                    <span>{content.fields.method}</span>
                    <select
                      value={method}
                      onChange={(event) =>
                        setMethod(
                          (event.currentTarget.value as AttendanceActionPayload["method"]) ??
                            "gps"
                        )
                      }
                    >
                      {content.methodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {method !== "qr" && (
                    <label className="attendance-field">
                      <span>{content.fields.shiftId}</span>
                      <input
                        type="number"
                        min={1}
                        placeholder={content.fields.shiftPlaceholder}
                        value={shiftId ?? ""}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setShiftId(value ? Number(value) : undefined);
                        }}
                      />
                    </label>
                  )}
                  {method === "gps" && (
                    <label className="attendance-field">
                      <span>{content.fields.worksiteId}</span>
                      <input
                        type="number"
                        min={1}
                        placeholder={content.fields.worksitePlaceholder}
                        value={worksiteId ?? ""}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setWorksiteId(value ? Number(value) : undefined);
                        }}
                      />
                    </label>
                  )}                  
                </div>
                {method === "qr" && (
                  <label className="attendance-field">
                    <span>{content.fields.qrToken}</span>
                    <input
                      type="text"
                      placeholder={content.fields.qrPlaceholder}
                      value={effectiveQrToken}
                      onChange={(event) => {
                        setQrTokenTouched(true);
                        setQrToken(event.currentTarget.value);
                      }}
                    />
                  </label>
                )}                
                <div className="attendance-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleAction("check-in")}
                    disabled={Boolean(todayRecord?.check_in_time)}
                  >
                    {checkInMutation.isPending
                      ? content.notifications.checkInTitle
                      : content.actions.checkIn}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleAction("check-out")}
                    disabled={!hasOpenCheckIn}
                  >
                    {checkOutMutation.isPending
                      ? content.notifications.checkOutTitle
                      : content.actions.checkOut}
                  </button>
                </div>
                <span className="attendance-note">
                  {isArabic
                    ? "يتم تحديث الحالة تلقائيًا بعد تسجيل الحركة."
                    : "Status updates automatically after each action."}
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}