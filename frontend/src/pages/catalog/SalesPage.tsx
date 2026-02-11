import { useMemo, useState } from "react";
import { DashboardShell } from "../DashboardShell";
import "./SalesPage.css";
import { useAccounts, useCostCenters } from "../../shared/accounting/hooks";
import { useCatalogItems } from "../../shared/catalog/hooks";
import { useCreateCustomer, useCustomers } from "../../shared/customers/hooks";
import { useInvoices, useRecordSale } from "../../shared/invoices/hooks";

type SaleLine = { item: number; quantity: string; unit_price: string };

const INITIAL_INVOICE_NUMBER = `INV-${Date.now()}`;
const INITIAL_ISSUE_DATE = new Date().toISOString().slice(0, 10);

export function SalesPage() {
  const customers = useCustomers({});
  const catalog = useCatalogItems();
  const accounts = useAccounts();
  const costCenters = useCostCenters();
  const invoices = useInvoices();
  const createCustomer = useCreateCustomer();
  const recordSale = useRecordSale();

  const [mode, setMode] = useState<"existing" | "new" | "by_name">("existing");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [newCustomer, setNewCustomer] = useState({ code: "", name: "", email: "", phone: "", address: "", credit_limit: "", payment_terms_days: 0, is_active: true });

  const [invoiceNumber, setInvoiceNumber] = useState(INITIAL_INVOICE_NUMBER);
  const [issueDate, setIssueDate] = useState(INITIAL_ISSUE_DATE);
  const [dueDate, setDueDate] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [expenseAccount, setExpenseAccount] = useState("");
  const [paidFromAccount, setPaidFromAccount] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("auto");
  const [expenseVendorName, setExpenseVendorName] = useState("");

  const [lines, setLines] = useState<SaleLine[]>([{ item: 0, quantity: "1", unit_price: "0" }]);


  const itemMap = useMemo(() => {
    const map = new Map<number, { name: string; sale: string }>();
    for (const item of catalog.data ?? []) map.set(item.id, { name: item.name, sale: item.sale_price });
    return map;
  }, [catalog.data]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0),
    [lines]
  );
  const total = subtotal + Number(taxAmount || 0);

  async function submitSale() {
    let selectedCustomer = customerId ? Number(customerId) : undefined;

    if (mode === "new") {
      const created = await createCustomer.mutateAsync({
        ...newCustomer,
        payment_terms_days: Number(newCustomer.payment_terms_days || 0),
        credit_limit: newCustomer.credit_limit || null,
      });
      selectedCustomer = created.id;
    }

    await recordSale.mutateAsync({
      customer: mode === "existing" ? selectedCustomer : undefined,
      customer_name: mode === "by_name" ? customerName : undefined,
      customer_data: mode === "new" ? newCustomer : undefined,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate || undefined,
      tax_amount: taxAmount,
      notes,
      items: lines.map((l) => ({ item: Number(l.item), quantity: l.quantity, unit_price: l.unit_price })),
      expense_account: expenseAccount ? Number(expenseAccount) : undefined,
      paid_from_account: paidFromAccount ? Number(paidFromAccount) : undefined,
      cost_center: costCenter ? Number(costCenter) : undefined,
      payment_method: paymentMethod,
      expense_vendor_name: expenseVendorName,
    });

    setInvoiceNumber(`INV-${Date.now()}`);
    setNotes("");
    setTaxAmount("0");
  }

  return (
    <DashboardShell
      copy={{
        en: { title: "Sales (Products & Services)", subtitle: "Create sale invoices integrated with customers/expenses/revenue", tags: ["Sales", "Invoices"] },
        ar: { title: "بيع الخدمات والمنتجات", subtitle: "إنشاء بيع متكامل مع العملاء والفواتير والمصروفات والإيرادات", tags: ["مبيعات", "فواتير"] },
      }}
      className="sales-page"
    >
      {({ language }) => (
        <>
          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "العميل" : "Customer"}</h2></div>
            <div className="filters-grid">
              <select value={mode} onChange={(e) => setMode(e.target.value as "existing" | "new" | "by_name") }>
                <option value="existing">{language === "ar" ? "اختيار عميل موجود" : "Select existing customer"}</option>
                <option value="new">{language === "ar" ? "إضافة عميل جديد" : "Add new customer"}</option>
                <option value="by_name">{language === "ar" ? "اختيار/بحث بالاسم" : "Search by name"}</option>
              </select>
              {mode === "existing" ? (
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">{language === "ar" ? "اختر عميل" : "Select customer"}</option>
                  {(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              ) : null}
              {mode === "by_name" ? <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={language === "ar" ? "اسم العميل" : "Customer name"} /> : null}
              {mode === "new" ? (
                <>
                  <input placeholder={language === "ar" ? "كود العميل" : "Customer code"} value={newCustomer.code} onChange={(e) => setNewCustomer((s) => ({ ...s, code: e.target.value }))} />
                  <input placeholder={language === "ar" ? "اسم العميل" : "Customer name"} value={newCustomer.name} onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))} />
                  <input placeholder={language === "ar" ? "البريد الإلكتروني" : "Email"} value={newCustomer.email} onChange={(e) => setNewCustomer((s) => ({ ...s, email: e.target.value }))} />
                  <input placeholder={language === "ar" ? "الهاتف" : "Phone"} value={newCustomer.phone} onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))} />
                  <input placeholder={language === "ar" ? "العنوان" : "Address"} value={newCustomer.address} onChange={(e) => setNewCustomer((s) => ({ ...s, address: e.target.value }))} />
                  <input placeholder={language === "ar" ? "الحد الائتماني" : "Credit limit"} value={newCustomer.credit_limit} onChange={(e) => setNewCustomer((s) => ({ ...s, credit_limit: e.target.value }))} />
                  <input placeholder={language === "ar" ? "مدة السداد بالأيام" : "Payment terms days"} type="number" value={newCustomer.payment_terms_days} onChange={(e) => setNewCustomer((s) => ({ ...s, payment_terms_days: Number(e.target.value) }))} />
                </>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "بيانات الفاتورة" : "Invoice details"}</h2></div>
            <div className="filters-grid">
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder={language === "ar" ? "رقم الفاتورة" : "Invoice number"} />
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} placeholder={language === "ar" ? "الضريبة" : "Tax"} />
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={language === "ar" ? "ملاحظات" : "Notes"} />
            </div>

            <h3>{language === "ar" ? "بنود الفاتورة" : "Invoice items"}</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>{language === "ar" ? "الوصف" : "Description"}</th><th>{language === "ar" ? "الكمية" : "Qty"}</th><th>{language === "ar" ? "سعر الوحدة" : "Unit price"}</th><th>{language === "ar" ? "القيمة" : "Value"}</th></tr></thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={line.item || ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, item: id, unit_price: itemMap.get(id)?.sale ?? "0" } : l)));
                          }}
                        >
                          <option value="">{language === "ar" ? "اختر منتج/خدمة" : "Select item"}</option>
                          {(catalog.data ?? []).map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td><input value={line.quantity} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))} /></td>
                      <td><input value={line.unit_price} onChange={(e) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unit_price: e.target.value } : l)))} /></td>
                      <td>{(Number(line.quantity || 0) * Number(line.unit_price || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="action-button" onClick={() => setLines((prev) => [...prev, { item: 0, quantity: "1", unit_price: "0" }])}>{language === "ar" ? "إضافة بند" : "Add line"}</button>

            <div className="sales-page__totals">
              <strong>{language === "ar" ? "الإجمالي الفرعي" : "Subtotal"}</strong>: {subtotal.toFixed(2)} | <strong>{language === "ar" ? "الإجمالي" : "Total"}</strong>: {total.toFixed(2)}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "تكامل المصروف" : "Expense integration"}</h2></div>
            <div className="filters-grid">
              <select value={expenseAccount} onChange={(e) => setExpenseAccount(e.target.value)}>
                <option value="">{language === "ar" ? "حساب المصروف" : "Expense account"}</option>
                {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <select value={paidFromAccount} onChange={(e) => setPaidFromAccount(e.target.value)}>
                <option value="">{language === "ar" ? "حساب السداد" : "Paid from account"}</option>
                {(accounts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)}>
                <option value="">{language === "ar" ? "مركز التكلفة" : "Cost center"}</option>
                {(costCenters.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
              <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder={language === "ar" ? "طريقة السداد" : "Payment method"} />
              <input value={expenseVendorName} onChange={(e) => setExpenseVendorName(e.target.value)} placeholder={language === "ar" ? "المورد/الجهة" : "Vendor / provider"} />
            </div>
            <button className="action-button" onClick={submitSale}>{recordSale.isPending ? (language === "ar" ? "جارٍ الحفظ..." : "Saving...") : (language === "ar" ? "تنفيذ البيع" : "Record sale")}</button>
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "الفواتير المحفوظة" : "Saved invoices"}</h2></div>
            <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>{language === "ar" ? "العميل" : "Customer"}</th><th>{language === "ar" ? "التاريخ" : "Issue date"}</th><th>{language === "ar" ? "الإجمالي" : "Total"}</th></tr></thead><tbody>{(invoices.data ?? []).map((inv) => <tr key={inv.id}><td>{inv.invoice_number}</td><td>{inv.customer}</td><td>{inv.issue_date}</td><td>{inv.total_amount}</td></tr>)}</tbody></table></div>
          </section>
        </>
      )}
    </DashboardShell>
  );
}