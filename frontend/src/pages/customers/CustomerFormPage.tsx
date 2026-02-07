import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { notifications } from "@mantine/notifications";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useCreateCustomer,
  useCustomer,
  useUpdateCustomer,
  type CustomerPayload,
} from "../../shared/customers/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./CustomerFormPage.css";

const customerSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  credit_limit: z.number().min(0).nullable().optional(),
  payment_terms_days: z.number().min(0, "Payment terms must be 0 or more"),
  is_active: z.boolean(),
});

type CustomerFormValues = z.input<typeof customerSchema>;

const defaultValues: CustomerFormValues = {
  code: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  credit_limit: null,
  payment_terms_days: 0,
  is_active: true,
};

export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const customerQuery = useCustomer(id);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isEditing) {
      form.reset(defaultValues);
      return;
    }
    if (customerQuery.data) {
      form.reset({
        code: customerQuery.data.code,
        name: customerQuery.data.name,
        email: customerQuery.data.email ?? "",
        phone: customerQuery.data.phone ?? "",
        address: customerQuery.data.address ?? "",
        credit_limit: customerQuery.data.credit_limit
          ? Number(customerQuery.data.credit_limit)
          : null,
        payment_terms_days: customerQuery.data.payment_terms_days,
        is_active: customerQuery.data.is_active,
      });
    }
  }, [customerQuery.data, form, isEditing]);

  const headerCopy = {
    en: {
      title: isEditing ? "Edit customer" : "New customer",
      subtitle: "Capture customer details, billing preferences, and status.",
      helper: "Keep records accurate to speed up invoicing and collections.",
      tags: ["Customers", "Setup"],
    },
    ar: {
      title: isEditing ? "تعديل عميل" : "عميل جديد",
      subtitle: "سجّل بيانات العميل وتفضيلات الدفع وحالة الحساب.",
      helper: "حافظ على دقة البيانات لتسريع الفوترة والتحصيلات.",
      tags: ["العملاء", "الإعداد"],
    },
  };

  const pageCopy = {
    en: {
      back: "Back to Customers",
      sections: {
        details: "Customer details",
        detailsSubtitle: "Update the core profile and contact details.",
        finance: "Billing settings",
        financeSubtitle: "Control credit limits and payment terms.",
      },
      fields: {
        code: "Code",
        name: "Name",
        email: "Email",
        phone: "Phone",
        address: "Address",
        creditLimit: "Credit Limit",
        paymentTerms: "Payment terms (days)",
        active: "Active",
      },
      placeholders: {
        code: "CUST-0001",
        name: "Customer name",
        email: "customer@email.com",
        phone: "+20 1XX XXX XXXX",
        address: "Customer address",
      },
      actions: {
        save: "Save",
      },
    },
    ar: {
      back: "العودة إلى العملاء",
      sections: {
        details: "بيانات العميل",
        detailsSubtitle: "حدّث الملف الأساسي وبيانات التواصل.",
        finance: "إعدادات الفوترة",
        financeSubtitle: "تحكّم في حد الائتمان وشروط الدفع.",
      },
      fields: {
        code: "الكود",
        name: "الاسم",
        email: "البريد الإلكتروني",
        phone: "الهاتف",
        address: "العنوان",
        creditLimit: "حد الائتمان",
        paymentTerms: "مدة السداد (أيام)",
        active: "نشط",
      },
      placeholders: {
        code: "CUST-0001",
        name: "اسم العميل",
        email: "customer@email.com",
        phone: "+20 1XX XXX XXXX",
        address: "عنوان العميل",
      },
      actions: {
        save: "حفظ",
      },
    },
  };

  if (isForbiddenError(customerQuery.error)) {
    return (
      <DashboardShell copy={headerCopy} className="customer-form-page">
        {() => <AccessDenied />}
      </DashboardShell>
    );
  }

  async function handleSubmit(values: CustomerFormValues) {
    const payload: CustomerPayload = {
      code: values.code.trim(),
      name: values.name.trim(),
      email: values.email ? values.email.trim() : null,
      phone: values.phone ? values.phone.trim() : null,
      address: values.address ? values.address.trim() : null,
      credit_limit:
        typeof values.credit_limit === "number"
          ? values.credit_limit.toFixed(2)
          : null,
      payment_terms_days: values.payment_terms_days,
      is_active: values.is_active,
    };

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id: Number(id), payload });
        notifications.show({ title: "Customer updated", message: "تم تحديث العميل" });
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({ title: "Customer created", message: "تم إنشاء العميل" });
      }
      navigate("/customers");
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <DashboardShell
      copy={headerCopy}
      className="customer-form-page"
      actions={({ language }) => (
        <button
          type="button"
          className="action-button action-button--ghost"
          onClick={() => navigate("/customers")}
        >
          {pageCopy[language].back}
        </button>
      )}
    >
      {({ language }) => {
        const copy = pageCopy[language];

        return (
          <form
            className="customer-form"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.sections.details}</h2>
                  <p>{copy.sections.detailsSubtitle}</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>{copy.fields.code}</span>
                  <input
                    type="text"
                    placeholder={copy.placeholders.code}
                    required
                    {...form.register("code")}
                  />
                  {form.formState.errors.code?.message && (
                    <span className="field-error">
                      {form.formState.errors.code?.message}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{copy.fields.name}</span>
                  <input
                    type="text"
                    placeholder={copy.placeholders.name}
                    required
                    {...form.register("name")}
                  />
                  {form.formState.errors.name?.message && (
                    <span className="field-error">
                      {form.formState.errors.name?.message}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{copy.fields.email}</span>
                  <input
                    type="email"
                    placeholder={copy.placeholders.email}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email?.message && (
                    <span className="field-error">
                      {form.formState.errors.email?.message}
                    </span>
                  )}
                </label>
                <label className="field">
                  <span>{copy.fields.phone}</span>
                  <input
                    type="text"
                    placeholder={copy.placeholders.phone}
                    {...form.register("phone")}
                  />
                  {form.formState.errors.phone?.message && (
                    <span className="field-error">
                      {form.formState.errors.phone?.message}
                    </span>
                  )}
                </label>
                <label className="field field--full">
                  <span>{copy.fields.address}</span>
                  <textarea
                    rows={3}
                    placeholder={copy.placeholders.address}
                    {...form.register("address")}
                  />
                  {form.formState.errors.address?.message && (
                    <span className="field-error">
                      {form.formState.errors.address?.message}
                    </span>
                  )}
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.sections.finance}</h2>
                  <p>{copy.sections.financeSubtitle}</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>{copy.fields.creditLimit}</span>
                  <Controller
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                      />
                    )}
                  />
                </label>
                <label className="field">
                  <span>{copy.fields.paymentTerms}</span>
                  <Controller
                    control={form.control}
                    name="payment_terms_days"
                    render={({ field }) => (
                      <input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
                      />
                    )}
                  />
                </label>
                <label className="field field--full field-toggle">
                  <span>{copy.fields.active}</span>
                  <Controller
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <button
                        type="button"
                        className={`toggle-pill${field.value ? " is-active" : ""}`}
                        onClick={() => field.onChange(!field.value)}
                      >
                        <span />
                      </button>
                    )}
                  />
                </label>
              </div>
            </section>

            <div className="panel-actions panel-actions--right">
              <button
                type="submit"
                className={`action-button${
                  createMutation.isPending || updateMutation.isPending
                    ? " action-button--disabled"
                    : ""
                }`}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {copy.actions.save}
              </button>
            </div>
          </form>
        );
      }}
    </DashboardShell>
  );
}