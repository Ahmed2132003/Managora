import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useCustomers } from "../../shared/customers/hooks";
import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";
import { useMe } from "../../shared/auth/useMe";
import { type Invoice, useInvoices } from "../../shared/invoices/hooks";
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

const downloadCanvasAsPng = (canvas: HTMLCanvasElement, fileName: string) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

const buildInvoicePng = ({
  invoice,
  customerName,
  companyName,
  managerName,
  accountantName,
}: {
  invoice: Invoice;
  customerName: string;
  companyName: string;
  managerName: string;
  accountantName: string | null;
}) => {
  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create invoice image.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  let y = 80;
  const left = 80;

  const drawText = (text: string, size = 28, color = "#111827", weight = 400) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial`;
    ctx.fillText(text, left, y);
    y += size + 20;
  };

  drawText(`Invoice ${invoice.invoice_number}`, 42, "#111827", 700);
  drawText(`Customer: ${customerName}`, 28, "#1f2937", 500);
  drawText(`Company: ${companyName}`, 24, "#374151", 500);
  drawText(`Manager: ${managerName}`, 24, "#374151", 500);
  if (accountantName) {
    drawText(`Accountant: ${accountantName}`, 24, "#374151", 500);
  }

  y += 10;
  drawText(`Issue Date: ${invoice.issue_date}`, 22);
  drawText(`Due Date: ${invoice.due_date}`, 22);
  drawText(`Status: ${invoice.status.replace("_", " ")}`, 22);

  y += 24;
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(width - left, y);
  ctx.stroke();
  y += 40;

  ctx.font = "600 24px Arial";
  ctx.fillStyle = "#111827";
  ctx.fillText("Description", left, y);
  ctx.fillText("Qty", 700, y);
  ctx.fillText("Unit", 820, y);
  ctx.fillText("Total", 980, y);
  y += 24;

  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(width - left, y);
  ctx.stroke();
  y += 34;

  ctx.font = "400 20px Arial";
  for (const line of invoice.lines) {
    ctx.fillStyle = "#1f2937";
    ctx.fillText(line.description.slice(0, 45), left, y);
    ctx.fillText(String(line.quantity), 700, y);
    ctx.fillText(String(line.unit_price), 820, y);
    ctx.fillText(String(line.line_total), 980, y);
    y += 34;
  }

  y += 24;
  drawText(`Subtotal: ${invoice.subtotal}`, 24, "#111827", 600);
  drawText(`Tax: ${invoice.tax_amount ?? "0.00"}`, 24, "#111827", 600);
  drawText(`Total: ${invoice.total_amount}`, 28, "#111827", 700);

  if (invoice.notes) {
    y += 16;
    drawText(`Notes: ${invoice.notes.slice(0, 100)}`, 20, "#4b5563", 400);
  }

  return canvas;
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const canManage = useCan("invoices.*");
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers({});
  const meQuery = useMe();
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const customerMap = useMemo(() => {
    return new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer]));
  }, [customersQuery.data]);

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
      catalog: "Products & Services",
      sales: "Sales",
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
        downloadPng: "Save PNG",
        downloadingPng: "Saving...",
        overdueLabel: "Overdue",
      },
    },
    ar: {
      newInvoice: "فاتورة جديدة",
      catalog: "الخدمات والمنتجات",
      sales: "المبيعات",
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
        downloadPng: "حفظ PNG",
        downloadingPng: "جاري الحفظ...",
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

  if (isForbiddenError(invoicesQuery.error) || isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  const handleDownloadInvoicePng = async (invoiceId: number, fallbackCustomerName: string) => {
    setDownloadingInvoiceId(invoiceId);
    try {
      const response = await http.get<Invoice>(endpoints.invoice(invoiceId));
      const fullInvoice = response.data;
      const user = meQuery.data?.user;
      const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "-";
      const roles = meQuery.data?.roles ?? [];
      const managerName = roles.some((role) => role.name.toLowerCase() === "manager") ? fullName : "-";
      const accountantName = roles.some((role) => role.name.toLowerCase() === "accountant") ? fullName : null;
      const canvas = buildInvoicePng({
        invoice: fullInvoice,
        customerName: fallbackCustomerName,
        companyName: meQuery.data?.company.name ?? "-",
        managerName,
        accountantName,
      });
      downloadCanvasAsPng(canvas, `invoice-${fullInvoice.invoice_number}.png`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to save invoice PNG.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

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
                              <button
                                type="button"
                                className="table-action"
                                disabled={downloadingInvoiceId === invoice.id}
                                onClick={() =>
                                  handleDownloadInvoicePng(
                                    invoice.id,
                                    customerMap.get(invoice.customer)?.name ?? "-"
                                  )
                                }
                              >
                                {downloadingInvoiceId === invoice.id
                                  ? labels.table.downloadingPng
                                  : labels.table.downloadPng}
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