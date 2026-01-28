import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Controller,
  useForm,
  type ControllerRenderProps,
} from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { hasPermission, useCan } from "../shared/auth/useCan";
import { clearTokens } from "../shared/auth/tokens";
import { useMe } from "../shared/auth/useMe";
import "./DashboardPage.css";
import "./UsersPage.css";

/* ================= Types ================= */

type Role = {
  id: number;
  name: string;
  slug: string;
};

type Company = {
  id: number;
  name: string;
};

type User = {
  id: number;
  username: string;
  email: string;  
  is_active: boolean;
  roles?: Role[] | null;
  date_joined?: string | null;  
};

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
  createUser: string;
  filtersTitle: string;
  filtersSubtitle: string;
  roleFilter: string;
  rolePlaceholder: string;
  statusFilter: string;
  statusPlaceholder: string;
  clearFilters: string;
  stats: {
    totalUsers: string;
    activeUsers: string;
    inactiveUsers: string;
    totalRoles: string;
  };
  table: {
    title: string;
    subtitle: string;
    username: string;
    email: string;
    roles: string;
    active: string;
    created: string;
    actions: string;
    emptyTitle: string;
    emptySubtitle: string;
    loading: string;
  };
  status: {
    active: string;
    inactive: string;
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
  form: {
    createTitle: string;
    editTitle: string;
    username: string;
    email: string;
    password: string;
    passwordOptional: string;
    roles: string;
    rolesPlaceholder: string;
    company: string;
    companyPlaceholder: string;
    companyName: string;
    createCompany: string;
    active: string;
    create: string;
    save: string;
    confirmDelete: (name: string) => string;
  };  
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search users, emails, roles...",
    languageLabel: "Language",
    themeLabel: "Theme",
    navigationLabel: "Navigation",
    logoutLabel: "Logout",
    pageTitle: "Users",
    pageSubtitle: "Manage roles, access, and member activity.",
    createUser: "Create user",
    filtersTitle: "User filters",
    filtersSubtitle: "Narrow down by role or status",
    roleFilter: "Role",
    rolePlaceholder: "All roles",
    statusFilter: "Status",
    statusPlaceholder: "All statuses",
    clearFilters: "Clear filters",
    stats: {
      totalUsers: "Total users",
      activeUsers: "Active users",
      inactiveUsers: "Inactive users",
      totalRoles: "Roles available",
    },
    table: {
      title: "Team directory",
      subtitle: "Live user data and permissions",
      username: "Username",
      email: "Email",
      roles: "Roles",
      active: "Status",
      created: "Created",
      actions: "Actions",
      emptyTitle: "No users yet",
      emptySubtitle: "Add team members to start collaborating.",
      loading: "Loading users...",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
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
    form: {
      createTitle: "Create user",
      editTitle: "Edit user",
      username: "Username",
      email: "Email",
      password: "Password",
      passwordOptional: "New password (optional)",
      roles: "Roles",
      rolesPlaceholder: "Select roles",      
      company: "Company",
      companyPlaceholder: "Select company",
      companyName: "Company name",
      createCompany: "Create company",
      active: "Active",
      create: "Create",
      save: "Save",
      confirmDelete: (name) => `Delete user ${name}?`,      
    },
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن المستخدمين أو البريد أو الأدوار...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    navigationLabel: "التنقل",
    logoutLabel: "تسجيل الخروج",
    pageTitle: "المستخدمون",
    pageSubtitle: "إدارة الأدوار والصلاحيات ونشاط الفريق.",
    createUser: "إضافة مستخدم",
    filtersTitle: "تصفية المستخدمين",
    filtersSubtitle: "تحديد الدور أو الحالة",
    roleFilter: "الدور",
    rolePlaceholder: "كل الأدوار",
    statusFilter: "الحالة",
    statusPlaceholder: "كل الحالات",
    clearFilters: "مسح الفلاتر",
    stats: {
      totalUsers: "إجمالي المستخدمين",
      activeUsers: "المستخدمون النشطون",
      inactiveUsers: "المستخدمون غير النشطين",
      totalRoles: "عدد الأدوار",
    },
    table: {
      title: "دليل الفريق",
      subtitle: "بيانات المستخدمين والصلاحيات مباشرة",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      roles: "الأدوار",
      active: "الحالة",
      created: "تاريخ الإنشاء",
      actions: "إجراءات",
      emptyTitle: "لا يوجد مستخدمون",
      emptySubtitle: "أضف أعضاء الفريق لبدء العمل.",
      loading: "جارٍ تحميل المستخدمين...",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
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
    form: {
      createTitle: "إضافة مستخدم",
      editTitle: "تعديل المستخدم",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      passwordOptional: "كلمة مرور جديدة (اختياري)",
      roles: "الأدوار",
      rolesPlaceholder: "اختر الأدوار",
      company: "الشركة",
      companyPlaceholder: "اختر الشركة",
      companyName: "اسم الشركة",
      createCompany: "إنشاء شركة",
      active: "نشط",
      create: "إضافة",
      save: "حفظ",
      confirmDelete: (name) => `حذف المستخدم ${name}?`,      
    },
  },
};

/* ================= Schemas ================= */

const createSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required / اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("Invalid email / البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters / كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  is_active: z.boolean(),
  role_id: z.string().min(1, "Role is required / الدور مطلوب"),
  company_id: z.string().optional(),
});

