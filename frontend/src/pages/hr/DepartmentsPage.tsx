import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { notifications } from "@mantine/notifications";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { isForbiddenError } from "../../shared/api/errors.ts";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type Department,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";
import { DashboardShell } from "../DashboardShell";
import "./DepartmentsPage.css";

type Language = "en" | "ar";

type PageCopy = {
  title: string;
  subtitle: string;
  helper: string;
  tags: string[];
};

type PageContent = {
  addDepartment: string;
  summaryTitle: string;
  summarySubtitle: string;
  summary: {
    total: string;
    active: string;
    inactive: string;
  };
  tableTitle: string;
  tableSubtitle: string;
  table: {
    name: string;
    status: string;
    actions: string;
    edit: string;
    delete: string;
    empty: string;
    loading: string;
  };
  status: {
    active: string;
    inactive: string;
  };
  form: {
    newTitle: string;
    editTitle: string;
    nameLabel: string;
    activeLabel: string;
    cancel: string;
    save: string;
  };
};

const headerCopy: Record<Language, PageCopy> = {
  en: {
    title: "Departments",
    subtitle: "Keep departments structured and ready for growth.",
    helper: "Manage visibility, status, and team organization.",
    tags: ["HR", "Organization"],
  },
  ar: {
    title: "الأقسام",
    subtitle: "نظّم الأقسام لتكون جاهزة للنمو.",
    helper: "تحكم في الحالة والرؤية وهيكلة الفرق.",
    tags: ["الموارد البشرية", "التنظيم"],
  },
};

const pageContent: Record<Language, PageContent> = {
  en: {
    addDepartment: "Add Department",
    summaryTitle: "Department overview",
    summarySubtitle: "Track how many departments are active and inactive.",
    summary: {
      total: "Total departments",
      active: "Active",
      inactive: "Inactive",
    },
    tableTitle: "Department directory",
    tableSubtitle: "Review status and manage each department.",
    table: {
      name: "Name",
      status: "Status",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      empty: "No departments yet.",
      loading: "Loading departments...",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
    },
    form: {
      newTitle: "New Department",
      editTitle: "Edit Department",
      nameLabel: "Department name",
      activeLabel: "Active department",
      cancel: "Cancel",
      save: "Save",
    },
  },
  ar: {
    addDepartment: "إضافة قسم",
    summaryTitle: "ملخص الأقسام",
    summarySubtitle: "تابع الأقسام النشطة وغير النشطة بسرعة.",
    summary: {
      total: "إجمالي الأقسام",
      active: "النشطة",
      inactive: "غير النشطة",
    },
    tableTitle: "دليل الأقسام",
    tableSubtitle: "راجع الحالة وادِر كل قسم بسهولة.",
    table: {
      name: "الاسم",
      status: "الحالة",
      actions: "الإجراءات",
      edit: "تعديل",
      delete: "حذف",
      empty: "لا توجد أقسام بعد.",
      loading: "جاري تحميل الأقسام...",
    },
    status: {
      active: "نشط",
      inactive: "غير نشط",
    },
    form: {
      newTitle: "قسم جديد",
      editTitle: "تعديل القسم",
      nameLabel: "اسم القسم",
      activeLabel: "قسم نشط",
      cancel: "إلغاء",
      save: "حفظ",
    },
  },
};

const departmentSchema = z.object({
  name: z.string().min(1, "اسم القسم مطلوب"),
  is_active: z.boolean(),
});

type DepartmentFormValues = z.input<typeof departmentSchema>;

const defaultValues: DepartmentFormValues = {
  name: "",
  is_active: true,
};

export function DepartmentsPage() {
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const departmentsQuery = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues,
  });
  const isActiveValue = useWatch({ control: form.control, name: "is_active" });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, is_active: editing.is_active });
    } else {
      form.reset(defaultValues);
    }
  }, [editing, form]);

  const summary = useMemo(() => {
    const departments = departmentsQuery.data ?? [];
    const active = departments.filter((department) => department.is_active).length;
    return {
      total: departments.length,
      active,
      inactive: departments.length - active,
    };
  }, [departmentsQuery.data]);

  if (isForbiddenError(departmentsQuery.error)) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: DepartmentFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: "Department updated",
          message: "تم تحديث القسم",
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: "Department created",
          message: "تم إنشاء القسم",
        });
      }
      setOpened(false);
      setEditing(null);
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: "Department deleted",
        message: "تم حذف القسم",
      });
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    }
  }

  function handleCloseModal() {
    setOpened(false);
    setEditing(null);
  }

  return (
    <DashboardShell
      copy={headerCopy}
      className="departments-page"
      actions={({ language }) => (
        <button
          type="button"
          className="action-button"
          onClick={() => setOpened(true)}
        >
          {pageContent[language].addDepartment}
        </button>
      )}
    >
      {({ language, isArabic }) => {
        const labels = pageContent[language];
        return (
          <>
            <section className="panel departments-summary">
              <div className="panel__header">
                <div>
                  <h2>{labels.summaryTitle}</h2>
                  <p className="helper-text">{labels.summarySubtitle}</p>
                </div>
              </div>
              <div className="departments-summary__grid">
                <div>
                  <span>{labels.summary.total}</span>
                  <strong>{summary.total}</strong>
                </div>
                <div>
                  <span>{labels.summary.active}</span>
                  <strong>{summary.active}</strong>
                </div>
                <div>
                  <span>{labels.summary.inactive}</span>
                  <strong>{summary.inactive}</strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{labels.tableTitle}</h2>
                  <p className="helper-text">{labels.tableSubtitle}</p>
                </div>
              </div>
              {departmentsQuery.isLoading ? (
                <p className="helper-text">{labels.table.loading}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{labels.table.name}</th>
                        <th>{labels.table.status}</th>
                        <th>{labels.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(departmentsQuery.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <span className="helper-text">{labels.table.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        (departmentsQuery.data ?? []).map((department) => (
                          <tr key={department.id}>
                            <td>{department.name}</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  department.is_active
                                    ? "status-pill--active"
                                    : "status-pill--inactive"
                                }`}
                              >
                                {department.is_active
                                  ? labels.status.active
                                  : labels.status.inactive}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-action"
                                  onClick={() => {
                                    setEditing(department);
                                    setOpened(true);
                                  }}
                                >
                                  {labels.table.edit}
                                </button>
                                <button
                                  type="button"
                                  className="table-action table-action--danger"
                                  onClick={() => handleDelete(department.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {labels.table.delete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {opened && (
              <div className="modal-backdrop" role="dialog" aria-modal="true">
                <div className="modal-card">
                  <div className="modal-header">
                    <h3>{editing ? labels.form.editTitle : labels.form.newTitle}</h3>
                    <button type="button" className="icon-button" onClick={handleCloseModal}>
                      ×
                    </button>
                  </div>
                  <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <div className="form-grid">
                      <label className="field field--full">
                        <span>{labels.form.nameLabel}</span>
                        <input
                          type="text"
                          required
                          {...form.register("name")}
                          dir={isArabic ? "rtl" : "ltr"}
                        />
                        {form.formState.errors.name?.message && (
                          <span className="helper-text helper-text--error">
                            {form.formState.errors.name?.message}
                          </span>
                        )}
                      </label>
                      <label className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={Boolean(isActiveValue)}
                          onChange={(event) =>
                            form.setValue("is_active", event.currentTarget.checked)
                          }
                        />
                        <span>{labels.form.activeLabel}</span>
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={handleCloseModal}
                      >
                        {labels.form.cancel}
                      </button>
                      <button
                        type="submit"
                        className="action-button"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {labels.form.save}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}