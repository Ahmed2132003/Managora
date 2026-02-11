import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { isForbiddenError } from "../shared/api/errors";
import { clearTokens } from "../shared/auth/tokens";
import { useMe } from "../shared/auth/useMe";
import { hasPermission } from "../shared/auth/useCan";
import type { Department } from "../shared/hr/hooks";
import "./DashboardPage.css";
import "./CopilotPage.css";

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
  promptLabel: string;
  promptPlaceholder: string;
  runReport: string;
  editParams: string;
  suggestionTitle: string;
  suggestionSubtitle: string;
  responseTitle: string;
  responseSubtitle: string;
  paramsTitle: string;
  paramsSubtitle: string;
  applyParams: string;
  loadingLabel: string;
  emptyResponseTitle: string;
  emptyResponseSubtitle: string;
  errorTitle: string;
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
  params: {
    startDate: string;
    endDate: string;
    limit: string;
    year: string;
    month: string;
    department: string;
  };
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "Your AI-ready reporting cockpit.",
    searchPlaceholder: "Search dashboards, insights, teams...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Copilot Intelligence",
    pageSubtitle: "Ask natural-language questions and receive instant analytics.",
    promptLabel: "Question",
    promptPlaceholder: "Type your question or pick a suggestion",
    runReport: "Run report",
    editParams: "Edit parameters",
    suggestionTitle: "Suggested prompts",
    suggestionSubtitle: "Quick starts tailored to your teams",
    responseTitle: "Latest response",
    responseSubtitle: "Results stream as soon as data is ready",
    paramsTitle: "Configure parameters",
    paramsSubtitle: "Fine-tune filters before running the report.",
    applyParams: "Apply & run",
    loadingLabel: "Running report...",
    emptyResponseTitle: "No response yet",
    emptyResponseSubtitle: "Run a report to see analytics blocks here.",
    errorTitle: "Something went wrong",
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
    params: {
      startDate: "Start date",
      endDate: "End date",
      limit: "Limit",
      year: "Year",
      month: "Month",
      department: "Department",
    },
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "مركز تحليلات ذكي لقرارات أسرع.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو الرؤى...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "ذكاء كوبيلوت",
    pageSubtitle: "اسأل بالسياق الطبيعي واحصل على تقارير فورية.",
    promptLabel: "السؤال",
    promptPlaceholder: "اكتب سؤالك أو اختر اقتراحًا",
    runReport: "تشغيل التقرير",
    editParams: "تعديل المعايير",
    suggestionTitle: "اقتراحات جاهزة",
    suggestionSubtitle: "بدايات سريعة مخصصة لفريقك",
    responseTitle: "آخر نتيجة",
    responseSubtitle: "النتائج تظهر فور جاهزية البيانات",
    paramsTitle: "تهيئة المعايير",
    paramsSubtitle: "اضبط الفلاتر قبل تشغيل التقرير.",
    applyParams: "تطبيق وتشغيل",
    loadingLabel: "جارٍ تشغيل التقرير...",
    emptyResponseTitle: "لا توجد نتائج بعد",
    emptyResponseSubtitle: "شغّل تقريرًا لعرض المخرجات هنا.",
    errorTitle: "حدث خطأ",
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
      hrAttendance: "حضور الموارد",
      leaveInbox: "وارد الإجازات",
      policies: "السياسات",
      hrActions: "إجراءات الموارد",
      payroll: "الرواتب",
      accountingSetup: "إعداد المحاسبة",
      journalEntries: "قيود اليومية",
      expenses: "المصروفات",
      collections: "التحصيلات",
      trialBalance: "ميزان المراجعة",
      generalLedger: "الأستاذ العام",
      profitLoss: "الأرباح والخسائر",
      balanceSheet: "الميزانية العمومية",
      agingReport: "أعمار الذمم",
      customers: "العملاء",
      newCustomer: "عميل جديد",
      invoices: "الفواتير",
      newInvoice: "فاتورة جديدة",
      catalog: "الخدمات والمنتجات",
      sales: "المبيعات",
      alertsCenter: "مركز التنبيهات",
      cashForecast: "توقع التدفق النقدي",
      ceoDashboard: "لوحة المدير التنفيذي",
      financeDashboard: "لوحة المالية",
      hrDashboard: "لوحة الموارد",
      auditLogs: "سجلات التدقيق",
      setupTemplates: "قوالب الإعداد",
      setupProgress: "تقدّم الإعداد",
    },
    params: {
      startDate: "تاريخ البداية",
      endDate: "تاريخ النهاية",
      limit: "الحد",
      year: "السنة",
      month: "الشهر",
      department: "القسم",
    },
  },
};