const editSchema = z.object({
  id: z.number().int(),
  username: z
    .string()
    .min(1, "Username is required / اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("Invalid email / البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, {
      message:
        "Password must be at least 8 characters / كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    }),
  is_active: z.boolean(),
  role_id: z.string().min(1, "Role is required / الدور مطلوب"),
});

/**
 * ✅ أهم تعديل لحل 2322:
 * استخدم z.input بدل z.infer للفورم values
 * لأن resolver بيتعامل مع "input" مش "output".
 */
type CreateFormValues = z.input<typeof createSchema>;
type EditFormValues = z.input<typeof editSchema>;

const defaultCreateValues: CreateFormValues = {
  username: "",
  email: "",
  password: "",

  is_active: true,
  role_id: "",
  company_id: undefined,
};

const defaultEditValues: EditFormValues = {
  id: 0,
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_id: "",
};

/* ================= Page ================= */

export function UsersPage() {
  const queryClient = useQueryClient();
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
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";
  const userPermissions = useMemo(
    () => data?.permissions ?? [],
    [data?.permissions]
  );  
  const userName =
    data?.user.first_name || data?.user.username || content.brand;

  const canCreate = useCan("users.create");
  const canEdit = useCan("users.edit");
  const canDelete = useCan("users.delete");
  const canView = useCan("users.view");

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
    if (!isLoading && data && !canView) {
      navigate("/dashboard", { replace: true });
    }
  }, [canView, data, isLoading, navigate]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [createOpened, setCreateOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaultEditValues,
  });

  /* ================= Queries ================= */

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await http.get<Role[]>(endpoints.roles);
      return res.data;
    },
  });

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await http.get<Company[]>(endpoints.companies);
      return res.data;
    },
    enabled: isSuperuser,
  });

  const usersQuery = useQuery({
    queryKey: ["users", { search, roleFilter, activeFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.is_active = activeFilter;

      const res = await http.get<User[]>(endpoints.users, { params });
      return res.data;
    },
  });

  /* ================= Mutations ================= */

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const payload: Record<
        string,
        string | boolean | number | number[] | undefined
      > = {
        username: values.username,
        email: values.email ?? "",
        password: values.password,        
        is_active: values.is_active,
        role_ids: values.role_id ? [Number(values.role_id)] : [],
      };
      if (isSuperuser) {
        payload.company = values.company_id ? Number(values.company_id) : undefined;
      }
      const res = await http.post(endpoints.users, payload);
      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "User created",
        message: "تم إنشاء المستخدم بنجاح",        
      });
      setCreateOpened(false);
      createForm.reset(defaultCreateValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({
        title: "Create failed",
        message: String(err),
        color: "red",
      });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await http.post<Company>(endpoints.companies, { name });
      return res.data;
    },
    onSuccess: (company) => {
      notifications.show({
        title: "Company created",
        message: isArabic ? "تم إنشاء الشركة بنجاح" : "Company created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      createForm.setValue("company_id", String(company.id), {
        shouldValidate: true,
      });
      setCompanyModalOpen(false);
      setCompanyName("");
    },
    onError: (err: unknown) => {
      notifications.show({
        title: "Company creation failed",
        message: String(err),
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues) => {
      const payload: Record<string, string | boolean> = {
        username: values.username,
        email: values.email ?? "",
        is_active: values.is_active,
      };
      if (values.password) payload.password = values.password;

      await http.patch(`${endpoints.users}${values.id}/`, payload);
      if (!values.role_id) {
        throw new Error("Role is required / الدور مطلوب");
      }
      await http.post(`${endpoints.users}${values.id}/roles/`, {
        role_ids: [Number(values.role_id)],
      });
    },
    onSuccess: () => {
      notifications.show({ title: "User updated", message: "تم تحديث المستخدم" });
      setEditOpened(false);
      editForm.reset(defaultEditValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({
        title: "Update failed",
        message: String(err),
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`${endpoints.users}${id}/`);
    },
    onSuccess: () => {
      notifications.show({ title: "User deleted", message: "تم حذف المستخدم" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      notifications.show({
        title: "Delete failed",
        message: String(err),
        color: "red",
      });
    },
  });

  /* ================= Helpers ================= */

  const allowedRoleNames = useMemo(() => {
    if (isSuperuser) {
      return null;
    }
    const roleNames = new Set(
      (data?.roles ?? []).map((role) => role.name.toLowerCase())
    );
    if (roleNames.has("manager")) {
      return new Set(["manager", "hr", "accountant", "employee"]);      
    }
    if (roleNames.has("hr")) {
      return new Set(["accountant", "employee"]);
    }
    return new Set();
  }, [data?.roles, isSuperuser]);

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? []).map((role) => ({
        value: String(role.id),
        label: role.name,
      })),
    [rolesQuery.data]
  );

  const assignableRoleOptions = useMemo(
    () =>
      (rolesQuery.data ?? [])
        .filter((role) => {
          if (!allowedRoleNames) {
            return true;
          }
          if (allowedRoleNames.size === 0) {
            return false;
          }
          return allowedRoleNames.has(role.name.toLowerCase());
        })
        .map((role) => ({
          value: String(role.id),
          label: role.name,
        })),
    [allowedRoleNames, rolesQuery.data]
  );

  const companyOptions = useMemo(
    () =>
      (companiesQuery.data ?? []).map((company) => ({
        value: String(company.id),
        label: company.name,
      })),
    [companiesQuery.data]
  );

  function openEdit(user: User) {
    editForm.reset({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      password: "",
      is_active: user.is_active,
      role_id: user.roles && user.roles.length ? String(user.roles[0].id) : "",
    });
    setEditOpened(true);
  }

  function handleDelete(user: User) {
    if (!window.confirm(content.form.confirmDelete(user.username))) return;
    deleteMutation.mutate(user.id);
  }

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  const users = usersQuery.data ?? [];
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;

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
      {
        path: "/analytics/cash-forecast",
        label: content.nav.cashForecast,
        icon: "💡",
      },
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
    return navLinks.filter((link) => {
      if (!link.permissions || link.permissions.length === 0) {
        return true;
      }
      return link.permissions.some((permission) =>
        hasPermission(userPermissions, permission)
      );
    });
  }, [navLinks, userPermissions]);

  /* ================= UI ================= */

  return (
    <div
      className="dashboard-page users-page"
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
          <section className="hero-panel users-hero">
            <div className="users-hero__header">
              <div className="hero-panel__intro">
                <h1>{content.pageTitle}</h1>
                <p>{content.pageSubtitle}</p>
              </div>
              {canCreate && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    createForm.reset(defaultCreateValues);
                    setCreateOpened(true);
                  }}
                >
                  {content.createUser}
                </button>
              )}
            </div>

            <div className="hero-panel__stats">
              {[
                {
                  label: content.stats.totalUsers,
                  value: users.length,
                },
                {
                  label: content.stats.activeUsers,
                  value: activeUsers,
                },
                {
                  label: content.stats.inactiveUsers,
                  value: inactiveUsers,
                },
                {
                  label: content.stats.totalRoles,
                  value: roleOptions.length,
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

          <section className="panel users-panel">
            <div className="panel__header">
              <div>
                <h2>{content.filtersTitle}</h2>
                <p>{content.filtersSubtitle}</p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setRoleFilter(null);
                  setActiveFilter(null);
                }}
              >
                {content.clearFilters}
              </button>
            </div>

            <div className="users-filters">
              <label className="filter-field">
                <span>{content.roleFilter}</span>
                <select
                  value={roleFilter ?? ""}
                  onChange={(event) =>
                    setRoleFilter(event.target.value || null)
                  }
                >
                  <option value="">{content.rolePlaceholder}</option>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>{content.statusFilter}</span>
                <select
                  value={activeFilter ?? ""}
                  onChange={(event) =>
                    setActiveFilter(event.target.value || null)
                  }
                >
                  <option value="">{content.statusPlaceholder}</option>
                  <option value="true">{content.status.active}</option>
                  <option value="false">{content.status.inactive}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel users-panel">
            <div className="panel__header">
              <div>
                <h2>{content.table.title}</h2>
                <p>{content.table.subtitle}</p>
              </div>
              <span className="pill pill--accent">{users.length}</span>
            </div>

            {usersQuery.isLoading && (
              <div className="users-state users-state--loading">
                {content.table.loading}
              </div>
            )}
            {usersQuery.isError && (
              <div className="users-state users-state--error">
                {isArabic
                  ? "حصل خطأ أثناء تحميل المستخدمين."
                  : "Something went wrong while loading users."}
              </div>
            )}
            {!usersQuery.isLoading && users.length === 0 && (
              <div className="users-state">
                <strong>{content.table.emptyTitle}</strong>
                <span>{content.table.emptySubtitle}</span>
              </div>
            )}

            {users.length > 0 && (
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>{content.table.username}</th>
                      <th>{content.table.email}</th>
                      <th>{content.table.roles}</th>
                      <th>{content.table.active}</th>
                      <th>{content.table.created}</th>
                      <th>{content.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <strong>{user.username}</strong>
                            <span>{user.email || "-"}</span>
                          </div>
                        </td>
                        <td>{user.email || "-"}</td>
                        <td>
                          <div className="role-list">
                            {(user.roles ?? []).length === 0 ? (                              
                              <span className="role-pill role-pill--empty">
                                -
                              </span>
                            ) : (
                              (user.roles ?? []).map((role) => (                                
                                <span key={role.id} className="role-pill">
                                  {role.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-pill${
                              user.is_active ? " status-pill--active" : ""
                            }`}
                          >
                            {user.is_active
                              ? content.status.active
                              : content.status.inactive}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            if (!user.date_joined) {
                              return "-";
                            }
                            const parsedDate = new Date(user.date_joined);
                            if (Number.isNaN(parsedDate.getTime())) {
                              return "-";
                            }
                            return parsedDate.toLocaleDateString(
                              isArabic ? "ar-EG" : "en-GB"
                            );
                          })()}
                        </td>                        
                        <td>
                          <div className="table-actions">
                            {canEdit && (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={() => openEdit(user)}
                              >
                                {isArabic ? "تعديل" : "Edit"}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="ghost-button ghost-button--danger"
                                onClick={() => handleDelete(user)}
                              >
                                {isArabic ? "حذف" : "Delete"}
                              </button>
                            )}
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

      {/* Create Modal */}
      <Modal
        opened={createOpened}
        title={content.form.createTitle}
        centered
        onClose={() => {
          setCreateOpened(false);
          createForm.reset(defaultCreateValues);
        }}
      >
        <form
          onSubmit={createForm.handleSubmit((values: CreateFormValues) => {
            if (isSuperuser && !values.company_id) {
              createForm.setError("company_id", {
                type: "manual",
                message: isArabic
                  ? "الشركة مطلوبة لإنشاء المستخدم."
                  : "Company is required to create a user.",
              });
              return;
            }
            createMutation.mutate(values);
          })}
        >
          <Stack gap="md">
            <TextInput
              label={content.form.username}
              {...createForm.register("username")}
              error={createForm.formState.errors.username?.message}
              required
            />
            {isSuperuser && (
              <Controller
                control={createForm.control}
                name="company_id"
                render={({ field }) => (
                  <Stack gap="xs">
                    <Select
                      label={content.form.company}
                      placeholder={content.form.companyPlaceholder}
                      data={companyOptions}
                      value={field.value ?? null}
                      onChange={field.onChange}
                      error={createForm.formState.errors.company_id?.message}
                      required
                    />
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => setCompanyModalOpen(true)}
                    >
                      {content.form.createCompany}
                    </Button>
                  </Stack>
                )}
              />
            )}
            <TextInput
              label={content.form.email}
              {...createForm.register("email")}
              error={createForm.formState.errors.email?.message}
            />            
            <PasswordInput
              label={content.form.password}
              {...createForm.register("password")}
              error={createForm.formState.errors.password?.message}
              required
            />

            <Controller
              control={createForm.control}
              name="role_id"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreateFormValues, "role_id">;
              }) => (
                <Select
                  label={content.form.roles}
                  placeholder={content.form.rolesPlaceholder}
                  data={assignableRoleOptions}                  
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={createForm.control}
              name="is_active"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreateFormValues, "is_active">;
              }) => (
                <Switch
                  label={content.form.active}
                  checked={field.value}
                  onChange={(event) => field.onChange(event.currentTarget.checked)}
                />
              )}
            />

            <Group justify="flex-end">
              <Button type="submit" loading={createMutation.isPending}>
                {content.form.create}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={companyModalOpen}
        title={content.form.createCompany}
        centered
        onClose={() => setCompanyModalOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!companyName.trim()) {
              return;
            }
            createCompanyMutation.mutate(companyName.trim());
          }}
        >
          <Stack gap="md">
            <TextInput
              label={content.form.companyName}
              value={companyName}
              onChange={(event) => setCompanyName(event.currentTarget.value)}
              required
            />
            <Group justify="flex-end">
              <Button type="submit" loading={createCompanyMutation.isPending}>
                {content.form.createCompany}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editOpened}
        title={content.form.editTitle}
        centered
        onClose={() => {
          setEditOpened(false);
          editForm.reset(defaultEditValues);
        }}
      >
        <form
          onSubmit={editForm.handleSubmit((values: EditFormValues) =>
            updateMutation.mutate(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label={content.form.username}
              {...editForm.register("username")}
              error={editForm.formState.errors.username?.message}
              required
            />
            <TextInput
              label={content.form.email}
              {...editForm.register("email")}
              error={editForm.formState.errors.email?.message}
            />
            <PasswordInput
              label={content.form.passwordOptional}
              {...editForm.register("password")}
              error={editForm.formState.errors.password?.message}
            />

            <Controller
              control={editForm.control}
              name="role_id"
              render={({
                field,
              }: {
                field: ControllerRenderProps<EditFormValues, "role_id">;
              }) => (
                <Select
                  label={content.form.roles}
                  placeholder={content.form.rolesPlaceholder}
                  data={assignableRoleOptions}                  
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={editForm.control}
              name="is_active"
              render={({
                field,
              }: {
                field: ControllerRenderProps<EditFormValues, "is_active">;
              }) => (
                <Switch
                  label={content.form.active}
                  checked={field.value}
                  onChange={(event) => field.onChange(event.currentTarget.checked)}
                />
              )}
            />

            <Group justify="flex-end">
              <Button type="submit" loading={updateMutation.isPending}>
                {content.form.save}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}