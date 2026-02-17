import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { buildHrSidebarLinks } from "../../shared/navigation/hrSidebarLinks";
import { useAnalyticsKpis } from "../../shared/analytics/insights.ts";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { formatNumber } from "../../shared/analytics/format.ts";
import { useAttendanceRecordsQuery, type AttendanceRecord } from "../../shared/hr/hooks";
import {
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./HRDashboardPage.css";
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
  rangeLabel: string;
  welcome: string;
  footer: string;
  userFallback: string;
  loadingLabel: string;
  searchResultsTitle: string;
  searchResultsSubtitle: string;
  searchEmptyTitle: string;
  searchEmptySubtitle: string;
  page: {
    title: string;
    subtitle: string;
    rangeTitle: string;
    rangeSubtitle: string;
    rangeHint: string;
    rangeOptions: {
      seven: string;
      thirty: string;
      ninety: string;
      custom: string;
    };
    stats: {
      absenceAvg: string;
      latenessAvg: string;
      overtimeTotal: string;
    };
    units: {
      days: string;
      minutes: string;
    };
    charts: {
      absenceTrend: string;
      latenessTrend: string;
      breakdownTitle: string;
      breakdownDepartment: string;
      breakdownAbsences: string;
      breakdownEmpty: string;
    };    
    attendanceLog: {
      title: string;
      subtitle: string;
      fromLabel: string;
      toLabel: string;
      employee: string;
      date: string;
      status: string;
      department: string;
      lateMinutes: string;
      empty: string;
    };
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
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    rangeLabel: "Last 30 days",
    welcome: "Welcome back",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    loadingLabel: "Loading...",
    searchResultsTitle: "Search results",
    searchResultsSubtitle: "Live data matched in your dashboard",
    searchEmptyTitle: "No results found",
    searchEmptySubtitle: "Try another keyword or check spelling.",
    page: {
      title: "HR Dashboard",
      subtitle: "Track absence, lateness, and overtime trends.",
      rangeTitle: "Timeline",
      rangeSubtitle: "Choose the reporting range for insights.",
      rangeHint: "Select start and end dates to show results.",
      rangeOptions: {
        seven: "7 days",
        thirty: "30 days",
        ninety: "90 days",
        custom: "Custom",
      },
      stats: {
        absenceAvg: "Average absence",
        latenessAvg: "Average lateness",
        overtimeTotal: "Overtime hours",
      },
      units: {
        days: "days",
        minutes: "min",
      },
      charts: {
        absenceTrend: "Absence trend",
        latenessTrend: "Lateness trend",
        breakdownTitle: "Top absence departments",
        breakdownDepartment: "Department",
        breakdownAbsences: "Absences",
        breakdownEmpty: "No absence data yet.",        
      },      
      attendanceLog: {
        title: "Attendance log",
        subtitle: "Filter attendance records by date.",
        fromLabel: "From",
        toLabel: "To",
        employee: "Employee",
        date: "Date",
        status: "Status",
        department: "Department",
        lateMinutes: "Late minutes",
        empty: "No attendance records found for this range.",
      },
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
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    rangeLabel: "آخر ٣٠ يوم",
    welcome: "أهلًا بعودتك",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    loadingLabel: "جاري التحميل...",
    searchResultsTitle: "نتائج البحث",
    searchResultsSubtitle: "بيانات مباشرة مطابقة لكلماتك",
    searchEmptyTitle: "لا توجد نتائج",
    searchEmptySubtitle: "جرّب كلمة مختلفة أو تحقق من الإملاء.",
    page: {
      title: "لوحة الموارد البشرية",
      subtitle: "متابعة الغياب والتأخير والساعات الإضافية.",
      rangeTitle: "النطاق الزمني",
      rangeSubtitle: "حدد الفترة المطلوبة لتحليل المؤشرات.",
      rangeHint: "اختر تاريخ البداية والنهاية لعرض البيانات.",
      rangeOptions: {
        seven: "٧ أيام",
        thirty: "٣٠ يوم",
        ninety: "٩٠ يوم",
        custom: "مخصص",
      },
      stats: {
        absenceAvg: "متوسط الغياب",
        latenessAvg: "متوسط التأخير",
        overtimeTotal: "ساعات إضافية",
      },
      units: {
        days: "يوم",
        minutes: "دقيقة",
      },
      charts: {
        absenceTrend: "اتجاه الغياب",
        latenessTrend: "اتجاه التأخير",
        breakdownTitle: "أكثر الأقسام غيابًا",
        breakdownDepartment: "القسم",
        breakdownAbsences: "عدد الغياب",
        breakdownEmpty: "لسه مفيش داتا للغياب.",        
      },      
      attendanceLog: {
        title: "سجل الحضور",
        subtitle: "فلتر بيانات الحضور حسب التاريخ.",
        fromLabel: "من",
        toLabel: "إلى",
        employee: "الموظف",
        date: "التاريخ",
        status: "الحالة",
        department: "القسم",
        lateMinutes: "دقائق التأخير",
        empty: "لا توجد سجلات حضور في هذا النطاق.",
      },
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

const kpiKeys = ["overtime_hours_daily"];

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getRangeDays(start?: string, end?: string) {
  if (!start || !end) return null;
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1, 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

type AttendanceTrendPoint = {
  label: string;
  absenceAvg: number;
  latenessAvg: number;
};

function buildAttendanceTrend(
  records: AttendanceRecord[],
  start?: string,
  end?: string
): AttendanceTrendPoint[] {
  const rangeDays = getRangeDays(start, end);
  if (!rangeDays || !start || !end) {
    return [];
  }
  const bucketSize = rangeDays <= 7 ? 1 : rangeDays <= 31 ? 7 : 30;
  const bucketCount = Math.ceil(rangeDays / bucketSize);
  const startDate = toDate(start);

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = addDays(startDate, index * bucketSize);
    const bucketEnd = addDays(bucketStart, bucketSize - 1);
    return {
      start: bucketStart,
      end: bucketEnd,
      employees: new Map<number, { presentDays: number; lateMinutes: number }>(),
    };
  });

  records.forEach((record) => {
    const recordDate = toDate(record.date);
    const diffMs = recordDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays >= rangeDays) {
      return;
    }
    const bucketIndex = Math.min(Math.floor(diffDays / bucketSize), buckets.length - 1);
    const bucket = buckets[bucketIndex];
    const entry = bucket.employees.get(record.employee.id) ?? {
      presentDays: 0,
      lateMinutes: 0,
    };
    if (record.status !== "absent") {
      entry.presentDays += 1;
    }
    entry.lateMinutes += record.late_minutes ?? 0;
    bucket.employees.set(record.employee.id, entry);
  });

  return buckets.map((bucket) => {
    const bucketDays =
      Math.floor((bucket.end.getTime() - bucket.start.getTime()) / (1000 * 60 * 60 * 24)) +
      1;
    let totalAbsent = 0;
    let totalLateMinutes = 0;
    bucket.employees.forEach((entry) => {
      totalAbsent += Math.max(bucketDays - entry.presentDays, 0);
      totalLateMinutes += entry.lateMinutes;
    });
    const employeeCount = bucket.employees.size || 1;
    return {
      label: toIsoDate(bucket.start),
      absenceAvg: totalAbsent / employeeCount,
      latenessAvg: totalLateMinutes / employeeCount,
    };
  });
}

export function HRDashboardPage() {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);
  const primaryRole = useMemo(() => resolvePrimaryRole(data), [data]);
  const hrSidebarLinks = useMemo(
    () => buildHrSidebarLinks(content.nav, isArabic),
    [content.nav, isArabic]
  );
  const companyName =
    data?.company.name || content.userFallback;

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

  const selection = useMemo(
    () => buildRangeSelection(range, customStart, customEnd),
    [range, customStart, customEnd]
  );

  const kpisQuery = useAnalyticsKpis(kpiKeys, selection.start, selection.end);  

  const fmtNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return formatNumber(String(value));
  };

  const fmtDays = useCallback((value: number | null) => {    
    if (value === null || Number.isNaN(value)) {
      return "-";
    }
    return `${formatNumber(value.toFixed(1))} ${content.page.units.days}`;
  }, [content.page.units.days]);

  const fmtMinutes = useCallback((value: number | null) => {    
    if (value === null || Number.isNaN(value)) {
      return "-";
    }
    return `${formatNumber(Math.round(value).toString())} ${content.page.units.minutes}`;
  }, [content.page.units.minutes]);

  const ltrRangeLabel = useMemo(() => {
    if (!selection.start || !selection.end) {
      return null;
    }
    // Render dates in LTR so Arabic (RTL) UI doesn't visually flip numeric ranges.
    return `${selection.start} → ${selection.end}`;
  }, [selection.end, selection.start]);

  const statusLabels = useMemo(
    () => ({
      present: isArabic ? "حاضر" : "Present",
      late: isArabic ? "متأخر" : "Late",
      absent: isArabic ? "غائب" : "Absent",
      early_leave: isArabic ? "انصراف مبكر" : "Early leave",
      incomplete: isArabic ? "غير مكتمل" : "Incomplete",
    }),
    [isArabic]
  );

  const overtimeTotal = useMemo(() => {
    const overtimeSeries = kpisQuery.data?.find((series) => series.key === "overtime_hours_daily");
    if (!overtimeSeries) {
      return null;
    }
    const total = overtimeSeries.points.reduce((sum, point) => sum + Number(point.value ?? 0), 0);
    return formatNumber(String(total));
  }, [kpisQuery.data]);

  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: selection.start,
      dateTo: selection.end,
    },
    Boolean(selection.start && selection.end)
  );

  const attendanceRecords = useMemo(() => {
    if (!Array.isArray(attendanceQuery.data)) {
      return [] as AttendanceRecord[];
    }
    return attendanceQuery.data.filter(
      (record): record is AttendanceRecord =>
        Boolean(record?.employee && typeof record.employee.id === "number")
    );
  }, [attendanceQuery.data]);

  const attendanceSummary = useMemo(() => {
    const rangeDays = getRangeDays(selection.start, selection.end);
    if (!rangeDays) {      
      return null;
    }
    const employees = new Map<number, { presentDays: number; lateMinutes: number }>();
    attendanceRecords.forEach((record) => {      
      const entry = employees.get(record.employee.id) ?? { presentDays: 0, lateMinutes: 0 };
      if (record.status !== "absent") {
        entry.presentDays += 1;
      }
      entry.lateMinutes += record.late_minutes ?? 0;
      employees.set(record.employee.id, entry);
    });
    if (employees.size === 0) {
      return null;
    }
    let totalAbsentDays = 0;
    let totalLateMinutes = 0;
    employees.forEach((entry) => {
      totalAbsentDays += Math.max(rangeDays - entry.presentDays, 0);
      totalLateMinutes += entry.lateMinutes;
    });
    return {
      absenceAvg: totalAbsentDays / employees.size,
      latenessAvg: totalLateMinutes / employees.size,
    };
  }, [attendanceRecords, selection.end, selection.start]);

  const attendanceTrend = useMemo(() => {
    return buildAttendanceTrend(attendanceRecords, selection.start, selection.end);
  }, [attendanceRecords, selection.end, selection.start]);

  const absenceByDepartment = useMemo(() => {
    const departmentFallback = isArabic ? "بدون قسم" : "Unassigned";
    const counts = new Map<string, number>();
    attendanceRecords.forEach((record) => {      
      if (record.status !== "absent") {
        return;
      }
      const departmentName = record.employee.department?.name ?? departmentFallback;
      counts.set(departmentName, (counts.get(departmentName) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([department, absences]) => ({ department, absences }))
      .sort((a, b) => b.absences - a.absences)
      .slice(0, 5);
  }, [attendanceRecords, isArabic]);

  const attendanceLogRows = useMemo(() => {
    return [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  const showCustomHint = range === "custom" && (!selection.start || !selection.end);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case "7d":
        return content.page.rangeOptions.seven;
      case "30d":
        return content.page.rangeOptions.thirty;
      case "90d":
        return content.page.rangeOptions.ninety;
      case "custom":
        return content.page.rangeOptions.custom;
      default:
        return content.page.rangeOptions.thirty;
    }
  }, [content.page.rangeOptions, range]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return [];
    }
    const results: Array<{ label: string; description: string }> = [];

    results.push(
      {
        label: content.page.stats.absenceAvg,
        description: fmtDays(attendanceSummary?.absenceAvg ?? null),        
      },
      {
        label: content.page.stats.latenessAvg,
        description: fmtMinutes(attendanceSummary?.latenessAvg ?? null),        
      },
      {
        label: content.page.stats.overtimeTotal,
        description: overtimeTotal ?? "-",
      }
    );


    absenceByDepartment.forEach((item) => {      
      results.push({
        label: item.department,        
        description: fmtNumber(item.absences ?? null),        
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    absenceByDepartment,    
    attendanceSummary,
    content.page.stats,
    overtimeTotal,
    searchTerm,
    fmtDays,
    fmtMinutes,
  ]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
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
    if (primaryRole === "hr") {
      return hrSidebarLinks;
    }

    return navLinks.filter((link) => {      
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [hrSidebarLinks, navLinks, primaryRole, userPermissions]);

  return (
    <div
      className="dashboard-page"
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
            <p>{content.welcome}</p>
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
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.page.title}</h1>
              <p>{content.page.subtitle}</p>
              <div className="hero-tags">
                <span className="pill">{rangeLabel}</span>
                <span className="pill pill--accent">
                  {ltrRangeLabel ? (
                    <span dir="ltr" style={{ unicodeBidi: "plaintext" }}>{ltrRangeLabel}</span>
                  ) : (
                    content.rangeLabel
                  )}
                </span>
              </div>
            </div>
            {(attendanceQuery.isError || kpisQuery.isError) && (
              <p className="helper-text" role="alert">
                {isArabic
                  ? "تعذر تحميل بعض بيانات التحليلات حاليًا."
                  : "Some analytics data is unavailable right now."}
              </p>
            )}
            <div className="hero-panel__stats">              
              {/*
                Stats are driven by attendance records (absence/lateness)
                and KPI data (overtime).
              */}
              {[
                {
                  label: content.page.stats.absenceAvg,
                  value: fmtDays(attendanceSummary?.absenceAvg ?? null),
                },
                {
                  label: content.page.stats.latenessAvg,
                  value: fmtMinutes(attendanceSummary?.latenessAvg ?? null),
                },
                {
                  label: content.page.stats.overtimeTotal,
                  value: overtimeTotal ?? "-",
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{rangeLabel}</span>
                  </div>
                  <strong>
                    {attendanceQuery.isLoading || kpisQuery.isLoading
                      ? content.loadingLabel
                      : stat.value}
                  </strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.page.rangeTitle}</h2>
                <p>{content.page.rangeSubtitle}</p>
              </div>
              <span className="pill pill--accent">{rangeLabel}</span>
            </div>
            <div className="panel-actions">
              {[
                { value: "7d" as RangeOption, label: content.page.rangeOptions.seven },
                { value: "30d" as RangeOption, label: content.page.rangeOptions.thirty },
                { value: "90d" as RangeOption, label: content.page.rangeOptions.ninety },
                { value: "custom" as RangeOption, label: content.page.rangeOptions.custom },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`action-button${
                    range === option.value ? "" : " action-button--ghost"
                  }`}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="filters-grid">
                <label className="field">
                  <span>{isArabic ? "من" : "From"}</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{isArabic ? "إلى" : "To"}</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </label>
              </div>
            )}
            {showCustomHint && <p className="helper-text">{content.page.rangeHint}</p>}
          </section>

          {searchTerm.trim().length > 0 && (
            <section className="search-results" aria-live="polite">
              <div className="search-results__header">
                <div>
                  <h2>{content.searchResultsTitle}</h2>
                  <p>{content.searchResultsSubtitle}</p>
                </div>
                <span className="pill pill--accent">{searchResults.length}</span>
              </div>
              {searchResults.length ? (
                <ul className="search-results__list">
                  {searchResults.map((result, index) => (
                    <li key={`${result.label}-${index}`}>
                      <strong>{result.label}</strong>
                      <span>{result.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-results__empty">
                  <strong>{content.searchEmptyTitle}</strong>
                  <span>{content.searchEmptySubtitle}</span>
                </div>
              )}
            </section>
          )}

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.page.attendanceLog.title}</h2>
                <p>{content.page.attendanceLog.subtitle}</p>
              </div>
              <span className="pill">{rangeLabel}</span>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.page.attendanceLog.fromLabel}</span>
                <input
                  type="date"
                  value={selection.start ?? ""}
                  onChange={(event) => {
                    setRange("custom");
                    setCustomStart(event.target.value);
                  }}
                />
              </label>
              <label className="field">
                <span>{content.page.attendanceLog.toLabel}</span>
                <input
                  type="date"
                  value={selection.end ?? ""}
                  onChange={(event) => {
                    setRange("custom");
                    setCustomEnd(event.target.value);
                  }}
                />
              </label>
            </div>
            {attendanceQuery.isLoading ? (
              <span className="helper-text">{content.loadingLabel}</span>
            ) : attendanceLogRows.length ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.page.attendanceLog.employee}</th>
                      <th>{content.page.attendanceLog.department}</th>
                      <th>{content.page.attendanceLog.date}</th>
                      <th>{content.page.attendanceLog.status}</th>
                      <th>{content.page.attendanceLog.lateMinutes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogRows.map((record) => (
                      <tr key={record.id}>
                        <td>{record.employee.full_name}</td>
                        <td>{record.employee.department?.name ?? "-"}</td>
                        <td>{record.date}</td>
                        <td>{statusLabels[record.status] ?? record.status}</td>
                        <td>{fmtNumber(record.late_minutes ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <span className="helper-text">{content.page.attendanceLog.empty}</span>
            )}
          </section>

          <section className="grid-panels">
            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.absenceTrend}</h2>
                  <p>{isArabic ? "الاتجاه حسب المدة" : "Range-based trend"}</p>
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {attendanceQuery.isLoading ? (
                <span className="helper-text">{content.loadingLabel}</span>
              ) : attendanceTrend.length ? (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={attendanceTrend}>
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => fmtDays(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="absenceAvg"
                        name={isArabic ? "متوسط الغياب" : "Avg absence"}
                        stroke="#845ef7"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>                
              ) : (
                <span className="helper-text">{content.searchEmptyTitle}</span>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.latenessTrend}</h2>
                  <p>{isArabic ? "الاتجاه حسب المدة" : "Range-based trend"}</p>                  
                </div>
                <span className="pill">{rangeLabel}</span>
              </div>
              {attendanceQuery.isLoading ? (                
                <span className="helper-text">{content.loadingLabel}</span>
              ) : attendanceTrend.length ? (                
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <LineChart data={attendanceTrend}>                      
                      <XAxis dataKey="label" />                      
                      <YAxis />
                      <Tooltip formatter={(value: number) => fmtMinutes(value)} />                        
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="latenessAvg"                        
                        name={isArabic ? "متوسط التأخير" : "Avg lateness"}                        
                        stroke="#fab005"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <span className="helper-text">{content.searchEmptyTitle}</span>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.page.charts.breakdownTitle}</h2>
                  <p>{isArabic ? "أعلى الأقسام غيابًا" : "Highest absences"}</p>                  
                </div>
              </div>
              {attendanceQuery.isLoading ? (                
                <span className="helper-text">{content.loadingLabel}</span>
              ) : absenceByDepartment.length ? (                
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{content.page.charts.breakdownDepartment}</th>                        
                        <th>{content.page.charts.breakdownAbsences}</th>                        
                      </tr>
                    </thead>
                    <tbody>
                      {absenceByDepartment.map((item) => (                        
                        <tr key={item.department}>
                          <td>{item.department}</td>
                          <td>{fmtNumber(item.absences ?? null)}</td>                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <span className="helper-text">{content.page.charts.breakdownEmpty}</span>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}