type CopilotBlock =
  | {
      type: "kpi_cards";
      data: { label: string; value: string | number | null }[];
    }
  | {
      type: "table";
      columns: { key: string; label: string }[];
      rows: Record<string, string | number | null>[];
    }
  | {
      type: "chart";
      variant: "line" | "bar";
      xKey: string;
      series: { key: string; label: string }[];
      data: Record<string, string | number | null>[];
    };

type CopilotResponse = {
  intent: string;
  title: string;
  blocks: CopilotBlock[];
};

type CopilotIntentKey =
  | "attendance_report"
  | "top_late_employees"
  | "payroll_summary"
  | "top_debtors"
  | "profit_change_explain";

type Suggestion = {
  label: { ar: string; en: string };
  intent: CopilotIntentKey;
  question: string;
  needsParams: boolean;
};

const suggestions: Suggestion[] = [
  {
    label: { ar: "غياب قسم المبيعات آخر 30 يوم", en: "Sales absence (last 30 days)" },
    intent: "attendance_report",
    question: "Attendance report for sales last 30 days",
    needsParams: true,
  },
  {
    label: { ar: "أكتر 10 متأخرين", en: "Top 10 late employees" },
    intent: "top_late_employees",
    question: "Top 10 late employees",
    needsParams: true,
  },
  {
    label: { ar: "ملخص الرواتب", en: "Payroll summary" },
    intent: "payroll_summary",
    question: "Payroll summary",
    needsParams: true,
  },
  {
    label: { ar: "أكبر العملاء المتعثرين", en: "Top debtors" },
    intent: "top_debtors",
    question: "Top debtors",
    needsParams: true,
  },
  {
    label: { ar: "شرح تغير الربح", en: "Explain profit change" },
    intent: "profit_change_explain",
    question: "Explain profit change",
    needsParams: true,
  },
];

