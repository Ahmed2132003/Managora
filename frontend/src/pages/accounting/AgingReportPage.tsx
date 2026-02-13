import { useMemo, useState } from "react";
import { useAlerts, useAgingReport } from "../../shared/accounting/hooks";
import { useInvoices } from "../../shared/invoices/hooks";
import { DashboardShell } from "../DashboardShell";
import { TablePagination, useClientPagination } from "../../shared/ui";
import "./AgingReportPage.css";

const bucketColors: Record<string, string> = {
  "0_30": "green",
  "31_60": "yellow",
  "61_90": "orange",
  "90_plus": "red",
};

function daysOverdue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function AgingReportPage() {
  const agingQuery = useAgingReport();
  const alertsQuery = useAlerts();
  const invoicesQuery = useInvoices();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const selectedCustomerName = useMemo(() => {
    return (
      agingQuery.data?.find((row) => row.customer.id === selectedCustomerId)?.customer
        .name ?? ""
    );
  }, [agingQuery.data, selectedCustomerId]);

  const openInvoices = useMemo(() => {
    if (!selectedCustomerId) {
      return [];
    }
    return (invoicesQuery.data ?? []).filter(
      (invoice) =>
        invoice.customer === selectedCustomerId &&
        Number(invoice.remaining_balance) > 0
    );
  }, [invoicesQuery.data, selectedCustomerId]);

  const headerCopy = {
    en: {
      title: "AR Aging",
      subtitle: "Track outstanding receivables by time bucket.",
      helper: "Select a customer to review open invoices.",
      tags: ["Receivables", "Collections"],
    },
    ar: {
      title: "أعمار الديون",
      subtitle: "تابع الذمم المدينة حسب فترة الاستحقاق.",
      helper: "اختر عميلًا لاستعراض الفواتير المفتوحة.",
      tags: ["الذمم المدينة", "التحصيل"],
    },
  };

  const pageContent = {
    en: {
      loading: "Loading aging report...",
      empty: "No receivables found.",
      alertsTitle: "Alerts Center",
      alertsLoading: "Loading alerts...",
      alertsEmpty: "No alerts yet.",
      table: {
        customer: "Customer",
        totalDue: "Total Due",
        bucket0: "0–30",
        bucket31: "31–60",
        bucket61: "61–90",
        bucket90: "90+",
      },
      alertsTable: {
        severity: "Severity",
        type: "Type",
        message: "Message",
        created: "Created",
      },
      modalTitle: "Open invoices",
      modalEmpty: "No open invoices for this customer.",
      modalTable: {
        invoice: "Invoice",
        dueDate: "Due date",
        daysOverdue: "Days overdue",
        remaining: "Remaining",
      },
    },
    ar: {
      loading: "جاري تحميل تقرير الأعمار...",
      empty: "لا توجد ذمم مدينة.",
      alertsTitle: "مركز التنبيهات",
      alertsLoading: "جاري تحميل التنبيهات...",
      alertsEmpty: "لا توجد تنبيهات بعد.",
      table: {
        customer: "العميل",
        totalDue: "الإجمالي المستحق",
        bucket0: "٠–٣٠",
        bucket31: "٣١–٦٠",
        bucket61: "٦١–٩٠",
        bucket90: "٩٠+",
      },
      alertsTable: {
        severity: "الحدة",
        type: "النوع",
        message: "الرسالة",
        created: "تاريخ الإنشاء",
      },
      modalTitle: "فواتير مفتوحة",
      modalEmpty: "لا توجد فواتير مفتوحة لهذا العميل.",
      modalTable: {
        invoice: "الفاتورة",
        dueDate: "تاريخ الاستحقاق",
        daysOverdue: "أيام التأخير",
        remaining: "المتبقي",
      },
    },
  } as const;

  const agingRows = agingQuery.data ?? [];
  const alertRows = alertsQuery.data ?? [];

  const {
    page: agingPage,
    setPage: setAgingPage,
    totalPages: agingTotalPages,
    paginatedRows: paginatedAgingRows,
  } = useClientPagination(agingRows, 10);

  const {
    page: alertsPage,
    setPage: setAlertsPage,
    totalPages: alertsTotalPages,
    paginatedRows: paginatedAlertsRows,
  } = useClientPagination(alertRows, 10);

  const totalSummary = {
    totalDue: agingRows.reduce((sum, row) => sum + Number(row.total_due), 0),
    customers: agingRows.length,
  };

  return (
    <DashboardShell copy={headerCopy} className="aging-report-page">
      {({ language }) => {
        const labels = pageContent[language];
        return (
          <>
            <section className="panel aging-summary">
              <div className="panel__header">
                <div>
                  <h2>{language === "ar" ? "ملخص الأعمار" : "Aging Summary"}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "نظرة سريعة على إجمالي الديون الحالية."
                      : "Quick snapshot of current receivables."}
                  </p>
                </div>
                <span className="pill pill--accent">{totalSummary.customers}</span>
              </div>
              <div className="aging-summary__grid">
                <div>
                  <span>{labels.table.totalDue}</span>
                  <strong>{totalSummary.totalDue.toFixed(2)}</strong>
                </div>
                <div>
                  <span>{labels.table.customer}</span>
                  <strong>{totalSummary.customers}</strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{language === "ar" ? "تفاصيل الأعمار" : "Aging Details"}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "اضغط على اسم العميل لعرض الفواتير المفتوحة."
                      : "Select a customer to inspect open invoices."}
                  </p>
                </div>
              </div>
              {agingQuery.isLoading ? (
                <p className="helper-text">{labels.loading}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{labels.table.customer}</th>
                        <th>{labels.table.totalDue}</th>
                        <th>{labels.table.bucket0}</th>
                        <th>{labels.table.bucket31}</th>
                        <th>{labels.table.bucket61}</th>
                        <th>{labels.table.bucket90}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingRows.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <span className="helper-text">{labels.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        paginatedAgingRows.map((row) => (
                          <tr key={row.customer.id}>
                            <td>
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => setSelectedCustomerId(row.customer.id)}
                              >
                                {row.customer.name}
                              </button>
                            </td>
                            <td>{row.total_due}</td>
                            {(["0_30", "31_60", "61_90", "90_plus"] as const).map(
                              (key) => (
                                <td key={key}>
                                  <span
                                    className={`status-pill status-pill--${bucketColors[key]}`}
                                  >
                                    {row.buckets[key]}
                                  </span>
                                </td>
                              )
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <TablePagination
                    page={agingPage}
                    totalPages={agingTotalPages}
                    onPreviousPage={() => setAgingPage((prev) => prev - 1)}
                    onNextPage={() => setAgingPage((prev) => prev + 1)}
                    disabled={!agingRows.length || agingQuery.isLoading}
                  />
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{labels.alertsTitle}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "تنبيهات مرتبطة بالمخاطر والتحصيل."
                      : "Alerts tied to risk and collections."}
                  </p>
                </div>
              </div>
              {alertsQuery.isLoading ? (
                <p className="helper-text">{labels.alertsLoading}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{labels.alertsTable.severity}</th>
                        <th>{labels.alertsTable.type}</th>
                        <th>{labels.alertsTable.message}</th>
                        <th>{labels.alertsTable.created}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertRows.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <span className="helper-text">{labels.alertsEmpty}</span>
                          </td>
                        </tr>
                      ) : (
                        paginatedAlertsRows.map((alert) => (
                          <tr key={alert.id}>
                            <td>
                              <span
                                className={`status-pill status-pill--${
                                  alert.severity === "high" ? "red" : "yellow"
                                }`}
                              >
                                {alert.severity}
                              </span>
                            </td>
                            <td>{alert.type.replace("_", " ")}</td>
                            <td>{alert.message}</td>
                            <td>{new Date(alert.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <TablePagination
                    page={alertsPage}
                    totalPages={alertsTotalPages}
                    onPreviousPage={() => setAlertsPage((prev) => prev - 1)}
                    onNextPage={() => setAlertsPage((prev) => prev + 1)}
                    disabled={!alertRows.length || alertsQuery.isLoading}
                  />
                </div>
              )}
            </section>

            {selectedCustomerId && (
              <div className="dashboard-modal" role="dialog" aria-modal="true">
                <div
                  className="dashboard-modal__backdrop"
                  onClick={() => setSelectedCustomerId(null)}
                  aria-hidden="true"
                />
                <div className="dashboard-modal__content">
                  <div className="dashboard-modal__header">
                    <div>
                      <h2>
                        {labels.modalTitle}
                        {selectedCustomerName ? ` - ${selectedCustomerName}` : ""}
                      </h2>
                      <p className="helper-text">
                        {language === "ar"
                          ? "قائمة الفواتير التي ما زالت مفتوحة."
                          : "List of invoices still outstanding."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setSelectedCustomerId(null)}
                      aria-label={language === "ar" ? "إغلاق" : "Close"}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="dashboard-modal__body">
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{labels.modalTable.invoice}</th>
                            <th>{labels.modalTable.dueDate}</th>
                            <th>{labels.modalTable.daysOverdue}</th>
                            <th>{labels.modalTable.remaining}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={4}>
                                <span className="helper-text">{labels.modalEmpty}</span>
                              </td>
                            </tr>
                          ) : (
                            openInvoices.map((invoice) => (
                              <tr key={invoice.id}>
                                <td>{invoice.invoice_number}</td>
                                <td>{invoice.due_date}</td>
                                <td>{daysOverdue(invoice.due_date)}</td>
                                <td>{invoice.remaining_balance}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}