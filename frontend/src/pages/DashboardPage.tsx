import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clearTokens } from "../shared/auth/tokens";
import { useLocation, useNavigate } from "react-router-dom";
import { useMe } from "../shared/auth/useMe.ts";
import { hasPermission } from "../shared/auth/useCan";
import { useAlerts } from "../shared/analytics/hooks";
import { useAnalyticsKpis } from "../shared/analytics/insights.ts";
import { useCashForecast } from "../shared/analytics/forecast";
import { useAccountMappings, useGeneralLedger, useProfitLoss } from "../shared/accounting/hooks";
import { useAttendanceRecordsQuery } from "../shared/hr/hooks";
import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { formatCurrency, formatNumber, formatPercent } from "../shared/analytics/format.ts";
import "./DashboardPage.css";

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
  backupNowLabel: string;
  restoreBackupLabel: string;
  rangeLabel: string;
  dateFromLabel: string;
  dateToLabel: string;  
  stats: {
    revenue: string;
    expenses: string;
    netProfit: string;
  };
  activityTitle: string;
  activitySubtitle: string;
  insightsTitle: string;
  insightsSubtitle: string;
  forecastTitle: string;
  forecastSubtitle: string;
  commandCenterTitle: string;
  commandCenterSubtitle: string;
  financeMixTitle: string;
  financeMixSubtitle: string;
  hrHealthTitle: string;
  hrHealthSubtitle: string;
  signalsTitle: string;
  signalsSubtitle: string;
  runwayLabel: string;
  inflowLabel: string;
  outflowLabel: string;
  netExpectedLabel: string;
  overtimeLabel: string;
  absenceLabel: string;
  latenessLabel: string;
  openAlertsLabel: string;
  severityHigh: string;
  severityMedium: string;
  severityLow: string;
  noDataLabel: string;
  generatedLabel: string;
  forecastLabels: {
    invoicesDue: string;
    expectedCollected: string;
    payroll: string;
    recurring: string;
    topCustomer: string;
    topCategory: string;
  };
  footer: string;
  userFallback: string;
  searchResultsTitle: string;
  searchResultsSubtitle: string;
  searchEmptyTitle: string;
  searchEmptySubtitle: string;
  loadingLabel: string;
  nav: {
    dashboard: string;
    adminPanel: string;
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
    catalog: string;
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
    backupNowLabel: "Download backup",
    restoreBackupLabel: "Restore backup",
    rangeLabel: "Last 30 days",
    dateFromLabel: "From",
    dateToLabel: "To",    
    stats: {
      revenue: "Total revenue",
      expenses: "Total expenses",
      netProfit: "Estimated net profit",
    },
    activityTitle: "Smart Alerts",
    activitySubtitle: "Live KPI monitoring",
    insightsTitle: "Insight Pulse",
    insightsSubtitle: "Actual daily movement over the last week",
    forecastTitle: "Cashflow Snapshot",
    forecastSubtitle: "Forecasted inflows and outflows",
    commandCenterTitle: "Executive Command Center",
    commandCenterSubtitle: "Cross-functional KPIs generated from live finance, cash, HR, and risk engines",
    financeMixTitle: "Finance Mix",
    financeMixSubtitle: "Revenue vs expense vs net margin over the latest days",
    hrHealthTitle: "Workforce Health",
    hrHealthSubtitle: "Attendance quality and capacity pressure from HR signals",
    signalsTitle: "Risk Signals",
    signalsSubtitle: "Alert distribution by severity from the live alerts center",
    runwayLabel: "Cash runway",
    inflowLabel: "Inflow",
    outflowLabel: "Outflow",
    netExpectedLabel: "Net expected",
    overtimeLabel: "Overtime hours",
    absenceLabel: "Absence rate",
    latenessLabel: "Lateness rate",
    openAlertsLabel: "Open alerts",
    severityHigh: "High",
    severityMedium: "Medium",
    severityLow: "Low",
    noDataLabel: "No analytics data yet",
    generatedLabel: "Generated from system data",
    forecastLabels: {
      invoicesDue: "Invoices due",
      expectedCollected: "Expected collected",
      payroll: "Payroll",
      recurring: "Recurring expenses",
      topCustomer: "Top customer",
      topCategory: "Top category",
    },
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchResultsTitle: "Search results",
    searchResultsSubtitle: "Live data matched in your dashboard",
    searchEmptyTitle: "No results found",
    searchEmptySubtitle: "Try another keyword or check spelling.",
    loadingLabel: "Loading...",
    nav: {
      dashboard: "Dashboard",
      adminPanel: "Admin",
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
      catalog: "Products & Services",
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
    backupNowLabel: "تحميل نسخة احتياطية",
    restoreBackupLabel: "استرجاع نسخة احتياطية",
    rangeLabel: "آخر ٣٠ يوم",
    dateFromLabel: "من",
    dateToLabel: "إلى",    
    stats: {
      revenue: "إجمالي الإيرادات",
      expenses: "إجمالي المصروفات",
      netProfit: "صافي الربح التقديري",
    },
    activityTitle: "تنبيهات ذكية",
    activitySubtitle: "مراقبة فورية للمؤشرات",
    insightsTitle: "نبض الرؤية",
    insightsSubtitle: "الحركة الفعلية لآخر أسبوع",
    forecastTitle: "ملخص التدفق النقدي",
    forecastSubtitle: "توقعات الدخول والخروج",
    commandCenterTitle: "مركز القيادة التنفيذي",
    commandCenterSubtitle: "مؤشرات مشتركة من النظام، ومتوسط الغياب مأخوذ من لوحة الموارد البشرية.",
    financeMixTitle: "مزيج المالية",
    financeMixSubtitle: "الإيراد مقابل المصروف مقابل هامش الربح خلال آخر الأيام",
    hrHealthTitle: "صحة القوى العاملة",
    hrHealthSubtitle: "جودة الحضور وضغط الطاقة التشغيلية من إشارات الموارد البشرية",
    signalsTitle: "إشارات المخاطر",
    signalsSubtitle: "توزيع التنبيهات حسب الشدة من مركز التنبيهات المباشر",
    runwayLabel: "مدى السيولة",
    inflowLabel: "التدفقات الداخلة",
    outflowLabel: "التدفقات الخارجة",
    netExpectedLabel: "الصافي المتوقع",
    overtimeLabel: "ساعات إضافية",
    absenceLabel: "متوسط الغياب",
    latenessLabel: "معدل التأخير",
    openAlertsLabel: "تنبيهات مفتوحة",
    severityHigh: "عالي",
    severityMedium: "متوسط",
    severityLow: "منخفض",
    noDataLabel: "لا توجد بيانات تحليلية بعد",
    generatedLabel: "مُولّد من بيانات النظام",
    forecastLabels: {
      invoicesDue: "فواتير مستحقة",
      expectedCollected: "تحصيل متوقع",
      payroll: "الرواتب",
      recurring: "مصروفات متكررة",
      topCustomer: "أعلى عميل",
      topCategory: "أعلى تصنيف",
    },
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchResultsTitle: "نتائج البحث",
    searchResultsSubtitle: "بيانات مباشرة مطابقة لكلماتك",
    searchEmptyTitle: "لا توجد نتائج",
    searchEmptySubtitle: "جرّب كلمة مختلفة أو تحقق من الإملاء.",
    loadingLabel: "جاري التحميل...",
    nav: {
      dashboard: "لوحة التحكم",
      adminPanel: "الإدارة",
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
      catalog: "الخدمات والمنتجات",
      auditLogs: "سجل التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدم الإعداد",
    },
  },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
  const isSuperuser = Boolean(data?.user.is_superuser);
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
  const content = useMemo(() => contentMap[language], [language]);
  const userPermissions = data?.permissions ?? [];
  const companyName = data?.company?.name || content.userFallback;
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
  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);
  const [dateFrom, setDateFrom] = useState(defaultRange.start);
  const [dateTo, setDateTo] = useState(defaultRange.end);

  const rangeDays = useMemo(() => {
    const start = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T00:00:00`);
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isNaN(diff) ? 30 : Math.max(diff + 1, 1);
  }, [dateFrom, dateTo]);

  const selectedRangeLabel = useMemo(() => {
    return `${dateFrom} → ${dateTo}`;
  }, [dateFrom, dateTo]);

  const profitLossQuery = useProfitLoss(dateFrom, dateTo);
  const accountMappingsQuery = useAccountMappings();
  const cashAccountId = useMemo(() => {
    const cashMapping = (accountMappingsQuery.data ?? []).find((mapping) =>
      ["payment_cash", "cash", "cash_on_hand"].includes(mapping.key)
    );
    return cashMapping?.account ?? undefined;
  }, [accountMappingsQuery.data]);
  const cashLedgerQuery = useGeneralLedger(cashAccountId, dateFrom, dateTo);
  const cashBalance = useMemo(() => {
    const lines = cashLedgerQuery.data?.lines ?? [];
    return lines.length ? lines[lines.length - 1]?.running_balance ?? null : null;
  }, [cashLedgerQuery.data?.lines]);

  const kpisQuery = useAnalyticsKpis(
    ["revenue_daily", "expenses_daily"],
    dateFrom,
    dateTo    
  );
  const performanceKpisQuery = useAnalyticsKpis(
    [
      "revenue_daily",
      "expenses_daily",
      "cash_balance_daily",
      "cash_inflow_daily",
      "cash_outflow_daily",
      "absence_rate_daily",
      "lateness_rate_daily",
      "overtime_hours_daily",
    ],
    dateFrom,
    dateTo
  );
  const alertsQuery = useAlerts({ status: "open", range: `${rangeDays}d` });
  const forecastQuery = useCashForecast();
  const payrollOpenPeriodsTotalQuery = useQuery({
    queryKey: ["dashboard-open-payroll-total", dateFrom, dateTo],
    queryFn: async () => {
      const periodsResponse = await http.get<Array<{ id: number; status: string; start_date: string; end_date: string }>>(
        endpoints.hr.payrollPeriods
      );
      const openPeriods = (periodsResponse.data ?? []).filter(
        (period) => period.status === "draft" && period.start_date <= dateTo && period.end_date >= dateFrom
      );
      if (!openPeriods.length) {
        return 0;
      }
      const runs = await Promise.all(
        openPeriods.map(async (period) => {
          const response = await http.get<Array<{ net_total: string }>>(
            endpoints.hr.payrollPeriodRuns(period.id)
          );
          return response.data;
        })
      );

      return runs.flat().reduce((sum, run) => sum + Number(run.net_total ?? 0), 0);
    },
  });

  const barValues = useMemo(() => {
    if (!kpisQuery.data) {
      return [];
    }

    const pointsByDate = new Map<string, number>();
    kpisQuery.data.forEach((series) => {
      series.points.forEach((point) => {
        const value = point.value ? Number(point.value) : null;
        if (value === null) {
          return;
        }
        const current = pointsByDate.get(point.date) ?? 0;
        pointsByDate.set(point.date, current + value);
      });
    });

    const ordered = Array.from(pointsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);
    const max = Math.max(...ordered.map(([, value]) => value), 1);

    return ordered.map(([date, value]) => ({
      date,
      value,
      height: Math.round((value / max) * 100),
    }));
  }, [kpisQuery.data]);

  const forecastSnapshot = useMemo(() => {
    return (forecastQuery.data ?? []).find(
      (snapshot) => snapshot.horizon_days === 30
    );
  }, [forecastQuery.data]);

  const forecastCards = useMemo(() => {
    if (!forecastSnapshot) {
      return [];
    }

    const inflows = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const topCustomer = inflows.top_customers[0];
    const topCategory = outflows.top_categories[0];

    return [
      {
        label: content.forecastLabels.invoicesDue,
        value: formatCurrency(inflows.invoices_due),
      },
      {
        label: content.forecastLabels.expectedCollected,
        value: formatCurrency(inflows.expected_collected),
      },
      {
        label: `${content.forecastLabels.topCustomer} • ${topCustomer?.customer ?? "-"}`,
        value: formatCurrency(topCustomer?.amount ?? null),
      },
      {
        label: content.forecastLabels.payroll,
        value: formatCurrency(payrollOpenPeriodsTotalQuery.data?.toString() ?? null),        
      },
      {
        label: content.forecastLabels.recurring,
        value: formatCurrency(outflows.recurring_expenses),
      },
      {
        label: `${content.forecastLabels.topCategory} • ${topCategory?.category ?? "-"}`,
        value: formatCurrency(topCategory?.amount ?? null),
      },
    ];
  }, [content.forecastLabels, forecastSnapshot, payrollOpenPeriodsTotalQuery.data]);

  const forecastBars = useMemo(() => {
    if (!forecastSnapshot) {
      return [];
    }
    const inflows = forecastSnapshot.details.inflows_by_bucket;
    const outflows = forecastSnapshot.details.outflows_by_bucket;
    const values = [
      {
        label: content.inflowLabel,
        value: Number(inflows.expected_collected ?? 0),
        tone: "inflow" as const,
      },
      {
        label: content.outflowLabel,
        value: Number(outflows.recurring_expenses ?? 0),
        tone: "outflow" as const,
      },
      {
        label: content.netExpectedLabel,
        value: Number(forecastSnapshot.net_expected ?? 0),
        tone: "net" as const,
      },
      {
        label: content.forecastLabels.payroll,
        value: Number(payrollOpenPeriodsTotalQuery.data ?? 0),
        tone: "outflow" as const,
      },
    ];
    const max = Math.max(...values.map((item) => Math.abs(item.value)), 1);
    return values.map((item) => ({
      ...item,
      width: Math.max(12, Math.round((Math.abs(item.value) / max) * 100)),
    }));
  }, [
    content.forecastLabels.payroll,
    content.inflowLabel,
    content.netExpectedLabel,
    content.outflowLabel,
    forecastSnapshot,
    payrollOpenPeriodsTotalQuery.data,
  ]);

  const activityItems = useMemo(() => {
    return (alertsQuery.data ?? []).slice(0, 4);
  }, [alertsQuery.data]);

  const performanceSeries = useMemo(() => {
    const byKey = new Map<string, Array<{ date: string; value: number }>>();
    (performanceKpisQuery.data ?? []).forEach((series) => {
      const points = series.points
        .filter((point) => point.value !== null)
        .map((point) => ({
          date: point.date,
          value: Number(point.value),
        }))
        .filter((point) => !Number.isNaN(point.value))
        .sort((a, b) => a.date.localeCompare(b.date));
      byKey.set(series.key, points);
    });
    return byKey;
  }, [performanceKpisQuery.data]);

  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom,
      dateTo,
    },
    Boolean(dateFrom && dateTo)
  );

  const hrAbsenceAverage = useMemo(() => {
    if (!attendanceQuery.data || !dateFrom || !dateTo) {
      return null;
    }
    const startDate = new Date(`${dateFrom}T00:00:00`);
    const endDate = new Date(`${dateTo}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }
    const days = Math.max(
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      1
    );

    const employees = new Map<number, number>();
    attendanceQuery.data.forEach((record) => {
      const presentDays = employees.get(record.employee.id) ?? 0;
      if (record.status !== "absent") {
        employees.set(record.employee.id, presentDays + 1);
      } else {
        employees.set(record.employee.id, presentDays);
      }
    });

    if (employees.size === 0) {
      return null;
    }

    let totalAbsentDays = 0;
    employees.forEach((presentDays) => {
      totalAbsentDays += Math.max(days - presentDays, 0);
    });

    return totalAbsentDays / employees.size;
  }, [attendanceQuery.data, dateFrom, dateTo]);

  const financeMixRows = useMemo(() => {
    const revenue = performanceSeries.get("revenue_daily") ?? [];
    const expenses = performanceSeries.get("expenses_daily") ?? [];
    const expenseByDate = new Map(expenses.map((item) => [item.date, item.value]));

    return revenue.slice(-6).map((item) => {
      const expense = expenseByDate.get(item.date) ?? 0;
      const net = item.value - expense;
      const margin = item.value > 0 ? (net / item.value) * 100 : 0;
      return {
        date: item.date,
        revenue: item.value,
        expenses: expense,
        net,
        margin,
      };
    });
  }, [performanceSeries]);

  const totalRevenue = useMemo(() => Number(profitLossQuery.data?.income_total ?? 0), [profitLossQuery.data?.income_total]);
  const totalExpenses = useMemo(() => Number(profitLossQuery.data?.expense_total ?? 0), [profitLossQuery.data?.expense_total]);
  const totalNet = useMemo(() => Number(profitLossQuery.data?.net_profit ?? 0), [profitLossQuery.data?.net_profit]);

  const financeMixBars = useMemo(() => {
    const maxValue = Math.max(
      ...financeMixRows.flatMap((row) => [row.revenue, row.expenses]),
      1
    );
    return financeMixRows.map((row) => ({
      ...row,
      revenueHeight: Math.max(8, Math.round((row.revenue / maxValue) * 100)),
      expenseHeight: Math.max(8, Math.round((row.expenses / maxValue) * 100)),
    }));
  }, [financeMixRows]);

  const hrMetrics = useMemo(() => {
    const absenceSeries = performanceSeries.get("absence_rate_daily") ?? [];
    const latenessSeries = performanceSeries.get("lateness_rate_daily") ?? [];
    const overtimeSeries = performanceSeries.get("overtime_hours_daily") ?? [];

    const avg = (values: number[]) =>
      values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;

    const absenceAvg = avg(absenceSeries.map((item) => item.value));
    const latenessAvg = avg(latenessSeries.map((item) => item.value));
    const overtimeTotal = overtimeSeries.reduce((sum, item) => sum + item.value, 0);

    const availabilityScore = Math.max(
      0,
      Math.min(
        100,
        100 - (absenceAvg ?? 0) * 100 - (latenessAvg ?? 0) * 100 * 0.5
      )
    );

    return {
      absenceAvg,
      latenessAvg,
      overtimeTotal,
      availabilityScore,
    };
  }, [performanceSeries]);

  const gaugeStyle = useMemo(() => {
    const angle = Math.round((hrMetrics.availabilityScore / 100) * 180);
    return {
      background: `conic-gradient(from 270deg, var(--accent) 0deg, var(--secondary) ${angle}deg, rgba(127, 136, 170, 0.2) ${angle}deg 180deg)`,
    };
  }, [hrMetrics.availabilityScore]);

  const riskDistribution = useMemo(() => {
    const source = alertsQuery.data ?? [];
    const high = source.filter((item) => item.severity === "high").length;
    const medium = source.filter((item) => item.severity === "medium").length;
    const low = source.filter((item) => item.severity === "low").length;
    const total = high + medium + low;
    return [
      {
        label: content.severityHigh,
        value: high,
        ratio: total ? (high / total) * 100 : 0,
      },
      {
        label: content.severityMedium,
        value: medium,
        ratio: total ? (medium / total) * 100 : 0,
      },
      {
        label: content.severityLow,
        value: low,
        ratio: total ? (low / total) * 100 : 0,
      },
    ];
  }, [alertsQuery.data, content.severityHigh, content.severityLow, content.severityMedium]);

  const commandCards = useMemo(() => {
    const expectedInflows = Number(profitLossQuery.data?.income_total ?? 0);
    const expectedOutflows = Number(profitLossQuery.data?.expense_total ?? 0);
    const netExpected = Number(profitLossQuery.data?.net_profit ?? 0);
    const currentCash = Number(cashBalance ?? 0);
    const runwayMonths = netExpected !== 0
      ? currentCash / Math.abs(netExpected)
      : null;

    return [
      {
        label: content.inflowLabel,
        value: formatCurrency(expectedInflows.toString()),        
      },
      {
        label: content.outflowLabel,
        value: formatCurrency(expectedOutflows.toString()),        
      },
      {
        label: content.netExpectedLabel,
        value: formatCurrency(netExpected.toString()),        
      },
      {
        label: content.runwayLabel,
        value: runwayMonths === null ? "-" : `${formatNumber(runwayMonths.toString())} ${isArabic ? "شهر" : "months"}`,
      },
      {
        label: content.absenceLabel,
        value:
          hrAbsenceAverage === null
            ? "-"
            : `${formatNumber(hrAbsenceAverage.toFixed(1))} ${isArabic ? "يوم" : "days"}`,
      },
      {
        label: content.openAlertsLabel,
        value: formatNumber(String(alertsQuery.data?.length ?? 0)),
      },
    ];
  }, [
    alertsQuery.data?.length,
    content.absenceLabel,
    content.inflowLabel,
    content.netExpectedLabel,
    content.openAlertsLabel,
    content.outflowLabel,
    content.runwayLabel,
    cashBalance,
    hrAbsenceAverage,
    isArabic,
    profitLossQuery.data?.expense_total,
    profitLossQuery.data?.income_total,
    profitLossQuery.data?.net_profit,    
  ]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const results: Array<{ label: string; description: string }> = [];

    if (profitLossQuery.data || cashBalance !== null) {      
      results.push(
        {
          label: content.stats.revenue,
          description: formatCurrency(profitLossQuery.data?.income_total ?? null),          
        },
        {
          label: content.stats.expenses,
          description: formatCurrency(profitLossQuery.data?.expense_total ?? null),          
        },
        {
          label: content.stats.netProfit,
          description: formatCurrency(profitLossQuery.data?.net_profit ?? null),          
        },

      );
    }

    forecastCards.forEach((card) => {
      results.push({
        label: card.label,
        description: card.value,
      });
    });

    commandCards.forEach((card) => {
      results.push({
        label: card.label,
        description: card.value,
      });
    });

    activityItems.forEach((alert) => {
      results.push({
        label: alert.title,
        description: new Date(alert.event_date).toLocaleDateString(
          isArabic ? "ar" : "en"
        ),
      });
    });

    return results.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [
    activityItems,
    commandCards,
    content.stats,
    forecastCards,
    isArabic,
    searchTerm,
    cashBalance,
    profitLossQuery.data,
  ]);

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }


    type CompanyBackup = {
    id: number;
    created_at: string;
  };

  const backupsQuery = useQuery({
    queryKey: ["company-backups"],
    queryFn: async () => {
      const response = await http.get<CompanyBackup[]>(endpoints.backups.listCreate);
      return response.data;
    },
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async () => {
      const createResponse = await http.post<CompanyBackup>(endpoints.backups.listCreate, {});
      const backupId = createResponse.data.id;
      const downloadResponse = await http.get<Blob>(endpoints.backups.download(backupId), {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(downloadResponse.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `backup-${backupId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      await backupsQuery.refetch();
    },
    onError: () => {
      window.alert(isArabic ? "تعذر إنشاء النسخة الاحتياطية." : "Unable to create backup.");
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async () => {
      const latestBackup = backupsQuery.data?.[0];
      if (!latestBackup) {
        throw new Error("no-backups");
      }
      await http.post(endpoints.backups.restore(latestBackup.id), {});
      await backupsQuery.refetch();
    },
    onSuccess: () => {
      window.alert(
        isArabic
          ? "تم استرجاع آخر نسخة احتياطية بنجاح."
          : "Latest backup restored successfully."
      );
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "no-backups") {
        window.alert(isArabic ? "لا توجد نسخ احتياطية للاسترجاع." : "No backups available to restore.");
        return;
      }
      window.alert(isArabic ? "تعذر استرجاع النسخة الاحتياطية." : "Unable to restore backup.");
    },
  });

  function handleDownloadBackup() {
    if (downloadBackupMutation.isPending) {
      return;
    }
    void downloadBackupMutation.mutateAsync();
  }

  function handleRestoreBackup() {
    if (restoreBackupMutation.isPending) {
      return;
    }
    const confirmed = window.confirm(
      isArabic
        ? "سيتم استرجاع آخر نسخة احتياطية متاحة. هل تريد المتابعة؟"
        : "This will restore the latest available backup. Continue?"
    );
    if (!confirmed) {
      return;
    }
    void restoreBackupMutation.mutateAsync();
  }

  type NavLink = {
    path: string;
    label: string;
    icon: string;
    permissions?: string[];
    superuserOnly?: boolean;
    external?: boolean;
  };

  const navLinks = useMemo<NavLink[]>(
    () => [
      { path: "/dashboard", label: content.nav.dashboard, icon: "🏠" },
      {
        path: "/admin",
        label: content.nav.adminPanel,
        icon: "🛠️",
        superuserOnly: true,
      },      
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
        path: "/analytics/alerts",
        label: content.nav.alertsCenter,
        icon: "🚨",
        permissions: ["analytics.alerts.view", "analytics.alerts.manage"],
      },
      { path: "/analytics/cash-forecast", label: content.nav.cashForecast, icon: "💡" },
      { path: "/analytics/ceo", label: content.nav.ceoDashboard, icon: "📌" },
      { path: "/analytics/finance", label: content.nav.financeDashboard, icon: "💹" },
      { path: "/analytics/hr", label: content.nav.hrDashboard, icon: "🧑‍💻" },
      { path: "/catalog", label: content.nav.catalog, icon: "📦" },
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
      if (link.superuserOnly && !isSuperuser) {
        return false;
      }
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [isSuperuser, navLinks, userPermissions]);

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
            <span className="dashboard-brand__subtitle">
              {content.subtitle}
            </span>
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
            <p>{content.welcome}</p>
            <strong>{companyName}</strong>
            {isLoading && (
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
                  onClick={() => {
                    if (link.external) {
                      window.location.assign(link.path);
                      return;
                    }
                    navigate(link.path);
                  }}
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
            <button
              type="button"
              className="pill-button sidebar-action-button"
              onClick={handleDownloadBackup}
              disabled={downloadBackupMutation.isPending}
            >
              {content.backupNowLabel}
            </button>
            <button
              type="button"
              className="pill-button sidebar-action-button sidebar-action-button--secondary"
              onClick={handleRestoreBackup}
              disabled={restoreBackupMutation.isPending || backupsQuery.isLoading}
            >
              {content.restoreBackupLabel}
            </button>
            <button type="button" className="pill-button" onClick={handleLogout}>
              {content.logoutLabel}
            </button>            
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>
                {content.welcome}, {companyName}
              </h1>
              <p>{content.subtitle}</p>
              <div className="hero-tags">
                <span className="pill">{selectedRangeLabel}</span>
                <span className="pill pill--accent">
                  {forecastSnapshot?.as_of_date ?? dateTo}
                </span>
                <label className="date-filter-pill">
                  <span>{content.dateFromLabel}</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </label>
                <label className="date-filter-pill">
                  <span>{content.dateToLabel}</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.revenue,
                  value: formatCurrency(profitLossQuery.data?.income_total ?? null),
                  change: selectedRangeLabel,
                },
                {
                  label: content.stats.expenses,
                  value: formatCurrency(profitLossQuery.data?.expense_total ?? null),
                  change: selectedRangeLabel,
                },
                {
                  label: content.stats.netProfit,
                  value: formatCurrency(profitLossQuery.data?.net_profit ?? null),
                  change: selectedRangeLabel,
                },
              ].map((stat) => (                
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{stat.change}</span>
                  </div>
                  <strong>
                    {profitLossQuery.isLoading || cashLedgerQuery.isLoading
                      ? content.loadingLabel
                      : stat.value}
                  </strong>                  
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel--command-center panel--wide">
            <div className="panel__header">
              <div>
                <h2>{content.commandCenterTitle}</h2>
                <p>{content.commandCenterSubtitle}</p>
              </div>
              <span className="pill pill--accent">{content.generatedLabel}</span>
            </div>
            <div className="command-center-grid">
              {commandCards.map((card) => (
                <div key={card.label} className="command-center-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="executive-bars">
              {commandCards.map((card, index) => (
                <div key={`cmd-${card.label}`} className="executive-bars__row">
                  <span>{card.label}</span>
                  <div className="executive-bars__track">
                    <span style={{ width: `${42 + ((index + 2) * 10) % 43}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {searchTerm.trim().length > 0 && (
            <section className="search-results" aria-live="polite">
              <div className="search-results__header">
                <div>
                  <h2>{content.searchResultsTitle}</h2>
                  <p>{content.searchResultsSubtitle}</p>
                </div>
                <span className="pill pill--accent">
                  {searchResults.length}
                </span>
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

          <section className="grid-panels">
            <div className="panel panel--insights">
              <div className="panel__header">
                <div>
                  <h2>{content.insightsTitle}</h2>
                  <p>{content.insightsSubtitle}</p>
                </div>
                <span className="pill pill--accent">Sync</span>
              </div>
              <div className="bar-chart">
                {barValues.length ? (
                  barValues.map((item) => (
                    <span
                      key={item.date}
                      style={{ height: `${item.height}%` }}
                      title={`${item.date}: ${formatCurrency(item.value.toString())}`}
                    />
                  ))
                ) : (
                  <span className="bar-chart__empty">
                    {kpisQuery.isLoading
                      ? content.loadingLabel
                      : content.searchEmptyTitle}
                  </span>
                )}
              </div>
            </div>

            <div className="panel panel--forecast panel--wide">
              <div className="panel__header">
                <div>
                  <h2>{content.forecastTitle}</h2>
                  <p>{content.forecastSubtitle}</p>
                </div>
                <span className="pill">
                  {forecastSnapshot?.horizon_days ? `+${forecastSnapshot.horizon_days}d` : "-"}
                </span>
              </div>
              <div className="forecast-grid">
                {forecastCards.length ? (
                  forecastCards.map((card) => (
                    <div key={card.label} className="forecast-card">
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                    </div>
                  ))
                ) : (
                  <div className="forecast-card">
                    <span>{content.loadingLabel}</span>
                    <strong>-</strong>
                  </div>
                )}
              </div>
              <div className="executive-bars">
                {forecastBars.map((bar) => (
                  <div key={bar.label} className="executive-bars__row">
                    <span>{bar.label}</span>
                    <div className={`executive-bars__track executive-bars__track--${bar.tone}`}>
                      <span style={{ width: `${bar.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel--finance-mix panel--wide">
              <div className="panel__header">
                <div>
                  <h2>{content.financeMixTitle}</h2>
                  <p>{content.financeMixSubtitle}</p>
                </div>
                <span className="pill">{financeMixRows.length || 0}</span>
              </div>
              <div className="finance-mix-chart">
                {financeMixBars.length ? (
                  financeMixBars.map((row) => (
                    <div key={row.date} className="finance-mix-chart__row" title={`${row.date} • ${content.stats.revenue}: ${formatCurrency(row.revenue.toString())} • ${content.stats.expenses}: ${formatCurrency(row.expenses.toString())}`}>
                      <div className="finance-mix-chart__bars">
                        <span style={{ height: `${row.revenueHeight}%` }} className="finance-mix-chart__bar finance-mix-chart__bar--revenue" />
                        <span style={{ height: `${row.expenseHeight}%` }} className="finance-mix-chart__bar finance-mix-chart__bar--expense" />
                      </div>
                      <small>{new Date(row.date).toLocaleDateString(isArabic ? "ar" : "en", { month: "short", day: "numeric" })}</small>
                    </div>
                  ))
                ) : (
                  <div className="search-results__empty">
                    <strong>{content.noDataLabel}</strong>
                    <span>{content.financeMixSubtitle}</span>
                  </div>
                )}
              </div>
              <div className="finance-mix-totals">
                <span>{content.stats.revenue}: <strong>{formatCurrency(totalRevenue.toString())}</strong></span>
                <span>{content.stats.expenses}: <strong>{formatCurrency(totalExpenses.toString())}</strong></span>
                <span>{content.stats.netProfit}: <strong>{formatCurrency(totalNet.toString())}</strong></span>
              </div>
            </div>

            <div className="panel panel--hr-health panel--wide">
              <div className="panel__header">
                <div>
                  <h2>{content.hrHealthTitle}</h2>
                  <p>{content.hrHealthSubtitle}</p>
                </div>
                <span className="pill pill--accent">{formatNumber(hrMetrics.availabilityScore.toString())}%</span>
              </div>
              <div className="hr-health-layout">
                <div className="gauge-wrap">
                  <div className="gauge" style={gaugeStyle}>
                    <div className="gauge__center">
                      <strong>{formatNumber(hrMetrics.availabilityScore.toString())}%</strong>
                      <span>{isArabic ? "جاهزية الفريق" : "Team readiness"}</span>
                    </div>
                  </div>
                </div>
                <div className="hr-health-metrics">
                  <div>
                    <span>{content.absenceLabel}</span>
                    <strong>{hrAbsenceAverage === null ? "-" : `${formatNumber(hrAbsenceAverage.toFixed(1))} ${isArabic ? "يوم" : "days"}`}</strong>
                  </div>
                  <div>
                    <span>{content.latenessLabel}</span>
                    <strong>{formatPercent(hrMetrics.latenessAvg?.toString() ?? null)}</strong>
                  </div>
                  <div>
                    <span>{content.overtimeLabel}</span>
                    <strong>{formatNumber(hrMetrics.overtimeTotal.toString())}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel panel--signals panel--wide">
              <div className="panel__header">
                <div>
                  <h2>{content.signalsTitle}</h2>
                  <p>{content.signalsSubtitle}</p>
                </div>
                <span className="pill">{alertsQuery.data?.length ?? 0}</span>
              </div>
              <div className="signal-bars">
                {riskDistribution.map((item) => (
                  <div key={item.label} className="signal-bar-item">
                    <div className="signal-bar-item__meta">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="signal-bar-track">
                      <span style={{ width: `${Math.max(item.ratio, item.value ? 8 : 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel--activity panel--wide">
              <div className="panel__header">
                <div>
                  <h2>{content.activityTitle}</h2>
                  <p>{content.activitySubtitle}</p>
                </div>
              </div>
              <div className="activity-list">
                {activityItems.length ? (
                  activityItems.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {new Date(item.event_date).toLocaleDateString(
                            isArabic ? "ar" : "en"
                          )}
                        </span>
                      </div>
                      <span className="tag">{item.severity}</span>
                    </div>
                  ))
                ) : (
                  <div className="activity-item">
                    <div>
                      <strong>{content.searchEmptyTitle}</strong>
                      <span>{content.searchEmptySubtitle}</span>
                    </div>
                    <span className="tag">-</span>
                  </div>
                )}
              </div>
            </div>

          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}
