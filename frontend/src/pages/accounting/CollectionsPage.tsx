import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { clearTokens } from "../../shared/auth/tokens";
import { useMe } from "../../shared/auth/useMe";
import { hasPermission } from "../../shared/auth/useCan";
import { getAllowedPathsForRole } from "../../shared/auth/roleAccess";
import { resolvePrimaryRole } from "../../shared/auth/roleNavigation";
import { useAccounts, useCreatePayment } from "../../shared/accounting/hooks";
import { useCustomers } from "../../shared/customers/hooks";
import { useDeleteInvoice, useInvoices } from "../../shared/invoices/hooks";
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
    openInvoices: string;
    overdueInvoices: string;
    totalDue: string;
    lastUpdated: string;
  };
  filters: {
    status: string;
    statusAll: string;
    statusOverdue: string;
    statusOpen: string;
  };
  table: {
    invoice: string;
    customer: string;
    total: string;
    paid: string;
    remaining: string;
    status: string;
    actions: string;
    empty: string;
    loading: string;
    record: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    overdue: string;
  };  
  modal: {
    title: string;
    subtitle: string;
    invoice: string;
    date: string;
    amount: string;
    method: string;
    methodCash: string;
    methodBank: string;
    account: string;
    notes: string;
    save: string;
    cancel: string;
    confirm: string;
    error: string;
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
    welcome: "Welcome back",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
    searchPlaceholder: "Search invoices and customers...",
    pageTitle: "Collections",
    pageSubtitle: "Track incoming payments and keep receivables healthy.",
    summaryTitle: "Collections Overview",
    summarySubtitle: "Snapshot of open invoices and expected cash.",
    filtersTitle: "Filters",
    filtersSubtitle: "Narrow down invoices that need attention.",
    tableTitle: "Open invoices",
    tableSubtitle: "Invoices with outstanding balances.",
    rangeLabel: "Last 30 days",
    stats: {
      openInvoices: "Open invoices",
      overdueInvoices: "Overdue invoices",
      totalDue: "Total due",
      lastUpdated: "Last updated",
    },
    filters: {
      status: "Status",
      statusAll: "All invoices",
      statusOverdue: "Overdue only",
      statusOpen: "Open only",
    },
    table: {
      invoice: "Invoice",
      customer: "Customer",
      total: "Invoice total",
      paid: "Paid",
      remaining: "Remaining",
      status: "Status",
      actions: "Actions",
      empty: "No open invoices found.",
      loading: "Loading invoices...",
      record: "Record Payment",
      edit: "Edit",
      delete: "Delete",
      confirmDelete: "Delete this invoice?",
      overdue: "overdue",
    },    
    modal: {
      title: "Record payment",
      subtitle: "Log payment details and close the balance.",
      invoice: "Invoice",
      date: "Payment date",
      amount: "Amount",
      method: "Method",
      methodCash: "Cash",
      methodBank: "Bank",
      account: "Cash/Bank account",
      notes: "Notes",
      save: "Save payment",
      cancel: "Cancel",
      confirm: "Record this payment?",
      error: "Please fill all required fields.",
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
    welcome: "أهلًا بعودتك",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
    searchPlaceholder: "ابحث عن الفواتير والعملاء...",
    pageTitle: "التحصيلات",
    pageSubtitle: "تابع التحصيلات وراقب الذمم المدينة.",
    summaryTitle: "ملخص التحصيلات",
    summarySubtitle: "نظرة سريعة على الفواتير المفتوحة.",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "حدد الفواتير ذات الأولوية.",
    tableTitle: "الفواتير المفتوحة",
    tableSubtitle: "الفواتير التي لم يتم تحصيلها بعد.",
    rangeLabel: "آخر ٣٠ يوم",
    stats: {
      openInvoices: "الفواتير المفتوحة",
      overdueInvoices: "الفواتير المتأخرة",
      totalDue: "إجمالي المستحق",
      lastUpdated: "آخر تحديث",
    },
    filters: {
      status: "الحالة",
      statusAll: "كل الفواتير",
      statusOverdue: "المتأخرة فقط",
      statusOpen: "المفتوحة فقط",
    },
    table: {
      invoice: "الفاتورة",
      customer: "العميل",
      total: "إجمالي الفاتورة",
      paid: "المدفوع",
      remaining: "المتبقي",
      status: "الحالة",
      actions: "إجراءات",
      empty: "لا توجد فواتير مفتوحة.",
      loading: "جاري تحميل الفواتير...",
      record: "تسجيل تحصيل",
      edit: "تعديل",
      delete: "حذف",
      confirmDelete: "هل تريد حذف هذه الفاتورة؟",
      overdue: "متأخر",
    },    
    modal: {
      title: "تسجيل تحصيل",
      subtitle: "قم بتسجيل تفاصيل السداد.",
      invoice: "الفاتورة",
      date: "تاريخ السداد",
      amount: "المبلغ",
      method: "طريقة السداد",
      methodCash: "نقدي",
      methodBank: "بنكي",
      account: "حساب النقد/البنك",
      notes: "ملاحظات",
      save: "حفظ التحصيل",
      cancel: "إلغاء",
      confirm: "تأكيد تسجيل التحصيل؟",
      error: "يرجى تعبئة الحقول المطلوبة.",
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

export function CollectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError } = useMe();
  const queryClient = useQueryClient();
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers({});
  const accountsQuery = useAccounts();
  const createPayment = useCreatePayment();
  const deleteInvoice = useDeleteInvoice();

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
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [cashAccountId, setCashAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(
    () => data?.permissions ?? [],
    [data?.permissions]
  );
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;
  const canManageInvoices = useMemo(() => {
    if (data?.user.is_superuser) {
      return true;
    }
    const roles = data?.roles ?? [];
    return roles.some((role) => {
      const roleName = role.slug || role.name;
      return ["manager", "accountant"].includes(roleName.toLowerCase());
    });
  }, [data?.roles, data?.user.is_superuser]);

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

  const customerLookup = useMemo(() => {
    return new Map(
      (customersQuery.data ?? []).map((customer) => [customer.id, customer])
    );
  }, [customersQuery.data]);

  const openInvoices = useMemo(() => {
    return (invoicesQuery.data ?? []).filter(
      (invoice) =>
        Number(invoice.remaining_balance) > 0 && invoice.status !== "void"
    );
  }, [invoicesQuery.data]);

  const overdueInvoices = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return openInvoices.filter((invoice) => invoice.due_date < today);
  }, [openInvoices]);

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return openInvoices.filter((invoice) => {
      if (statusFilter === "overdue" && invoice.due_date >= today) {
        return false;
      }
      if (statusFilter === "open" && invoice.due_date < today) {
        return false;
      }
      if (!query) {
        return true;
      }
      const customerName =
        customerLookup.get(invoice.customer)?.name ?? `Customer #${invoice.customer}`;
      return (
        invoice.invoice_number.toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query)
      );
    });
  }, [customerLookup, openInvoices, searchTerm, statusFilter]);

  const totalDue = useMemo(() => {
    return openInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.remaining_balance || 0),
      0
    );
  }, [openInvoices]);

  const invoiceOptions = useMemo(
    () =>
      openInvoices.map((invoice) => ({
        value: String(invoice.id),
        label: `${invoice.invoice_number} - ${
          customerLookup.get(invoice.customer)?.name ??
          `Customer #${invoice.customer}`
        }`,
      })),
    [customerLookup, openInvoices]
  );
  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: String(account.id),
        label: `${account.code} - ${account.name}`,
      })),
    [accountsQuery.data]
  );

  const resetForm = () => {
    setInvoiceId(null);
    setPaymentDate("");
    setAmount("");
    setMethod("cash");
    setCashAccountId(null);
    setNotes("");
    setFormError(null);
  };

  const getPaymentErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      if (!data) {
        return error.message;
      }
      if (typeof data === "string") {
        return data;
      }
      if (typeof data.detail === "string") {
        return data.detail;
      }
      if (Array.isArray(data)) {
        return data.join(" ");
      }
      if (typeof data === "object") {
        const messages = Object.values(data).flatMap((value) => {
          if (Array.isArray(value)) {
            return value.map((item) => String(item));
          }
          return [String(value)];
        });
        if (messages.length) {
          return messages.join(" ");
        }
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return content.modal.error;
  };

  const submitPayment = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !paymentDate || !amount || !cashAccountId) {
        throw new Error(content.modal.error);
      }      
      const invoice = (invoicesQuery.data ?? []).find(
        (item) => item.id === Number(invoiceId)
      );
      if (!invoice) {
        throw new Error("Invoice not found.");
      }
      await createPayment.mutateAsync({
        customer: invoice.customer,
        invoice: Number(invoiceId),
        payment_date: paymentDate,
        amount: String(amount),
        method,
        cash_account: Number(cashAccountId),
        notes: notes || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      resetForm();
      setModalOpen(false);
    },
    onError: (error) => {
      setFormError(getPaymentErrorMessage(error));
    },
  });
  const handleOpenModal = (selectedInvoiceId?: number) => {
    setInvoiceId(selectedInvoiceId ? String(selectedInvoiceId) : null);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setModalOpen(true);
    setFormError(null);
  };

  const handleDeleteInvoice = async (selectedInvoiceId: number) => {
    if (!window.confirm(content.table.confirmDelete)) {
      return;
    }
    try {
      await deleteInvoice.mutateAsync(selectedInvoiceId);
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (error) {
      window.alert(getPaymentErrorMessage(error));
    }
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
        path: "/employee/self-service",
        label:
          language === "ar"
            ? "الخدمات الذاتية للموظف"
            : "Employee Self-Service",
        icon: "🧑‍💼",
      },
      {
        path: "/messages",
        label: language === "ar" ? "الرسائل" : "Messages",
        icon: "✉️",
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
    [content.nav, language]
  );

  const appRole = resolvePrimaryRole(data);
  const allowedRolePaths = getAllowedPathsForRole(appRole);

  const visibleNavLinks = useMemo(() => {
    return navLinks.filter((link) => {
      if (allowedRolePaths && !allowedRolePaths.has(link.path)) {
        return false;
      }

      if (appRole === "accountant") {
        return true;
      }

      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [allowedRolePaths, appRole, navLinks, userPermissions]);

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
            <p>{content.welcome}</p>
            <strong>{userName}</strong>
            {isLoading && <span className="sidebar-note">...loading profile</span>}
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
                { label: content.stats.openInvoices, value: openInvoices.length },
                { label: content.stats.overdueInvoices, value: overdueInvoices.length },
                {
                  label: content.stats.totalDue,
                  value: totalDue.toLocaleString(isArabic ? "ar" : "en"),
                },
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
              <div className="panel-actions panel-actions--right">
                <button type="button" className="action-button" onClick={() => handleOpenModal()}>
                  + {content.table.record}
                </button>
              </div>
            </div>
            <div className="filters-grid">
              <label className="field">
                <span>{content.filters.status}</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">{content.filters.statusAll}</option>
                  <option value="overdue">{content.filters.statusOverdue}</option>
                  <option value="open">{content.filters.statusOpen}</option>
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
            </div>
            <div className="table-wrapper">
              {invoicesQuery.isLoading ? (
                <p className="helper-text">{content.table.loading}</p>
              ) : filteredInvoices.length === 0 ? (
                <p className="helper-text">{content.table.empty}</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{content.table.invoice}</th>
                      <th>{content.table.customer}</th>
                      <th>{content.table.total}</th>
                      <th>{content.table.paid}</th>
                      <th>{content.table.remaining}</th>
                      <th>{content.table.status}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const customerName =
                        customerLookup.get(invoice.customer)?.name ??
                        `Customer #${invoice.customer}`;
                      const isOverdue = invoice.due_date < new Date().toISOString().slice(0, 10);
                      return (
                        <tr key={invoice.id}>
                          <td>{invoice.invoice_number}</td>
                          <td>{customerName}</td>
                          <td>{invoice.total_amount}</td>
                          <td>{invoice.total_paid}</td>
                          <td>{invoice.remaining_balance}</td>
                          <td>
                            <span className="status-pill">{invoice.status.replace("_", " ")}</span>
                            {isOverdue && (
                              <span className="status-pill" style={{ marginInlineStart: "8px" }}>
                                {content.table.overdue}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="table-action"
                                onClick={() => handleOpenModal(invoice.id)}
                              >
                                {content.table.record}
                              </button>
                              {canManageInvoices && (
                                <>
                                  <button
                                    type="button"
                                    className="table-action"
                                    onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                  >
                                    {content.table.edit}
                                  </button>
                                  <button
                                    type="button"
                                    className="table-action table-action--danger"
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    disabled={deleteInvoice.isPending}
                                  >
                                    {content.table.delete}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}                    
                  </tbody>
                </table>
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
            onClick={() => {
              setModalOpen(false);
              resetForm();
            }}
            aria-hidden="true"
          />
          <div className="dashboard-modal__content">
            <div className="dashboard-modal__header">
              <div>
                <h2>{content.modal.title}</h2>
                <p>{content.modal.subtitle}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                aria-label={isArabic ? "إغلاق" : "Close"}
              >
                ✕
              </button>
            </div>
            <div className="dashboard-modal__body">
              <div className="filters-grid">
                <label className="field">
                  <span>{content.modal.invoice}</span>
                  <select
                    value={invoiceId ?? ""}
                    onChange={(event) => setInvoiceId(event.target.value || null)}
                    required
                  >
                    <option value="">
                      {isArabic ? "اختر الفاتورة" : "Select invoice"}
                    </option>
                    {invoiceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{content.modal.date}</span>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>{content.modal.amount}</span>
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>{content.modal.method}</span>
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod((event.target.value as "cash" | "bank") ?? "cash")
                    }
                    required
                  >
                    <option value="cash">{content.modal.methodCash}</option>
                    <option value="bank">{content.modal.methodBank}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{content.modal.account}</span>
                  <select
                    value={cashAccountId ?? ""}
                    onChange={(event) => setCashAccountId(event.target.value || null)}
                    required
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
                </label>
                <label className="field field--full">
                  <span>{content.modal.notes}</span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
              </div>
              {formError && <p className="helper-text helper-text--error">{formError}</p>}
              <div className="panel-actions panel-actions--right">
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                >
                  {content.modal.cancel}
                </button>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => {
                    if (!window.confirm(content.modal.confirm)) {
                      return;
                    }
                    submitPayment.mutate();
                  }}
                  disabled={submitPayment.isPending}
                >
                  {submitPayment.isPending
                    ? isArabic
                      ? "...جاري الحفظ"
                      : "Saving..."
                    : content.modal.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}