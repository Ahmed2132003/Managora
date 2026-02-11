import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { DashboardShell } from "../DashboardShell";
import "./CatalogPage.css";
import {
  useAddStock,
  useCatalogItems,
  useCreateCatalogItem,
  useDeleteCatalogItem,
  useInventoryTransactions,
  useRemoveStock,
  useUpdateCatalogItem,
  type CatalogItem,
  type CatalogItemType,
} from "../../shared/catalog/hooks";

export function CatalogPage() {
  const items = useCatalogItems();
  const tx = useInventoryTransactions();
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem();
  const removeItem = useDeleteCatalogItem();
  const addStock = useAddStock();
  const removeStock = useRemoveStock();
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({
    item_type: "product" as CatalogItemType,
    name: "",
    barcode: "",
    stock_quantity: "0",
    cost_price: "0",
    sale_price: "0",
  });
  const [stockReason, setStockReason] = useState<Record<number, string>>({});
  const [txDateFilter, setTxDateFilter] = useState("");
  const [showAllTx, setShowAllTx] = useState(false);
  
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) await updateItem.mutateAsync({ id: editing.id, payload: form });
    else await createItem.mutateAsync(form);
    setEditing(null);
    setForm({ item_type: "product", name: "", barcode: "", stock_quantity: "0", cost_price: "0", sale_price: "0" });
  };

  const totals = useMemo(() => {
    const list = items.data ?? [];
    return list.reduce(
      (acc, it) => {
        const qty = Number(it.stock_quantity || 0);
        const cost = Number(it.cost_price || 0);
        const sale = Number(it.sale_price || 0);
        acc.cost += qty * cost;
        acc.sale += qty * sale;
        return acc;
      },
      { cost: 0, sale: 0 }
    );
  }, [items.data]);

  const filteredTransactions = useMemo(() => {
    const allTransactions = tx.data ?? [];
    if (!txDateFilter) return allTransactions;
    return allTransactions.filter((row) => {
      const txDate = new Date(row.created_at);
      if (Number.isNaN(txDate.getTime())) return false;
      return txDate.toISOString().slice(0, 10) === txDateFilter;
    });
  }, [tx.data, txDateFilter]);

  const visibleTransactions = showAllTx ? filteredTransactions : filteredTransactions.slice(0, 10);
  const hasMoreTransactions = filteredTransactions.length > 10;

  return (
    <DashboardShell
      copy={{
        en: { title: "Products & Services", subtitle: "Manage catalog and inventory", helper: "Add products/services and control stock.", tags: ["Catalog", "Inventory"] },
        ar: { title: "الخدمات والمنتجات", subtitle: "إدارة الكتالوج والمخزون", helper: "إضافة المنتجات والخدمات ومتابعة المخزون.", tags: ["الكتالوج", "المخزون"] },
      }}
      className="catalog-page"
    >
      {({ language }) => (
        <>
          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "إضافة / تعديل" : "Add / Edit"}</h2></div>
            <form onSubmit={submit} className="filters-grid catalog-page__form-grid">
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "النوع" : "Type"}</span>
                <select value={form.item_type} onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value as CatalogItemType }))}>
                  <option value="product">{language === "ar" ? "منتج" : "Product"}</option>
                  <option value="service">{language === "ar" ? "خدمة" : "Service"}</option>
                </select>
              </label>
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "الاسم" : "Name"}</span>
                <input placeholder={language === "ar" ? "اسم الخدمة أو المنتج" : "Item name"} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "الباركود" : "Barcode"}</span>
                <input placeholder={language === "ar" ? "باركود اختياري" : "Optional barcode"} value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} />
              </label>
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "المخزون" : "Stock"}</span>
                <input placeholder={language === "ar" ? "الكمية الحالية" : "Current quantity"} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} />
              </label>
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "سعر التكلفة" : "Cost price"}</span>
                <input placeholder={language === "ar" ? "سعر التكلفة" : "Cost price"} value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} />
              </label>
              <label className="catalog-page__input-group">
                <span>{language === "ar" ? "سعر البيع" : "Sale price"}</span>
                <input placeholder={language === "ar" ? "سعر البيع" : "Sale price"} value={form.sale_price} onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))} />
              </label>
              <button className="action-button" type="submit">{editing ? (language === "ar" ? "حفظ" : "Save") : (language === "ar" ? "إضافة" : "Add")}</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel__header"><h2>{language === "ar" ? "قائمة" : "Catalog list"}</h2></div>
            <div className="catalog-page__totals">
              <strong>{language === "ar" ? "إجمالي سعر التكلفة" : "Total cost value"}:</strong> {totals.cost.toFixed(2)} | <strong>{language === "ar" ? "إجمالي سعر البيع" : "Total sale value"}:</strong> {totals.sale.toFixed(2)}
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Type</th><th>Name</th><th>Barcode</th><th>Stock</th><th>Cost</th><th>Sale</th><th>{language === "ar" ? "إجمالي سعر التكلفة" : "Total cost"}</th><th>{language === "ar" ? "إجمالي سعر البيع" : "Total sale"}</th><th>Actions</th></tr></thead>
                <tbody>
                  {(items.data ?? []).map((it) => {
                    const qty = Number(it.stock_quantity || 0);
                    return (
                      <tr key={it.id}>
                        <td>{it.item_type}</td><td>{it.name}</td><td>{it.barcode}</td><td>{it.stock_quantity}</td><td>{it.cost_price}</td><td>{it.sale_price}</td>
                        <td>{(qty * Number(it.cost_price || 0)).toFixed(2)}</td>
                        <td>{(qty * Number(it.sale_price || 0)).toFixed(2)}</td>
                        <td>
                          <button className="table-action" onClick={() => { setEditing(it); setForm({ item_type: it.item_type, name: it.name, barcode: it.barcode, stock_quantity: it.stock_quantity, cost_price: it.cost_price, sale_price: it.sale_price }); }}>Edit</button>
                          <button className="table-action" onClick={() => removeItem.mutate(it.id)}>Delete</button>
                          {it.item_type === "product" ? (
                            <>
                              <button className="table-action" onClick={() => addStock.mutate({ id: it.id, quantity: "1", memo: "Manual stock increment" })}>+1 Stock</button>
                              <label className="catalog-page__reason-field">
                                <span>{language === "ar" ? "سبب التنقيص" : "Decrease reason"}</span>
                                <input
                                  className="catalog-page__reason-input"
                                  placeholder={language === "ar" ? "اكتب السبب" : "Write reason"}
                                  value={stockReason[it.id] ?? ""}
                                  onChange={(e) => setStockReason((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                />
                              </label>
                              <button className="table-action" onClick={() => removeStock.mutate({ id: it.id, quantity: "1", reason: stockReason[it.id], memo: stockReason[it.id] })}>-1 Stock</button>
                            </>
                          ) : null}                          
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <h2>{language === "ar" ? "حركات المخزون" : "Inventory transactions"}</h2>
              <div className="catalog-page__tx-filters">
                <label className="catalog-page__input-group catalog-page__input-group--compact">
                  <span>{language === "ar" ? "فلتر التاريخ" : "Date filter"}</span>
                  <input
                    type="date"
                    value={txDateFilter}
                    onChange={(e) => {
                      setTxDateFilter(e.target.value);
                      setShowAllTx(false);
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="table-wrapper"><table className="data-table"><thead><tr><th>Item</th><th>Type</th><th>Qty Δ</th><th>Memo</th><th>Date</th></tr></thead><tbody>{visibleTransactions.map((row) => <tr key={row.id}><td>{row.item_name}</td><td>{row.transaction_type}</td><td>{row.quantity_delta}</td><td>{row.memo}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>
            <div className="catalog-page__tx-footer">
              <span className="helper-text">{language === "ar" ? `إجمالي الحركات: ${filteredTransactions.length}` : `Total transactions: ${filteredTransactions.length}`}</span>
              {hasMoreTransactions ? (
                <button className="table-action" onClick={() => setShowAllTx((prev) => !prev)}>
                  {showAllTx ? (language === "ar" ? "عرض أقل" : "Show less") : (language === "ar" ? "قراءة المزيد" : "Read more")}
                </button>
              ) : null}
            </div>
          </section>          
        </>
      )}
    </DashboardShell>
  );
}