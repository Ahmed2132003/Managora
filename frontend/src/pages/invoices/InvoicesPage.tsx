import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useCustomers } from "../../shared/customers/hooks";
import { useInvoices } from "../../shared/invoices/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./InvoicesPage.css";

const statusColors: Record<string, string> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "yellow",
  paid: "green",
  void: "red",
};

const isInvoiceOverdue = (invoice: { due_date: string; remaining_balance: string; status: string }) => {
  if (invoice.status === "paid" || invoice.status === "void") {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  return invoice.due_date < today && Number(invoice.remaining_balance) > 0;
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const canManage = useCan("invoices.*");
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers({});

  const customerMap = useMemo(() => {
    return new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer]));
  }, [customersQuery.data]);

  if (isForbiddenError(invoicesQuery.error) || isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  const headerCopy = {
    en: {
      title: "Invoices",
      subtitle: "Track billing, collections, and invoice lifecycle.",
      helper: "Monitor status changes and keep receivables visible.",
      tags: ["Billing", "Collections"],
    },
    ar: {
      title: "الفواتير",
      subtitle: "تابع الفوترة والتحصيل ودورة حياة الفاتورة.",
      helper: "راقب الحالات وابقَ على اطلاع بالذمم.",
      tags: ["الفوترة", "التحصيل"],
    },
  };

  const pageContent = {
    en: {
      newInvoice: "New Invoice",
      loading: "Loading invoices...",
      empty: "No invoices found.",
      stats: {
        total: "Total invoices",
        overdue: "Overdue",
        open: "Open balance",
      },
      table: {
        invoice: "Invoice #",
        customer: "Customer",
        issueDate: "Issue Date",
        dueDate: "Due Date",
        status: "Status",
        total: "Total",
        actions: "Actions",
        view: "View",
        overdueLabel: "Overdue",
      },
    },
    ar: {
      newInvoice: "فاتورة جديدة",
      loading: "جاري تحميل الفواتير...",
      empty: "لا توجد فواتير.",
      stats: {
        total: "إجمالي الفواتير",
        overdue: "المتأخرة",
        open: "الرصيد المفتوح",
      },
      table: {
        invoice: "رقم الفاتورة",
        customer: "العميل",
        issueDate: "تاريخ الإصدار",
        dueDate: "تاريخ الاستحقاق",
        status: "الحالة",
        total: "الإجمالي",
        actions: "الإجراءات",
        view: "عرض",
        overdueLabel: "متأخرة",
      },
    },
  } as const;

  const summary = useMemo(() => {
    const invoices = invoicesQuery.data ?? [];
    const total = invoices.length;
    const overdue = invoices.filter(isInvoiceOverdue).length;
    const openBalance = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.remaining_balance || 0),
      0
    );
    return { total, overdue, openBalance };
  }, [invoicesQuery.data]);

  return (
    <DashboardShell
      copy={headerCopy}
      className="invoices-page"
      actions={({ language }) => {
        if (!canManage) {
          return null;
        }
        return (
          <button
            type="button"
            className="action-button"
            onClick={() => navigate("/invoices/new")}
          >
            {pageContent[language].newInvoice}
          </button>
        );
      }}
    >
      {({ language }) => {
        const labels = pageContent[language];
        return (
          <>
            <section className="panel invoices-summary">
              <div className="panel__header">
                <div>
                  <h2>{language === "ar" ? "ملخص الفواتير" : "Invoices Summary"}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "حالة الفوترة الحالية خلال الفترة الأخيرة."
                      : "Current billing status at a glance."}
                  </p>
                </div>
              </div>
              <div className="invoices-summary__grid">
                <div>
                  <span>{labels.stats.total}</span>
                  <strong>{summary.total}</strong>
                </div>
                <div>
                  <span>{labels.stats.overdue}</span>
                  <strong>{summary.overdue}</strong>
                </div>
                <div>
                  <span>{labels.stats.open}</span>
                  <strong>{summary.openBalance.toFixed(2)}</strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{language === "ar" ? "سجل الفواتير" : "Invoice Log"}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "راجع حالة الفواتير والتواريخ المستحقة."
                      : "Review status, due dates, and totals."}
                  </p>
                </div>
              </div>
              {invoicesQuery.isLoading ? (
                <p className="helper-text">{labels.loading}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{labels.table.invoice}</th>
                        <th>{labels.table.customer}</th>
                        <th>{labels.table.issueDate}</th>
                        <th>{labels.table.dueDate}</th>
                        <th>{labels.table.status}</th>
                        <th>{labels.table.total}</th>
                        <th>{labels.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoicesQuery.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <span className="helper-text">{labels.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        (invoicesQuery.data ?? []).map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{invoice.invoice_number}</td>
                            <td>{customerMap.get(invoice.customer)?.name ?? "-"}</td>
                            <td>{invoice.issue_date}</td>
                            <td>{invoice.due_date}</td>
                            <td>
                              <div className="invoice-status">
                                <span
                                  className={`status-pill status-pill--${
                                    statusColors[invoice.status] || "gray"
                                  }`}
                                >
                                  {invoice.status.replace("_", " ")}
                                </span>
                                {isInvoiceOverdue(invoice) && (
                                  <span className="status-pill status-pill--red">
                                    {labels.table.overdueLabel}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>{invoice.total_amount}</td>
                            <td>
                              <button
                                type="button"
                                className="table-action"
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                              >
                                {labels.table.view}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        );
      }}
    </DashboardShell>
  );
}