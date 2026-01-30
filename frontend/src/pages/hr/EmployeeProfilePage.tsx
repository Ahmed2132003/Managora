import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, Modal, NumberInput, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { env } from "../../shared/config/env.ts";
import { isForbiddenError } from "../../shared/api/errors.ts";
import {
  useCreateEmployee,
  useCreateJobTitle,
  useCreateShift,
  useDepartments,
  useEmployee,
  useEmployeeDefaults,
  useEmployeeDocuments,
  useEmployeeSelectableUsers,
  useEmployees,
  useJobTitles,
  useShifts,
  useUpdateEmployee,
  useUploadEmployeeDocument,
  useDeleteEmployeeDocument,
  type EmployeeStatus,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";
import { endpoints } from "../../shared/api/endpoints.ts";
import { DashboardShell } from "../DashboardShell.tsx";
import "../DashboardPage.css";
import "./EmployeeProfilePage.css";

type Language = "en" | "ar";

type PageContent = {
  title: string;
  subtitle: string;
  helper: string;
  tabs: {
    basic: string;
    job: string;
    documents: string;
  };
  section: {
    basicTitle: string;
    basicSubtitle: string;
    jobTitle: string;
    jobSubtitle: string;
    documentsTitle: string;
    documentsSubtitle: string;
  };
  fields: {
    employeeCode: string;
    fullName: string;
    nationalId: string;
    jobTitle: string;
    hireDate: string;
    status: string;
    manager: string;
    user: string;
    userPlaceholder: string;
    userEmpty: string;
    shift: string;
    department: string;
  };
  buttons: {
    addJobTitle: string;
    addShift: string;
    save: string;
    back: string;
    upload: string;
    download: string;
    delete: string;
    cancel: string;
  };
  documents: {
    docType: string;
    title: string;
    file: string;
    placeholder: string;
    loading: string;
    empty: string;
    uploaded: string;
    actions: string;
    saveHint: string;
  };
  status: {
    active: string;
    inactive: string;
    terminated: string;
  };
  modals: {
    jobTitle: string;
    jobTitleName: string;
    shift: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    graceMinutes: string;
  };
  statusBadge: {
    active: string;
    inactive: string;
    terminated: string;
  };
};

const pageCopy: Record<Language, PageContent> = {
  en: {
    title: "Employee profile",
    subtitle: "Maintain employee identity, assignments, and documents in one place.",
    helper: "Complete the required fields and link a company user account.",
    tabs: { basic: "Basic info", job: "Job", documents: "Documents" },
    section: {
      basicTitle: "Employee basics",
      basicSubtitle: "Core details for the employee record.",
      jobTitle: "Job assignment",
      jobSubtitle: "Department and manager details.",
      documentsTitle: "Documents",
      documentsSubtitle: "Upload contracts, IDs, and certificates.",
    },
    fields: {
      employeeCode: "Employee code",
      fullName: "Full name",
      nationalId: "National ID",
      jobTitle: "Job title",
      hireDate: "Hire date",
      status: "Status",
      manager: "Manager",
      user: "User",
      userPlaceholder: "Select a company user",
      userEmpty: "No users found",
      shift: "Shift",
      department: "Department",
    },
    buttons: {
      addJobTitle: "Add job title",
      addShift: "Add shift",
      save: "Save",
      back: "Back to list",
      upload: "Upload",
      download: "Download",
      delete: "Delete",
      cancel: "Cancel",
    },
    documents: {
      docType: "Document type",
      title: "Title",
      file: "File",
      placeholder: "Select file",
      loading: "Loading documents...",
      empty: "No documents yet.",
      uploaded: "Uploaded",
      actions: "Actions",
      saveHint: "Save the employee first to add documents.",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
    modals: {
      jobTitle: "Create job title",
      jobTitleName: "Job title name",
      shift: "Create shift",
      shiftName: "Shift name",
      startTime: "Start time",
      endTime: "End time",
      graceMinutes: "Grace minutes",
    },
    statusBadge: {
      active: "Active",
      inactive: "Inactive",
      terminated: "Terminated",
    },
  },
  ar: {
    title: "ملف الموظف",
    subtitle: "إدارة بيانات الموظف وتعييناته ومستنداته من مكان واحد.",
    helper: "املأ الحقول المطلوبة واربط حساب المستخدم بالشركة.",
    tabs: { basic: "البيانات الأساسية", job: "الوظيفة", documents: "المستندات" },
    section: {
      basicTitle: "بيانات الموظف الأساسية",
      basicSubtitle: "التفاصيل الرئيسية لسجل الموظف.",
      jobTitle: "تعيين الوظيفة",
      jobSubtitle: "بيانات الإدارة والمدير المباشر.",
      documentsTitle: "المستندات",
      documentsSubtitle: "رفع العقود والهوية والشهادات.",
    },
    fields: {
      employeeCode: "كود الموظف",
      fullName: "الاسم بالكامل",
      nationalId: "الرقم القومي",
      jobTitle: "المسمى الوظيفي",
      hireDate: "تاريخ التعيين",
      status: "الحالة",
      manager: "المدير",
      user: "المستخدم",
      userPlaceholder: "اختر مستخدم الشركة",
      userEmpty: "لا يوجد مستخدمون",
      shift: "الشيفت",
      department: "القسم",
    },
    buttons: {
      addJobTitle: "إضافة مسمى وظيفي",
      addShift: "إضافة شيفت",
      save: "حفظ",
      back: "رجوع للقائمة",
      upload: "رفع",
      download: "تنزيل",
      delete: "حذف",
      cancel: "إلغاء",
    },
    documents: {
      docType: "نوع المستند",
      title: "العنوان",
      file: "الملف",
      placeholder: "اختر ملف",
      loading: "جاري تحميل المستندات...",
      empty: "لا توجد مستندات بعد.",
      uploaded: "تاريخ الرفع",
      actions: "الإراءات",
      saveHint: "احفظ الموظف أولاً لإضافة مستندات.",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي الخدمة",
    },
    modals: {
      jobTitle: "إنشاء مسمى وظيفي",
      jobTitleName: "اسم المسمى الوظيفي",
      shift: "إنشاء شيفت",
      shiftName: "اسم الشيفت",
      startTime: "وقت البداية",
      endTime: "وقت النهاية",
      graceMinutes: "دقائق السماح",
    },
    statusBadge: {
      active: "نشط",
      inactive: "غير نشط",
      terminated: "منتهي الخدمة",
    },
  },
};

const employeeSchema = z.object({
  employee_code: z.string().min(1, "الكود مطلوب"),
  full_name: z.string().min(1, "الاسم مطلوب"),
  national_id: z.string().optional().or(z.literal("")),
  hire_date: z.string().min(1, "تاريخ التعيين مطلوب"),
  status: z.enum(["active", "inactive", "terminated"]),
  department_id: z.string().nullable().optional(),
  job_title_id: z.string().nullable().optional(),
  manager_id: z.string().nullable().optional(),
  user_id: z.string().min(1, "المستخدم مطلوب"),
  shift_id: z.string().nullable().optional(),
});

type EmployeeFormValues = z.input<typeof employeeSchema>;

const employeeDefaults: EmployeeFormValues = {
  employee_code: "",
  full_name: "",
  national_id: "",
  hire_date: "",
  status: "active",
  department_id: null,
  job_title_id: null,
  manager_id: null,
  user_id: "",
  shift_id: null,
};

const documentSchema = z.object({
  doc_type: z.string().min(1, "نوع المستند مطلوب"),
  title: z.string().min(1, "العنوان مطلوب"),
  file: z
    .custom<File | null>()
    .refine((value) => value instanceof File, { message: "الملف مطلوب" }),
});

type DocumentFormValues = {
  doc_type: string;
  title: string;
  file: File | null;
};

const documentDefaults: DocumentFormValues = {
  doc_type: "",
  title: "",
  file: null,
};

const statusOptionsByLanguage: Record<Language, { value: EmployeeStatus; label: string }[]> = {
  en: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "terminated", label: "Terminated" },
  ],
  ar: [
    { value: "active", label: "نشط" },
    { value: "inactive", label: "غير نشط" },
    { value: "terminated", label: "منتهي الخدمة" },
  ],
};