export function CopilotPage() {
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
  const [search, setSearch] = useState("");
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(() => data?.permissions ?? [], [data?.permissions]);
  const userName = data?.user.first_name || data?.user.username || content.brand;

  const [question, setQuestion] = useState("");
  const [intent, setIntent] = useState<CopilotIntentKey | "">("");
  const [params, setParams] = useState<Record<string, string | number | null>>({});
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await http.get(endpoints.hr.departments);
      return res.data as Department[];
    },
  });

  const departmentOptions = useMemo(() => {
    return (departmentsQuery.data ?? []).map((dept) => ({
      value: String(dept.id),
      label: dept.name,
    }));
  }, [departmentsQuery.data]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuestion(suggestion.question);
    setIntent(suggestion.intent);
    setParams({});
    setResponse(null);
    setError(null);
    if (suggestion.needsParams) {
      setModalOpen(true);
    }
  };

  const executeQuery = async (overrideParams?: Record<string, string | number | null>) => {
    if (!intent || !question) {
      setError(isArabic ? "يرجى اختيار السؤال والمعايير." : "Please select a prompt.");
      return;
    }
    const rawParams = overrideParams ?? params;
    const sanitizedParams = Object.fromEntries(
      Object.entries(rawParams).map(([key, value]) => {
        if (value === null || value === "") {
          return [key, null];
        }
        if (["department_id", "limit", "year", "month"].includes(key)) {
          return [key, Number(value)];
        }
        return [key, value];
      })
    );
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await http.post(endpoints.copilot.query, {
        question,
        intent,
        params: sanitizedParams,
      });
      setResponse(res.data);
    } catch (err) {
      if (isForbiddenError(err)) {
        setError(
          isArabic
            ? "غير مسموح بالوصول. اطلب من الأدمن تفعيل الصلاحية."
            : "Access denied. Ask an admin to enable this permission."
        );
      } else {
        setError(
          isArabic
            ? "حدث خطأ أثناء تنفيذ الاستعلام."
            : "An error occurred while running the report."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

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
        permissions: ["leaves.balance"],
      },
      {
        path: "/leaves/request",
        label: content.nav.leaveRequest,
        icon: "📝",
        permissions: ["leaves.request"],
      },
      {
        path: "/leaves/my-requests",
        label: content.nav.leaveMyRequests,
        icon: "✅",
        permissions: ["leaves.my_requests"],
      },
      {
        path: "/hr/employees",
        label: content.nav.employees,
        icon: "🧑‍🤝‍🧑",
        permissions: ["employees.view"],
      },
      {
        path: "/hr/departments",
        label: content.nav.departments,
        icon: "🏢",
        permissions: ["departments.view"],
      },
      {
        path: "/hr/job-titles",
        label: content.nav.jobTitles,
        icon: "🎯",
        permissions: ["jobtitles.view"],
      },
      {
        path: "/hr/attendance",
        label: content.nav.hrAttendance,
        icon: "🕒",
        permissions: ["attendance.view_team"],
      },
      {
        path: "/hr/leave-inbox",
        label: content.nav.leaveInbox,
        icon: "📥",
        permissions: ["leaves.view_requests"],
      },
      {
        path: "/hr/policies",
        label: content.nav.policies,
        icon: "📌",
        permissions: ["policies.view"],
      },
      {
        path: "/hr/actions",
        label: content.nav.hrActions,
        icon: "⚡",
        permissions: ["hr_actions.view"],
      },
      {
        path: "/payroll",
        label: content.nav.payroll,
        icon: "💰",
        permissions: ["payroll.view"],
      },
      {
        path: "/accounting/setup",
        label: content.nav.accountingSetup,
        icon: "📘",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/journal",
        label: content.nav.journalEntries,
        icon: "📒",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/expenses",
        label: content.nav.expenses,
        icon: "💳",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/collections",
        label: content.nav.collections,
        icon: "🏦",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/trial-balance",
        label: content.nav.trialBalance,
        icon: "📊",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/general-ledger",
        label: content.nav.generalLedger,
        icon: "📈",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/profit-loss",
        label: content.nav.profitLoss,
        icon: "📉",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/balance-sheet",
        label: content.nav.balanceSheet,
        icon: "🧾",
        permissions: ["accounting.view"],
      },
      {
        path: "/accounting/aging-report",
        label: content.nav.agingReport,
        icon: "⏳",
        permissions: ["accounting.view"],
      },
      {
        path: "/sales/customers",
        label: content.nav.customers,
        icon: "🧑‍💼",
        permissions: ["customers.view"],
      },
      {
        path: "/sales/customers/new",
        label: content.nav.newCustomer,
        icon: "➕",
        permissions: ["customers.create"],
      },
      {
        path: "/sales/invoices",
        label: content.nav.invoices,
        icon: "🧾",
        permissions: ["invoices.view"],
      },
      {
        path: "/sales/invoices/new",
        label: content.nav.newInvoice,
        icon: "🧾",
        permissions: ["invoices.create"],
      },
      { path: "/alerts", label: content.nav.alertsCenter, icon: "🚨" },
      { path: "/forecast", label: content.nav.cashForecast, icon: "💡" },
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

  const renderParamsForm = () => {
    switch (intent) {
      case "attendance_report":
        return (
          <div className="copilot-form-grid">
            <label className="copilot-field">
              <span>{content.params.startDate}</span>
              <input
                type="date"
                value={(params.start_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.endDate}</span>
              <input
                type="date"
                value={(params.end_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.department}</span>
              <select
                value={(params.department_id as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    department_id: event.currentTarget.value || null,
                  }))
                }
              >
                <option value="">
                  {isArabic ? "اختيار قسم" : "Select department"}
                </option>
                {departmentOptions.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        );
      case "top_late_employees":
        return (
          <div className="copilot-form-grid">
            <label className="copilot-field">
              <span>{content.params.startDate}</span>
              <input
                type="date"
                value={(params.start_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.endDate}</span>
              <input
                type="date"
                value={(params.end_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.limit}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={(params.limit as number | string) ?? 10}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    limit: event.currentTarget.value === "" ? null : Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
          </div>
        );
      case "payroll_summary":
        return (
          <div className="copilot-form-grid">
            <label className="copilot-field">
              <span>{content.params.year}</span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={(params.year as number | string) ?? new Date().getFullYear()}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    year: event.currentTarget.value === "" ? null : Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.month}</span>
              <input
                type="number"
                min={1}
                max={12}
                value={(params.month as number | string) ?? new Date().getMonth() + 1}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    month: event.currentTarget.value === "" ? null : Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
          </div>
        );
      case "top_debtors":
        return (
          <div className="copilot-form-grid">
            <label className="copilot-field">
              <span>{content.params.limit}</span>
              <input
                type="number"
                min={1}
                max={50}
                value={(params.limit as number | string) ?? 10}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    limit: event.currentTarget.value === "" ? null : Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
          </div>
        );
      case "profit_change_explain":
        return (
          <div className="copilot-form-grid">
            <label className="copilot-field">
              <span>{content.params.startDate}</span>
              <input
                type="date"
                value={(params.start_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
                }
              />
            </label>
            <label className="copilot-field">
              <span>{content.params.endDate}</span>
              <input
                type="date"
                value={(params.end_date as string) ?? ""}
                onChange={(event) =>
                  setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
                }
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBlock = (block: CopilotBlock, index: number) => {
    if (block.type === "kpi_cards") {
      return (
        <div key={`kpi-${index}`} className="copilot-kpi-grid">
          {block.data.map((item) => (
            <div key={item.label} className="copilot-kpi-card">
              <span>{item.label}</span>
              <strong>{item.value ?? "-"}</strong>
            </div>
          ))}
        </div>
      );
    }

    if (block.type === "table") {
      return (
        <div key={`table-${index}`} className="copilot-table-wrapper">
          {block.rows.length === 0 ? (
            <div className="copilot-empty">No data available.</div>
          ) : (
            <table className="copilot-table">
              <thead>
                <tr>
                  {block.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {block.columns.map((col) => (
                      <td key={`${rowIndex}-${col.key}`}>{row[col.key] ?? "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    if (block.type === "chart") {
      const palette = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"];
      return (
        <div key={`chart-${index}`} className="copilot-chart-card">
          <ResponsiveContainer width="100%" height="100%">
            {block.variant === "line" ? (
              <LineChart data={block.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={block.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {block.series.map((series, seriesIndex) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={palette[seriesIndex % palette.length]}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={block.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={block.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {block.series.map((series, seriesIndex) => (
                  <Bar
                    key={series.key}
                    dataKey={series.key}
                    name={series.label}
                    fill={palette[seriesIndex % palette.length]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="dashboard-page copilot-page"
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.pageTitle}</p>
            <strong>{userName}</strong>
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
          <section className="hero-panel copilot-hero">
            <div className="copilot-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              <div className="copilot-hero__actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => executeQuery()}
                  disabled={!intent || loading}
                >
                  {loading ? content.loadingLabel : content.runReport}
                </button>
                {intent && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setModalOpen(true)}
                  >
                    {content.editParams}
                  </button>
                )}
              </div>
            </div>

            <div className="hero-panel__stats copilot-stats">
              {[
                {
                  label: isArabic ? "نوايا نشطة" : "Active intents",
                  value: intent ? 1 : 0,
                },
                {
                  label: isArabic ? "إجمالي الاقتراحات" : "Suggestions",
                  value: suggestions.length,
                },
                {
                  label: isArabic ? "كتل النتائج" : "Blocks",
                  value: response?.blocks.length ?? 0,
                },
                {
                  label: isArabic ? "آخر استعلام" : "Last query",
                  value: question ? "●" : "—",
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.pageTitle}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel copilot-panel">
            <div className="panel__header">
              <div>
                <h2>{content.promptLabel}</h2>
                <p>{content.promptPlaceholder}</p>
              </div>
            </div>
            <label className="copilot-field">
              <span>{content.promptLabel}</span>
              <input
                type="text"
                value={question}
                placeholder={content.promptPlaceholder}
                onChange={(event) => setQuestion(event.currentTarget.value)}
              />
            </label>

            <div className="copilot-suggestions">
              <div className="copilot-suggestions__header">
                <strong>{content.suggestionTitle}</strong>
                <span>{content.suggestionSubtitle}</span>
              </div>
              <div className="copilot-suggestions__list">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.intent}
                    type="button"
                    className="chip-button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion.label[language]}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="copilot-error">
                <strong>{content.errorTitle}</strong>
                <p>{error}</p>
              </div>
            )}
          </section>

          <section className="panel copilot-panel">
            <div className="panel__header">
              <div>
                <h2>{content.responseTitle}</h2>
                <p>{content.responseSubtitle}</p>
              </div>
            </div>
            {response ? (
              <div className="copilot-response">
                <div className="copilot-response__header">
                  <h3>{response.title}</h3>
                  <span>{response.intent}</span>
                </div>
                <div className="copilot-response__blocks">
                  {response.blocks.map((block, index) => renderBlock(block, index))}
                </div>
              </div>
            ) : (
              <div className="copilot-empty">
                <strong>{content.emptyResponseTitle}</strong>
                <span>{content.emptyResponseSubtitle}</span>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.subtitle}</footer>

      {modalOpen && (
        <div className="dashboard-modal">
          <div
            className="dashboard-modal__backdrop"
            aria-hidden="true"
            onClick={() => setModalOpen(false)}
          />
          <div className="dashboard-modal__content" role="dialog" aria-modal="true">
            <div className="dashboard-modal__header">
              <div>
                <h2>{content.paramsTitle}</h2>
                <p>{content.paramsSubtitle}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModalOpen(false)}
                aria-label={isArabic ? "إغلاق" : "Close"}
              >
                ✕
              </button>
            </div>
            <div className="dashboard-modal__body">
              {renderParamsForm()}
              <div className="copilot-modal__actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setModalOpen(false);
                    executeQuery(params);
                  }}
                >
                  {content.applyParams}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}