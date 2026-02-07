import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useCustomers } from "../../shared/customers/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./CustomersPage.css";

export function CustomersPage() {
  const navigate = useNavigate();
  const canCreate = useCan("customers.create");
  const canEdit = useCan("customers.edit");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      is_active: activeFilter || undefined,
    }),
    [name, code, activeFilter]
  );

  const customersQuery = useCustomers(filters);

  const headerCopy = {
    en: {
      title: "Customers",
      subtitle: "Track customer records, credit limits, and account status.",
      helper: "Filter by name, code, and activity status to find accounts quickly.",
      tags: ["CRM", "Billing"],
    },
    ar: {
      title: "العملاء",
      subtitle: "تابع بيانات العملاء وحدود الائتمان وحالة الحساب.",
      helper: "قم بالتصفية بالاسم أو الكود أو حالة النشاط للوصول السريع.",
      tags: ["إدارة العملاء", "الفوترة"],
    },
  };

  const pageCopy = useMemo(
    () => ({
      en: {
        filtersTitle: "Filters",
        filtersSubtitle: "Narrow down the list with quick filters.",
        tableTitle: "Customer list",
        tableSubtitle: "Review credit limits and account activity at a glance.",
        actions: {
          new: "New Customer",
          edit: "Edit",
        },
        fields: {
          name: "Name",
          code: "Code",
          status: "Status",
        },
        placeholders: {
          name: "Customer name",
          code: "CUST-0001",
        },
        statusOptions: {
          all: "All",
          active: "Active",
          inactive: "Inactive",
        },
        table: {
          code: "Code",
          name: "Name",
          phone: "Phone",
          credit: "Credit Limit",
          status: "Status",
          actions: "Actions",
          empty: "No customers found.",
          loading: "Loading customers...",
        },
        statusLabel: {
          active: "Active",
          inactive: "Inactive",
        },
      },
      ar: {
        filtersTitle: "الفلاتر",
        filtersSubtitle: "صفِّ النتائج بسرعة باستخدام فلاتر العملاء.",
        tableTitle: "قائمة العملاء",
        tableSubtitle: "راجع حدود الائتمان وحالة الحساب بسرعة.",
        actions: {
          new: "عميل جديد",
          edit: "تعديل",
        },
        fields: {
          name: "الاسم",
          code: "الكود",
          status: "الحالة",
        },
        placeholders: {
          name: "اسم العميل",
          code: "CUST-0001",
        },
        statusOptions: {
          all: "الكل",
          active: "نشط",
          inactive: "غير نشط",
        },
        table: {
          code: "الكود",
          name: "الاسم",
          phone: "الهاتف",
          credit: "حد الائتمان",
          status: "الحالة",
          actions: "الإجراءات",
          empty: "لا يوجد عملاء مطابقون.",
          loading: "جارٍ تحميل العملاء...",
        },
        statusLabel: {
          active: "نشط",
          inactive: "غير نشط",
        },
      },
    }),
    []
  );

  if (isForbiddenError(customersQuery.error)) {
    return (
      <DashboardShell copy={headerCopy} className="customers-page">
        {() => <AccessDenied />}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      copy={headerCopy}
      className="customers-page"
      actions={
        canCreate
          ? ({ language }) => (
              <button
                type="button"
                className="action-button"
                onClick={() => navigate("/customers/new")}
              >
                {pageCopy[language].actions.new}
              </button>
            )
          : undefined
      }
    >
      {({ language }) => {
        const copy = pageCopy[language];

        return (
          <>
            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.filtersTitle}</h2>
                  <p>{copy.filtersSubtitle}</p>
                </div>
              </div>
              <div className="filters-grid">
                <label className="field">
                  <span>{copy.fields.name}</span>
                  <input
                    type="text"
                    value={name}
                    placeholder={copy.placeholders.name}
                    onChange={(event) => setName(event.currentTarget.value)}
                  />
                </label>
                <label className="field">
                  <span>{copy.fields.code}</span>
                  <input
                    type="text"
                    value={code}
                    placeholder={copy.placeholders.code}
                    onChange={(event) => setCode(event.currentTarget.value)}
                  />
                </label>
                <label className="field">
                  <span>{copy.fields.status}</span>
                  <select
                    value={activeFilter ?? ""}
                    onChange={(event) =>
                      setActiveFilter(event.target.value || null)
                    }
                  >
                    <option value="">{copy.statusOptions.all}</option>
                    <option value="true">{copy.statusOptions.active}</option>
                    <option value="false">{copy.statusOptions.inactive}</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.tableTitle}</h2>
                  <p>{copy.tableSubtitle}</p>
                </div>
              </div>
              <div className="table-wrapper">
                {customersQuery.isLoading ? (
                  <p className="helper-text">{copy.table.loading}</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{copy.table.code}</th>
                        <th>{copy.table.name}</th>
                        <th>{copy.table.phone}</th>
                        <th>{copy.table.credit}</th>
                        <th>{copy.table.status}</th>
                        <th>{copy.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(customersQuery.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <span className="helper-text">{copy.table.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        (customersQuery.data ?? []).map((customer) => (
                          <tr key={customer.id}>
                            <td>{customer.code}</td>
                            <td>{customer.name}</td>
                            <td>{customer.phone || "-"}</td>
                            <td>{customer.credit_limit ?? "-"}</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  customer.is_active
                                    ? "status-pill--active"
                                    : "status-pill--inactive"
                                }`}
                              >
                                {customer.is_active
                                  ? copy.statusLabel.active
                                  : copy.statusLabel.inactive}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="table-action"
                                    onClick={() =>
                                      navigate(`/customers/${customer.id}/edit`)
                                    }
                                  >
                                    {copy.actions.edit}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        );
      }}
    </DashboardShell>
  );
}