const jobTitleSchema = z.object({
  name: z.string().min(1, "المسمى الوظيفي مطلوب"),
});

type JobTitleFormValues = z.input<typeof jobTitleSchema>;

const jobTitleDefaults: JobTitleFormValues = {
  name: "",
};

const shiftSchema = z.object({
  name: z.string().min(1, "اسم الشيفت مطلوب"),
  start_time: z.string().min(1, "وقت البداية مطلوب"),
  end_time: z.string().min(1, "وقت النهاية مطلوب"),
  grace_minutes: z.number().min(0, "الدقائق مطلوبة"),
});

type ShiftFormValues = z.input<typeof shiftSchema>;

const shiftDefaults: ShiftFormValues = {
  name: "",
  start_time: "09:00",
  end_time: "17:00",
  grace_minutes: 0,
};

export function EmployeeProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const isNew = params.id === "new";
  const parsedId = !isNew && params.id ? Number(params.id) : null;
  const employeeId = parsedId && !Number.isNaN(parsedId) ? parsedId : null;
  const [jobTitleModalOpen, setJobTitleModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "job" | "documents">("basic");

  const employeeQuery = useEmployee(employeeId);
  const departmentsQuery = useDepartments();
  const jobTitlesQuery = useJobTitles();
  const shiftsQuery = useShifts();
  const defaultsQuery = useEmployeeDefaults();
  const selectableUsersQuery = useEmployeeSelectableUsers();
  const managersQuery = useEmployees({ search: "", page: 1, filters: {} });
  const documentsQuery = useEmployeeDocuments(employeeId);

  const createEmployeeMutation = useCreateEmployee();
  const createJobTitleMutation = useCreateJobTitle();
  const createShiftMutation = useCreateShift();
  const updateEmployeeMutation = useUpdateEmployee();
  const uploadDocumentMutation = useUploadEmployeeDocument();
  const deleteDocumentMutation = useDeleteEmployeeDocument();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employeeDefaults,
  });

  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: documentDefaults,
  });

  const jobTitleForm = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaults,
  });

  const shiftForm = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: shiftDefaults,
  });

  const userSelectDisabled =
    selectableUsersQuery.isLoading || (selectableUsersQuery.data ?? []).length === 0;

  useEffect(() => {
    if (employeeQuery.data && !isNew) {
      form.reset({
        employee_code: employeeQuery.data.employee_code,
        full_name: employeeQuery.data.full_name,
        national_id: employeeQuery.data.national_id ?? "",
        hire_date: employeeQuery.data.hire_date,
        status: employeeQuery.data.status,
        department_id: employeeQuery.data.department
          ? String(employeeQuery.data.department.id)
          : null,
        job_title_id: employeeQuery.data.job_title
          ? String(employeeQuery.data.job_title.id)
          : null,
        manager_id: employeeQuery.data.manager ? String(employeeQuery.data.manager.id) : null,
        user_id: employeeQuery.data.user ? String(employeeQuery.data.user) : "",
        shift_id: employeeQuery.data.shift ? String(employeeQuery.data.shift.id) : null,
      });
    }
  }, [employeeQuery.data, form, isNew]);

  useEffect(() => {
    if (!isNew || !defaultsQuery.data) {
      return;
    }
    if (defaultsQuery.data.manager) {
      form.setValue("manager_id", String(defaultsQuery.data.manager.id));
    }
    if (defaultsQuery.data.shift) {
      form.setValue("shift_id", String(defaultsQuery.data.shift.id));
    }
  }, [defaultsQuery.data, form, isNew]);

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })),
    [departmentsQuery.data]
  );

  const jobTitleOptions = useMemo(
    () =>
      (jobTitlesQuery.data ?? []).map((job) => ({
        value: String(job.id),
        label: job.name,
      })),
    [jobTitlesQuery.data]
  );

  const shiftOptions = useMemo(
    () =>
      (shiftsQuery.data ?? []).map((shift) => ({
        value: String(shift.id),
        label: `${shift.name} (${shift.start_time} - ${shift.end_time})`,
      })),
    [shiftsQuery.data]
  );

  const selectableUserOptions = useMemo(
    () =>
      (selectableUsersQuery.data ?? []).map((user) => ({
        value: String(user.id),
        label: user.email
          ? `${user.username} (${user.email})`
          : `${user.username}`,
      })),
    [selectableUsersQuery.data]
  );

  const managerOptions = useMemo(
    () =>
      (managersQuery.data ?? [])
        .filter((manager) => manager.id !== employeeId)
        .map((manager) => ({
          value: String(manager.id),
          label: manager.full_name,
        })),
    [employeeId, managersQuery.data]
  );

  const showAccessDenied =
    isForbiddenError(employeeQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(jobTitlesQuery.error) ||
    isForbiddenError(shiftsQuery.error) ||
    isForbiddenError(defaultsQuery.error) ||
    isForbiddenError(selectableUsersQuery.error) ||
    isForbiddenError(managersQuery.error) ||
    isForbiddenError(documentsQuery.error);

  const shellCopy = useMemo(
    () => ({
      en: {
        title: isNew ? "New employee" : pageCopy.en.title,
        subtitle: pageCopy.en.subtitle,        
        helper: pageCopy.en.helper,
      },
      ar: {
        title: isNew ? "موظف جديد" : pageCopy.ar.title,
        subtitle: pageCopy.ar.subtitle,
        helper: pageCopy.ar.helper,
      },
    }),
    [isNew]
  );

  if (showAccessDenied) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: EmployeeFormValues) {
    const payload = {
      employee_code: values.employee_code,
      full_name: values.full_name,
      national_id: values.national_id || null,
      hire_date: values.hire_date,
      status: values.status as EmployeeStatus,
      department: values.department_id ? Number(values.department_id) : null,
      job_title: values.job_title_id ? Number(values.job_title_id) : null,
      manager: values.manager_id ? Number(values.manager_id) : null,
      user: values.user_id ? Number(values.user_id) : null,
      shift: values.shift_id ? Number(values.shift_id) : null,
    };

    try {
      if (isNew) {
        const created = await createEmployeeMutation.mutateAsync(payload);
        notifications.show({
          title: "Employee created",
          message: "تم إنشاء الموظف بنجاح",
        });
        navigate(`/hr/employees/${created.id}`);
      } else if (employeeId) {
        await updateEmployeeMutation.mutateAsync({ id: employeeId, payload });
        notifications.show({
          title: "Employee updated",
          message: "تم تحديث بيانات الموظف",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDocumentSubmit(values: DocumentFormValues) {
    if (!employeeId) return;
    if (!values.file) {
      documentForm.setError("file", { message: "الملف مطلوب" });
      return;
    }
    try {
      await uploadDocumentMutation.mutateAsync({
        employeeId,
        doc_type: values.doc_type,
        title: values.title,
        file: values.file,
      });
      notifications.show({
        title: "Document uploaded",
        message: "تم رفع المستند بنجاح",
      });
      documentForm.reset(documentDefaults);
      documentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDeleteDocument(documentId: number) {
    try {
      await deleteDocumentMutation.mutateAsync(documentId);
      notifications.show({
        title: "Document deleted",
        message: "تم حذف المستند",
      });
      documentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleCreateJobTitle(values: JobTitleFormValues) {
    try {
      const created = await createJobTitleMutation.mutateAsync({
        name: values.name,
        is_active: true,
      });

      notifications.show({
        title: "Job title created",
        message: "تم إنشاء المسمى الوظيفي",
      });
      jobTitlesQuery.refetch();
      form.setValue("job_title_id", String(created.id));
      jobTitleForm.reset(jobTitleDefaults);
      setJobTitleModalOpen(false);
    } catch (error) {
      notifications.show({
        title: "Create failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleCreateShift(values: ShiftFormValues) {
    try {
      const created = await createShiftMutation.mutateAsync(values);
      notifications.show({
        title: "Shift created",
        message: "تم إنشاء الشيفت",
      });
      shiftsQuery.refetch();
      form.setValue("shift_id", String(created.id));
      shiftForm.reset(shiftDefaults);
      setShiftModalOpen(false);
    } catch (error) {
      notifications.show({
        title: "Create failed",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <DashboardShell copy={shellCopy} className="employee-profile-page">
      {({ language, isArabic }) => {
        const content = pageCopy[language];
        const statusOptions = statusOptionsByLanguage[language];
        const userOptions =
          selectableUserOptions.length > 0
            ? selectableUserOptions
            : [{ value: "", label: content.fields.userEmpty }];
        return (
          <div className="employee-profile">
            <section className="panel employee-profile__panel">
              <div className="panel__header">
                <div>
                  <h2>{content.section.basicTitle}</h2>
                  <p>{content.section.basicSubtitle}</p>
                </div>
                {!isNew && employeeQuery.data && (
                  <span className="status-pill" data-status={employeeQuery.data.status}>
                    {content.statusBadge[employeeQuery.data.status] ?? employeeQuery.data.status}
                  </span>
                )}
              </div>

              <form className="employee-profile__form" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="employee-profile__tabs" role="tablist">
                  <button
                    type="button"
                    className={`tab-button${activeTab === "basic" ? " tab-button--active" : ""}`}
                    onClick={() => setActiveTab("basic")}
                    role="tab"
                    aria-selected={activeTab === "basic"}
                  >
                    {content.tabs.basic}
                  </button>
                  <button
                    type="button"
                    className={`tab-button${activeTab === "job" ? " tab-button--active" : ""}`}
                    onClick={() => setActiveTab("job")}
                    role="tab"
                    aria-selected={activeTab === "job"}
                  >
                    {content.tabs.job}
                  </button>
                  <button
                    type="button"
                    className={`tab-button${activeTab === "documents" ? " tab-button--active" : ""}`}
                    onClick={() => setActiveTab("documents")}
                    role="tab"
                    aria-selected={activeTab === "documents"}
                    disabled={isNew}
                  >
                    {content.tabs.documents}
                  </button>
                </div>

                {activeTab === "basic" && (
                  <div className="employee-profile__grid">
                    <label className="form-field">
                      <span>
                        {content.fields.employeeCode} <span className="required">*</span>
                      </span>
                      <input
                        type="text"
                        {...form.register("employee_code")}
                        required
                        aria-invalid={Boolean(form.formState.errors.employee_code)}
                      />
                      {form.formState.errors.employee_code?.message && (
                        <span className="field-error">
                          {form.formState.errors.employee_code?.message}
                        </span>
                      )}
                    </label>
                    <label className="form-field">
                      <span>
                        {content.fields.fullName} <span className="required">*</span>
                      </span>
                      <input
                        type="text"
                        {...form.register("full_name")}
                        required
                        aria-invalid={Boolean(form.formState.errors.full_name)}
                      />
                      {form.formState.errors.full_name?.message && (
                        <span className="field-error">
                          {form.formState.errors.full_name?.message}
                        </span>
                      )}
                    </label>
                    <label className="form-field">
                      <span>{content.fields.nationalId}</span>
                      <input
                        type="text"
                        {...form.register("national_id")}
                        aria-invalid={Boolean(form.formState.errors.national_id)}
                      />
                      {form.formState.errors.national_id?.message && (
                        <span className="field-error">
                          {form.formState.errors.national_id?.message}
                        </span>
                      )}
                    </label>
                    <div className="form-field form-field--inline">
                      <Controller
                        name="job_title_id"
                        control={form.control}
                        render={({ field }) => (
                          <>
                            <label>
                              <span>{content.fields.jobTitle}</span>
                              <select
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  field.onChange(event.target.value || null)
                                }
                              >
                                <option value="">{isArabic ? "اختر المسمى" : "Select job title"}</option>
                                {jobTitleOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => setJobTitleModalOpen(true)}
                            >
                              {content.buttons.addJobTitle}
                            </button>
                          </>
                        )}
                      />
                    </div>
                    <div className="form-field form-field--row">
                      <label>
                        <span>
                          {content.fields.hireDate} <span className="required">*</span>
                        </span>
                        <input
                          type="date"
                          {...form.register("hire_date")}
                          required
                          aria-invalid={Boolean(form.formState.errors.hire_date)}
                        />
                        {form.formState.errors.hire_date?.message && (
                          <span className="field-error">
                            {form.formState.errors.hire_date?.message}
                          </span>
                        )}
                      </label>
                      <Controller
                        name="status"
                        control={form.control}
                        render={({ field }) => (
                          <label>
                            <span>
                              {content.fields.status} <span className="required">*</span>
                            </span>
                            <select
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              required
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {form.formState.errors.status?.message && (
                              <span className="field-error">
                                {form.formState.errors.status?.message}
                              </span>
                            )}
                          </label>
                        )}
                      />
                    </div>
                    <Controller
                      name="manager_id"
                      control={form.control}
                      render={({ field }) => (
                        <label className="form-field">
                          <span>{content.fields.manager}</span>
                          <select
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value || null)
                            }
                          >
                            <option value="">
                              {isArabic ? "اختر المدير" : "Select manager"}
                            </option>
                            {managerOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    />
                    <Controller
                      name="user_id"
                      control={form.control}
                      render={({ field }) => (
                        <label className="form-field">
                          <span>
                            {content.fields.user} <span className="required">*</span>
                          </span>
                          <select
                            value={field.value ?? ""}
                            onChange={(event) => field.onChange(event.target.value)}
                            required
                            disabled={userSelectDisabled}
                          >
                            <option value="">{content.fields.userPlaceholder}</option>
                            {userOptions.map((option) => (
                              <option key={option.value || option.label} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {form.formState.errors.user_id?.message && (
                            <span className="field-error">
                              {form.formState.errors.user_id?.message}
                            </span>
                          )}
                        </label>
                      )}
                    />
                    <div className="form-field form-field--inline">
                      <Controller
                        name="shift_id"
                        control={form.control}
                        render={({ field }) => (
                          <>
                            <label>
                              <span>{content.fields.shift}</span>
                              <select
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  field.onChange(event.target.value || null)
                                }
                              >
                                <option value="">
                                  {isArabic ? "اختر الشيفت" : "Select shift"}
                                </option>
                                {shiftOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => setShiftModalOpen(true)}
                            >
                              {content.buttons.addShift}
                            </button>
                          </>
                        )}
                      />
                    </div>
                  </div>
                )}

                {activeTab === "job" && (
                  <section className="panel employee-profile__subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{content.section.jobTitle}</h2>
                        <p>{content.section.jobSubtitle}</p>
                      </div>
                    </div>
                    <div className="employee-profile__grid">
                      <Controller
                        name="department_id"
                        control={form.control}
                        render={({ field }) => (
                          <label className="form-field">
                            <span>{content.fields.department}</span>
                            <select
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(event.target.value || null)
                              }
                            >
                              <option value="">
                                {isArabic ? "اختر القسم" : "Select department"}
                              </option>
                              {departmentOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      />
                    </div>
                  </section>
                )}

                {activeTab === "documents" && (
                  <section className="panel employee-profile__subpanel">
                    <div className="panel__header">
                      <div>
                        <h2>{content.section.documentsTitle}</h2>
                        <p>{content.section.documentsSubtitle}</p>
                      </div>
                    </div>
                    {!employeeId ? (
                      <p className="helper-text">{content.documents.saveHint}</p>
                    ) : (
                      <div className="employee-documents">
                        <div className="employee-documents__form">
                          <Controller
                            name="doc_type"
                            control={documentForm.control}
                            render={({ field }) => (
                              <label className="form-field">
                                <span>
                                  {content.documents.docType} <span className="required">*</span>
                                </span>
                                <input
                                  type="text"
                                  {...field}
                                  aria-invalid={Boolean(documentForm.formState.errors.doc_type)}
                                />
                                {documentForm.formState.errors.doc_type?.message && (
                                  <span className="field-error">
                                    {documentForm.formState.errors.doc_type?.message}
                                  </span>
                                )}
                              </label>
                            )}
                          />
                          <Controller
                            name="title"
                            control={documentForm.control}
                            render={({ field }) => (
                              <label className="form-field">
                                <span>
                                  {content.documents.title} <span className="required">*</span>
                                </span>
                                <input
                                  type="text"
                                  {...field}
                                  aria-invalid={Boolean(documentForm.formState.errors.title)}
                                />
                                {documentForm.formState.errors.title?.message && (
                                  <span className="field-error">
                                    {documentForm.formState.errors.title?.message}
                                  </span>
                                )}
                              </label>
                            )}
                          />
                          <Controller
                            name="file"
                            control={documentForm.control}
                            render={({ field }) => {
                              const { onChange, ...rest } = field;                              
                              return (
                                <label className="form-field">
                                  <span>
                                    {content.documents.file} <span className="required">*</span>
                                  </span>
                                  <input
                                    type="file"
                                    {...rest}
                                    onChange={(event) =>
                                      onChange(event.target.files?.[0] ?? null)
                                    }
                                  />
                                  {documentForm.formState.errors.file?.message && (
                                    <span className="field-error">
                                      {documentForm.formState.errors.file?.message}
                                    </span>
                                  )}
                                </label>
                              );
                            }}
                          />
                          <button
                            type="button"
                            className="primary-button"
                            onClick={documentForm.handleSubmit(handleDocumentSubmit)}
                            disabled={uploadDocumentMutation.isPending}
                          >
                            {content.buttons.upload}
                          </button>
                        </div>
                        <div className="employee-documents__list">
                          {documentsQuery.isLoading ? (
                            <p className="helper-text">{content.documents.loading}</p>
                          ) : (documentsQuery.data ?? []).length === 0 ? (
                            <p className="helper-text">{content.documents.empty}</p>
                          ) : (
                            <div className="employees-table-wrapper">
                              <table className="employees-table">
                                <thead>
                                  <tr>
                                    <th>{content.documents.title}</th>
                                    <th>{content.documents.docType}</th>
                                    <th>{content.documents.uploaded}</th>
                                    <th>{content.documents.actions}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(documentsQuery.data ?? []).map((doc) => (
                                    <tr key={doc.id}>
                                      <td>{doc.title}</td>
                                      <td>{doc.doc_type}</td>
                                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                      <td>
                                        <div className="table-actions">
                                          <a
                                            className="ghost-button"
                                            href={`${env.API_BASE_URL}${endpoints.hr.documentDownload(doc.id)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {content.buttons.download}
                                          </a>
                                          <button
                                            type="button"
                                            className="ghost-button ghost-button--danger"
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            disabled={deleteDocumentMutation.isPending}
                                          >
                                            {content.buttons.delete}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                <div className="employee-profile__actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                  >
                    {content.buttons.save}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => navigate("/hr/employees")}
                  >
                    {content.buttons.back}
                  </button>
                </div>
              </form>
            </section>

            <Modal
              opened={jobTitleModalOpen}
              onClose={() => setJobTitleModalOpen(false)}
              title={content.modals.jobTitle}
              centered
            >
              <Stack>
                <Controller
                  name="name"
                  control={jobTitleForm.control}
                  render={({ field }) => (
                    <TextInput
                      label={content.modals.jobTitleName}
                      required
                      {...field}
                      error={jobTitleForm.formState.errors.name?.message}
                    />
                  )}
                />
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={() => setJobTitleModalOpen(false)}>
                    {content.buttons.cancel}
                  </Button>
                  <Button
                    onClick={jobTitleForm.handleSubmit(handleCreateJobTitle)}
                    loading={createJobTitleMutation.isPending}
                  >
                    {content.buttons.save}
                  </Button>
                </Group>
              </Stack>
            </Modal>

            <Modal
              opened={shiftModalOpen}
              onClose={() => setShiftModalOpen(false)}
              title={content.modals.shift}
              centered
            >
              <Stack>
                <Controller
                  name="name"
                  control={shiftForm.control}
                  render={({ field }) => (
                    <TextInput
                      label={content.modals.shiftName}
                      required
                      {...field}
                      error={shiftForm.formState.errors.name?.message}
                    />
                  )}
                />
                <Group grow>
                  <Controller
                    name="start_time"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TextInput
                        label={content.modals.startTime}
                        type="time"
                        required
                        {...field}
                        error={shiftForm.formState.errors.start_time?.message}
                      />
                    )}
                  />
                  <Controller
                    name="end_time"
                    control={shiftForm.control}
                    render={({ field }) => (
                      <TextInput
                        label={content.modals.endTime}
                        type="time"
                        required
                        {...field}
                        error={shiftForm.formState.errors.end_time?.message}
                      />
                    )}
                  />
                </Group>
                <Controller
                  name="grace_minutes"
                  control={shiftForm.control}
                  render={({ field }) => (
                    <NumberInput
                      label={content.modals.graceMinutes}
                      min={0}
                      required
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? 0)}
                      error={shiftForm.formState.errors.grace_minutes?.message}
                    />
                  )}
                />
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={() => setShiftModalOpen(false)}>
                    {content.buttons.cancel}
                  </Button>
                  <Button
                    onClick={shiftForm.handleSubmit(handleCreateShift)}
                    loading={createShiftMutation.isPending}
                  >
                    {content.buttons.save}
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </div>
        );
      }}
    </DashboardShell>
  );
}
