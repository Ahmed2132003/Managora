import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { isForbiddenError } from "../../shared/api/errors";
import {
  type JournalEntry,
  type JournalEntryLinePayload,
  useAccounts,
  useCostCenters,
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntries,
  useUpdateJournalEntry,
} from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import "../DashboardPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  welcome: string;
  languageLabel: string;
  themeLabel: string;
  navigationLabel: string;
  logoutLabel: string;
  footer: string;
  userFallback: string;
  searchPlaceholder: string;
  pageTitle: string;
  pageSubtitle: string;
  summaryTitle: string;
  summarySubtitle: string;
  filtersTitle: string;
  filtersSubtitle: string;
  tableTitle: string;
  tableSubtitle: string;
  rangeLabel: string;
  stats: {
    total: string;
    posted: string;
    draft: string;
    lastUpdated: string;
  };
  filters: {
    dateFrom: string;
    dateTo: string;
    referenceType: string;
    referenceAll: string;
  };
  table: {
    date: string;
    reference: string;
    memo: string;
    status: string;
    actions: string;
    view: string;
    edit: string;
    remove: string;
    empty: string;
    loading: string;
  };
  modal: {
    titleCreate: string;
    titleEdit: string;
    subtitle: string;
    date: string;
    referenceType: string;
    memo: string;
    linesTitle: string;
    account: string;
    costCenter: string;
    description: string;
    debit: string;
    credit: string;
    addLine: string;
    removeLine: string;
    totalDebit: string;
    totalCredit: string;
    cancel: string;
    save: string;
    saving: string;
    confirmDelete: string;
    errorRequired: string;
    errorLines: string;
    errorBalance: string;
    errorBoth: string;
  };  
  referenceOptions: Array<{ value: string; label: string }>;
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
    welcome: "Welcome back",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchPlaceholder: "Search journal entries...",
    pageTitle: "Journal Entries",
    pageSubtitle: "Track accounting movements with clarity and control.",
    summaryTitle: "Journal Overview",
    summarySubtitle: "Snapshot of the latest posting activity",
    filtersTitle: "Filters",
    filtersSubtitle: "Refine the entries shown below",
    tableTitle: "Entry Register",
    tableSubtitle: "Recent journals and references",
    rangeLabel: "Last 30 days",
    stats: {
      total: "Total entries",
      posted: "Posted entries",
      draft: "Draft entries",
      lastUpdated: "Last updated",
    },
    filters: {
      dateFrom: "Date from",
      dateTo: "Date to",
      referenceType: "Reference type",
      referenceAll: "All references",
    },
    table: {
      date: "Date",
      reference: "Reference",
      memo: "Memo",
      status: "Status",
      actions: "Actions",
      view: "View",
      edit: "Edit",
      remove: "Delete",
      empty: "No journal entries yet.",
      loading: "Loading journal entries...",
    },
    modal: {
      titleCreate: "New journal entry",
      titleEdit: "Edit journal entry",
      subtitle: "Add the entry header and line items.",
      date: "Entry date",
      referenceType: "Reference type",
      memo: "Memo",
      linesTitle: "Entry lines",
      account: "Account",
      costCenter: "Cost center",
      description: "Description",
      debit: "Debit",
      credit: "Credit",
      addLine: "Add line",
      removeLine: "Remove",
      totalDebit: "Total debit",
      totalCredit: "Total credit",
      cancel: "Cancel",
      save: "Save entry",
      saving: "Saving...",
      confirmDelete: "Delete this journal entry?",
      errorRequired: "Please fill the required header fields.",
      errorLines: "Please add valid line items with accounts and amounts.",
      errorBalance: "Debits and credits must be equal.",
      errorBoth: "Each line should have either debit or credit, not both.",
    },    
    referenceOptions: [
      { value: "manual", label: "Manual" },
      { value: "payroll", label: "Payroll" },
      { value: "expense", label: "Expense" },
      { value: "adjustment", label: "Adjustment" },
    ],
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
    welcome: "أهلًا بعودتك",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchPlaceholder: "ابحث عن قيود اليومية...",
    pageTitle: "قيود اليومية",
    pageSubtitle: "متابعة الحركات المحاسبية بكل وضوح.",
    summaryTitle: "ملخص القيود",
    summarySubtitle: "نظرة سريعة على آخر الحركات",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "تحكم في القيود المعروضة",
    tableTitle: "سجل القيود",
    tableSubtitle: "آخر القيود والمراجع",
    rangeLabel: "آخر ٣٠ يوم",
    stats: {
      total: "إجمالي القيود",
      posted: "القيود المرحّلة",
      draft: "القيود المسودة",
      lastUpdated: "آخر تحديث",
    },
    filters: {
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
      referenceType: "نوع المرجع",
      referenceAll: "كل المراجع",
    },
    table: {
      date: "التاريخ",
      reference: "المرجع",
      memo: "البيان",
      status: "الحالة",
      actions: "إجراءات",
      view: "عرض",
      edit: "تعديل",
      remove: "حذف",
      empty: "لا توجد قيود بعد.",
      loading: "جاري تحميل القيود...",
    },
    modal: {
      titleCreate: "قيد يومية جديد",
      titleEdit: "تعديل قيد اليومية",
      subtitle: "أضف بيانات القيد وبنود القيد.",
      date: "تاريخ القيد",
      referenceType: "نوع المرجع",
      memo: "البيان",
      linesTitle: "بنود القيد",
      account: "الحساب",
      costCenter: "مركز التكلفة",
      description: "الوصف",
      debit: "مدين",
      credit: "دائن",
      addLine: "إضافة بند",
      removeLine: "حذف",
      totalDebit: "إجمالي المدين",
      totalCredit: "إجمالي الدائن",
      cancel: "إلغاء",
      save: "حفظ القيد",
      saving: "جارٍ الحفظ...",
      confirmDelete: "هل تريد حذف قيد اليومية؟",
      errorRequired: "يرجى إدخال بيانات القيد الأساسية.",
      errorLines: "يرجى إدخال بنود صحيحة مع الحساب والمبالغ.",
      errorBalance: "يجب أن يتساوى إجمالي المدين مع إجمالي الدائن.",
      errorBoth: "يجب تحديد مدين أو دائن فقط في كل بند.",
    },    
    referenceOptions: [
      { value: "manual", label: "يدوي" },
      { value: "payroll", label: "الرواتب" },
      { value: "expense", label: "مصروف" },
      { value: "adjustment", label: "تسوية" },
    ],
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

