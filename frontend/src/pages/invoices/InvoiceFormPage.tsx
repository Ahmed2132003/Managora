import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCustomers } from "../../shared/customers/hooks";
import {
  useCreateInvoice,
  useInvoice,
  useIssueInvoice,
  useUpdateInvoice,
} from "../../shared/invoices/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./InvoiceFormPage.css";

const createEmptyLine = () => ({
  description: "",
  quantity: 1,
  unit_price: 0,
});

const toDateString = (value: Date) => value.toISOString().slice(0, 10);

export function InvoiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customersQuery = useCustomers({});
  const createInvoice = useCreateInvoice();
  const issueInvoice = useIssueInvoice();
  const updateInvoice = useUpdateInvoice();
  const invoiceQuery = useInvoice(id);
  const isEditMode = Boolean(id);
  const hasInitializedForm = useRef(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [taxAmount, setTaxAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([createEmptyLine()]);

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? []).map((customer) => ({
        value: String(customer.id),
        label: `${customer.code} - ${customer.name}`,
      })),
    [customersQuery.data]
  );

  const selectedCustomer = useMemo(() => {
    return (customersQuery.data ?? []).find((customer) => String(customer.id) === customerId);
  }, [customersQuery.data, customerId]);

  const lineTotals = useMemo(
    () => lines.map((line) => Number(line.quantity) * Number(line.unit_price)),
    [lines]
  );

  const subtotal = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals]
  );

  const taxValue = taxAmount === "" ? 0 : Number(taxAmount);
  const totalAmount = subtotal + taxValue;
  const hasLines = lines.length > 0;
  const canIssue = Boolean(
    invoiceNumber &&
      customerId &&
      issueDate &&
      hasLines &&
      (!isEditMode || invoiceQuery.data?.status === "draft")
  );

  useEffect(() => {
    if (!isEditMode || !invoiceQuery.data || hasInitializedForm.current) {
      return;
    }
    const invoice = invoiceQuery.data;
    setInvoiceNumber(invoice.invoice_number);
    setCustomerId(String(invoice.customer));
    setIssueDate(invoice.issue_date);
    setTaxAmount(invoice.tax_amount ?? "");
    setNotes(invoice.notes ?? "");
    setLines(
      invoice.lines.length
        ? invoice.lines.map((line) => ({
            description: line.description,
            quantity: Number(line.quantity),
            unit_price: Number(line.unit_price),
          }))
        : [createEmptyLine()]
    );
    hasInitializedForm.current = true;
  }, [invoiceQuery.data, isEditMode]);

  const dueDatePreview = useMemo(() => {
    if (!issueDate || !selectedCustomer) {
      return "";
    }
    const baseDate = new Date(`${issueDate}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return "";
    }
    baseDate.setDate(baseDate.getDate() + selectedCustomer.payment_terms_days);
    return toDateString(baseDate);
  }, [issueDate, selectedCustomer]);

  const updateLine = (index: number, updates: Partial<(typeof lines)[number]>) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, ...updates } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine()]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async (action: "draft" | "issue") => {
      if (!invoiceNumber || !customerId || !issueDate) {
        throw new Error("Please complete required fields.");
      }
      if (lines.length === 0) {
        throw new Error("Please add at least one line item.");
      }

      const payload = {
        invoice_number: invoiceNumber,
        customer: Number(customerId),
        issue_date: issueDate,
        tax_amount: taxAmount === "" ? undefined : String(taxAmount),
        notes,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: String(line.quantity),
          unit_price: String(line.unit_price),
        })),
      };

      if (isEditMode && invoiceQuery.data) {
        const invoice = await updateInvoice.mutateAsync({
          id: invoiceQuery.data.id,
          payload,
        });
        if (action === "issue" && invoiceQuery.data.status === "draft") {
          return await issueInvoice.mutateAsync(invoice.id);
        }
        return invoice;
      }

      const invoice = await createInvoice.mutateAsync(payload);
      if (action === "issue") {
        return await issueInvoice.mutateAsync(invoice.id);
      }
      return invoice;
    },    
    onSuccess: async (invoice) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${invoice.id}`);
    },
  });

  if (isForbiddenError(customersQuery.error) || isForbiddenError(invoiceQuery.error)) {
    return <AccessDenied />;
  }

  const copy = {
    en: {
      title: isEditMode ? "Edit Invoice" : "New Invoice",
      subtitle: isEditMode
        ? "Update details before issuing or saving the invoice."
        : "Draft, review, and issue a customer invoice.",
      helper: "Fill the required fields and preview totals instantly.",
      tags: isEditMode ? ["Billing", "Edit"] : ["Billing", "Draft"],
    },
    ar: {
      title: isEditMode ? "تعديل فاتورة" : "فاتورة جديدة",
      subtitle: isEditMode
        ? "قم بتحديث تفاصيل الفاتورة قبل الإصدار أو الحفظ."
        : "قم بإعداد ومراجعة وإصدار فاتورة للعميل.",
      helper: "املأ الحقول المطلوبة وتحقق من الإجمالي مباشرة.",
      tags: isEditMode ? ["الفوترة", "تعديل"] : ["الفوترة", "مسودة"],
    },
  };

  return (
    <DashboardShell
      copy={copy}      
      className="invoice-form-page"
      actions={({ language }) => (
        <button
          type="button"
          className="action-button action-button--ghost"
          onClick={() => navigate("/invoices")}
        >
          {language === "ar" ? "العودة للفواتير" : "Back to Invoices"}
        </button>
      )}
    >
      {({ language }) => (
        <>
          <section className="panel">
            <div className="panel__header">
              <div>
              <h2>
                {language === "ar"
                  ? isEditMode
                    ? "تحديث الفاتورة"
                    : "تفاصيل الفاتورة"
                  : isEditMode
                    ? "Update Invoice"
                    : "Invoice Details"}
              </h2>                
                <p className="helper-text">
                  {language === "ar"
                    ? "أدخل بيانات الفاتورة الأساسية قبل إضافة البنود."
                    : "Enter core details before adding line items."}
                </p>
              </div>
            </div>
            <div className="filters-grid invoice-form-grid">
              <label className="field">
                <span>{language === "ar" ? "رقم الفاتورة" : "Invoice Number"}</span>
                <input
                  type="text"
                  placeholder="INV-0001"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
                  required
                />
              </label>
              <label className="field">
                <span>{language === "ar" ? "العميل" : "Customer"}</span>
                <select
                  value={customerId ?? ""}
                  onChange={(event) =>
                    setCustomerId(event.target.value ? event.target.value : null)
                  }
                  required
                >
                  <option value="">
                    {language === "ar" ? "اختر العميل" : "Select customer"}
                  </option>
                  {customerOptions.map((customer) => (
                    <option key={customer.value} value={customer.value}>
                      {customer.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{language === "ar" ? "تاريخ الإصدار" : "Issue Date"}</span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.currentTarget.value)}
                  required
                />
              </label>
              <label className="field">
                <span>{language === "ar" ? "تاريخ الاستحقاق" : "Due Date (preview)"}</span>
                <input type="text" value={dueDatePreview} readOnly />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{language === "ar" ? "بنود الفاتورة" : "Line Items"}</h2>
                <p className="helper-text">
                  {language === "ar"
                    ? "أضف الخدمات أو المنتجات مع الكمية والسعر."
                    : "Add services or products with quantity and price."}
                </p>
              </div>
              <div className="panel-actions panel-actions--right">
                <button type="button" className="action-button" onClick={addLine}>
                  {language === "ar" ? "إضافة بند" : "Add Line"}
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{language === "ar" ? "الوصف" : "Description"}</th>
                    <th>{language === "ar" ? "الكمية" : "Quantity"}</th>
                    <th>{language === "ar" ? "سعر الوحدة" : "Unit Price"}</th>
                    <th>{language === "ar" ? "إجمالي البند" : "Line Total"}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          placeholder={language === "ar" ? "خدمة" : "Service"}
                          value={line.description}
                          onChange={(event) =>
                            updateLine(index, { description: event.currentTarget.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(index, {
                              quantity: Number(event.currentTarget.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={line.unit_price}
                          onChange={(event) =>
                            updateLine(index, {
                              unit_price: Number(event.currentTarget.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td>{lineTotals[index].toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          {language === "ar" ? "حذف" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>{language === "ar" ? "القيمة والإجمالي" : "Totals & Notes"}</h2>
                <p className="helper-text">
                  {language === "ar"
                    ? "راجع الضرائب والإجمالي قبل إصدار الفاتورة."
                    : "Review tax and totals before issuing."}
                </p>
              </div>
            </div>
            <div className="filters-grid invoice-form-grid">
              <label className="field">
                <span>{language === "ar" ? "الضريبة" : "Tax"}</span>
                <input
                  type="number"
                  min={0}
                  value={taxAmount}
                  onChange={(event) =>
                    setTaxAmount(
                      event.currentTarget.value === ""
                        ? ""
                        : Number(event.currentTarget.value)
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{language === "ar" ? "الإجمالي الفرعي" : "Subtotal"}</span>
                <input type="text" value={subtotal.toFixed(2)} readOnly />
              </label>
              <label className="field">
                <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                <input type="text" value={totalAmount.toFixed(2)} readOnly />
              </label>
              <label className="field field--full">
                <span>{language === "ar" ? "ملاحظات" : "Notes"}</span>
                <textarea
                  placeholder={language === "ar" ? "ملاحظات إضافية" : "Additional notes"}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                />
              </label>
            </div>

            {submitMutation.error && (
              <p className="helper-text helper-text--error">
                {(submitMutation.error as Error).message}
              </p>
            )}

            <div className="panel-actions panel-actions--right invoice-form-actions">
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() => submitMutation.mutate("draft")}
                disabled={submitMutation.isPending}
              >
                {language === "ar"
                  ? isEditMode
                    ? "حفظ التغييرات"
                    : "حفظ كمسودة"
                  : isEditMode
                    ? "Save Changes"
                    : "Save Draft"}
              </button>              
              <button
                type="button"
                className={`action-button${!canIssue ? " action-button--disabled" : ""}`}
                onClick={() => {
                  if (
                    !window.confirm(
                      language === "ar"
                        ? "هل تريد إصدار هذه الفاتورة الآن؟"
                        : "Issue this invoice now?"
                    )
                  ) {
                    return;
                  }
                  submitMutation.mutate("issue");
                }}
                disabled={!canIssue || submitMutation.isPending}
              >
                {language === "ar" ? "إصدار الفاتورة" : "Issue Invoice"}
              </button>
            </div>
          </section>
        </>
      )}
    </DashboardShell>
  );
}