export function JournalEntriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [referenceType, setReferenceType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formReferenceType, setFormReferenceType] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const lineIdRef = useRef(0);
  const [formLines, setFormLines] = useState<
    Array<{
      id: number;
      accountId: string;
      costCenterId: string;
      description: string;
      debit: string;
      credit: string;
    }>
  >([]);
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";  
  const userPermissions = useMemo(
    () => data?.permissions ?? [],
    [data?.permissions]
  );  
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;

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

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      referenceType: referenceType || undefined,
      search: searchTerm || undefined,
    }),
    [dateFrom, dateTo, referenceType, searchTerm]
  );

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

  const entriesQuery = useJournalEntries(filters);
  const accountsQuery = useAccounts();
  const costCentersQuery = useCostCenters();
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: String(account.id),
        label: `${account.code} - ${account.name}`,
      })),
    [accountsQuery.data]
  );

  const costCenterOptions = useMemo(
    () =>
      (costCentersQuery.data ?? []).map((center) => ({
        value: String(center.id),
        label: `${center.code} - ${center.name}`,
      })),
    [costCentersQuery.data]
  );

  if (isForbiddenError(entriesQuery.error)) {
    return <AccessDenied />;
  }

  const totalEntries = entriesQuery.data?.length ?? 0;
  const postedEntries =
    entriesQuery.data?.filter((entry) => entry.status === "posted").length ?? 0;
  const draftEntries =
    entriesQuery.data?.filter((entry) => entry.status === "draft").length ?? 0;

  const nextLineId = () => {
    lineIdRef.current += 1;
    return lineIdRef.current;
  };

  const resetForm = () => {
    setFormError(null);
    setFormDate("");
    setFormReferenceType("");
    setFormMemo("");
    setFormLines([
      {
        id: nextLineId(),
        accountId: "",
        costCenterId: "",
        description: "",
        debit: "",
        credit: "",
      },
    ]);
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setFormDate(entry.date);
    setFormReferenceType(entry.reference_type);
    setFormMemo(entry.memo || "");
    setFormLines(
      entry.lines.map((line) => ({
        id: nextLineId(),
        accountId: String(line.account.id),
        costCenterId: line.cost_center ? String(line.cost_center.id) : "",
        description: line.description || "",
        debit: line.debit ?? "",
        credit: line.credit ?? "",
      }))
    );
    setModalOpen(true);
  };

  const updateLine = (
    id: number,
    field: "accountId" | "costCenterId" | "description" | "debit" | "credit",
    value: string
  ) => {
    setFormLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  const removeLine = (id: number) => {
    setFormLines((prev) => prev.filter((line) => line.id !== id));
  };

  const parseNumber = (value: string) => {
    const numeric = Number(value.replace(/,/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const totals = useMemo(() => {
    return formLines.reduce(
      (acc, line) => {
        acc.debit += parseNumber(line.debit || "0");
        acc.credit += parseNumber(line.credit || "0");
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [formLines]);

  const buildPayload = () => {
    if (!formDate || !formReferenceType) {
      setFormError(content.modal.errorRequired);
      return null;
    }

    const payloadLines: JournalEntryLinePayload[] = [];

    for (const line of formLines) {
      if (!line.accountId && !line.debit && !line.credit && !line.description) {
        continue;
      }
      if (!line.accountId) {
        setFormError(content.modal.errorLines);
        return null;
      }
      const debitValue = parseNumber(line.debit || "0");
      const creditValue = parseNumber(line.credit || "0");
      if (debitValue > 0 && creditValue > 0) {
        setFormError(content.modal.errorBoth);
        return null;
      }
      if (debitValue === 0 && creditValue === 0) {
        setFormError(content.modal.errorLines);
        return null;
      }
      payloadLines.push({
        account: Number(line.accountId),
        cost_center: line.costCenterId ? Number(line.costCenterId) : null,
        description: line.description,
        debit: debitValue.toFixed(2),
        credit: creditValue.toFixed(2),
      });
    }

    if (payloadLines.length === 0) {
      setFormError(content.modal.errorLines);
      return null;
    }

    const debitTotal = payloadLines.reduce(
      (sum, line) => sum + parseNumber(line.debit),
      0
    );
    const creditTotal = payloadLines.reduce(
      (sum, line) => sum + parseNumber(line.credit),
      0
    );

    if (debitTotal !== creditTotal) {
      setFormError(content.modal.errorBalance);
      return null;
    }

    return {
      date: formDate,
      reference_type: formReferenceType,
      memo: formMemo,
      status: editingEntry?.status ?? "draft",
      lines: payloadLines,
    };
  };

  const handleSubmit = async () => {
    setFormError(null);
    const payload = buildPayload();
    if (!payload) {
      return;
    }
    if (editingEntry) {
      await updateEntry.mutateAsync({ id: editingEntry.id, payload });
    } else {
      await createEntry.mutateAsync(payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    setModalOpen(false);
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm(content.modal.confirmDelete)) {
      return;
    }
    await deleteEntry.mutateAsync(entryId);
    await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
  };

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

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
            <strong>{userName}</strong>
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
              <h1>{content.pageTitle}</h1>
              <p>{content.pageSubtitle}</p>
              <div className="hero-tags">
                <span className="pill">{content.rangeLabel}</span>
                <span className="pill pill--accent">
                  {new Date().toLocaleDateString(isArabic ? "ar" : "en")}
                </span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {[
                { label: content.stats.total, value: totalEntries },
                { label: content.stats.posted, value: postedEntries },
                { label: content.stats.draft, value: draftEntries },
                {
                  label: content.stats.lastUpdated,
                  value: new Date().toLocaleDateString(isArabic ? "ar" : "en"),
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{content.rangeLabel}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.filters.dateFrom}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.dateTo}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{content.filters.referenceType}</span>
                <select
                  value={referenceType ?? ""}
                  onChange={(event) =>
                    setReferenceType(event.target.value || null)
                  }
                >
                  <option value="">{content.filters.referenceAll}</option>
                  {content.referenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{content.tableTitle}</h2>
                <p>{content.tableSubtitle}</p>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className="action-button"
                  onClick={openCreateModal}                  
                >
                  + {isArabic ? "قيد جديد" : "New Entry"}
                </button>                
              </div>
            </div>
            <div className="table-wrapper">
              {entriesQuery.isLoading ? (
                <p className="helper-text">{content.table.loading}</p>
              ) : entriesQuery.data && entriesQuery.data.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.table.date}</th>
                      <th>{content.table.reference}</th>
                      <th>{content.table.memo}</th>
                      <th>{content.table.status}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesQuery.data.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{entry.reference_type}</td>
                        <td>{entry.memo || "-"}</td>
                        <td>
                          <span className="status-pill">{entry.status}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Link
                              to={`/accounting/journal-entries/${entry.id}`}
                              className="table-action"
                            >
                              {content.table.view}
                            </Link>
                            <button
                              type="button"
                              className="table-action"
                              onClick={() => openEditModal(entry)}
                            >
                              {content.table.edit}
                            </button>
                            <button
                              type="button"
                              className="table-action table-action--danger"
                              onClick={() => handleDelete(entry.id)}
                            >
                              {content.table.remove}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="helper-text">{content.table.empty}</p>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>

      {modalOpen && (
        <div className="dashboard-modal" role="dialog" aria-modal="true">
          <div
            className="dashboard-modal__backdrop"
            onClick={() => setModalOpen(false)}
          />
          <div className="dashboard-modal__content">
            <div className="dashboard-modal__header">
              <div>
                <h2>
                  {editingEntry
                    ? content.modal.titleEdit
                    : content.modal.titleCreate}
                </h2>
                <p>{content.modal.subtitle}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModalOpen(false)}
                aria-label={content.modal.cancel}
              >
                ✕
              </button>
            </div>
            <div className="dashboard-modal__body">
              <div className="filters-grid">
                <label className="field">
                  <span>{content.modal.date}</span>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{content.modal.referenceType}</span>
                  <select
                    value={formReferenceType}
                    onChange={(event) => setFormReferenceType(event.target.value)}
                  >
                    <option value="">{content.filters.referenceAll}</option>
                    {content.referenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field field--full">
                  <span>{content.modal.memo}</span>
                  <input
                    type="text"
                    value={formMemo}
                    onChange={(event) => setFormMemo(event.target.value)}
                  />
                </label>
              </div>

              <div className="panel__header">
                <div>
                  <h3>{content.modal.linesTitle}</h3>
                </div>
                <button
                  type="button"
                  className="action-button"
                  onClick={() =>
                    setFormLines((prev) => [
                      ...prev,
                      {
                        id: nextLineId(),
                        accountId: "",
                        costCenterId: "",
                        description: "",
                        debit: "",
                        credit: "",
                      },
                    ])
                  }
                >
                  + {content.modal.addLine}
                </button>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.modal.account}</th>
                      <th>{content.modal.costCenter}</th>
                      <th>{content.modal.description}</th>
                      <th>{content.modal.debit}</th>
                      <th>{content.modal.credit}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formLines.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <select
                            value={line.accountId}
                            onChange={(event) =>
                              updateLine(line.id, "accountId", event.target.value)
                            }
                          >
                            <option value="">
                              {isArabic ? "اختر الحساب" : "Select account"}
                            </option>
                            {accountOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={line.costCenterId}
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                "costCenterId",
                                event.target.value
                              )
                            }
                          >
                            <option value="">
                              {isArabic ? "بدون" : "None"}
                            </option>
                            {costCenterOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                "description",
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit}
                            onChange={(event) =>
                              updateLine(line.id, "debit", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit}
                            onChange={(event) =>
                              updateLine(line.id, "credit", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-action table-action--danger"
                            onClick={() => removeLine(line.id)}
                            disabled={formLines.length === 1}
                          >
                            {content.modal.removeLine}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel__header">
                <div>
                  <p className="helper-text">
                    {content.modal.totalDebit}: {totals.debit.toFixed(2)} •{" "}
                    {content.modal.totalCredit}: {totals.credit.toFixed(2)}
                  </p>
                  {formError && (
                    <p className="helper-text helper-text--error">{formError}</p>
                  )}
                </div>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    {content.modal.cancel}
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    onClick={handleSubmit}
                    disabled={createEntry.isPending || updateEntry.isPending}
                  >
                    {createEntry.isPending || updateEntry.isPending
                      ? content.modal.saving
                      : content.modal.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}