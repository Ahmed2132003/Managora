import { useState } from "react";
import type { FormEvent } from "react";
import { DashboardShell } from "../DashboardShell";
import { useAddStock, useCatalogItems, useCreateCatalogItem, useDeleteCatalogItem, useInventoryTransactions, useUpdateCatalogItem, type CatalogItem, type CatalogItemType } from "../../shared/catalog/hooks";

export function CatalogPage() {
  const items = useCatalogItems();
  const tx = useInventoryTransactions();
  const createItem = useCreateCatalogItem();
  const updateItem = useUpdateCatalogItem();
  const removeItem = useDeleteCatalogItem();
  const addStock = useAddStock();
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({ item_type: "product" as CatalogItemType, name: "", barcode: "", stock_quantity: "0", cost_price: "0", sale_price: "0" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) await updateItem.mutateAsync({ id: editing.id, payload: form });
    else await createItem.mutateAsync(form);
    setEditing(null);
    setForm({ item_type: "product", name: "", barcode: "", stock_quantity: "0", cost_price: "0", sale_price: "0" });
  };

  return <DashboardShell copy={{ en: { title: "Products & Services", subtitle: "Manage catalog and inventory", helper: "Add products/services and control stock.", tags: ["Catalog", "Inventory"] }, ar: { title: "الخدمات والمنتجات", subtitle: "إدارة الكتالوج والمخزون", helper: "إضافة المنتجات والخدمات ومتابعة المخزون.", tags: ["الكتالوج", "المخزون"] } }}>{({ language }) => <><section className="panel"><div className="panel__header"><h2>{language === "ar" ? "إضافة / تعديل" : "Add / Edit"}</h2></div><form onSubmit={submit} className="filters-grid"><select value={form.item_type} onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value as CatalogItemType }))}><option value="product">{language === "ar" ? "منتج" : "Product"}</option><option value="service">{language === "ar" ? "خدمة" : "Service"}</option></select><input placeholder={language === "ar" ? "الاسم" : "Name"} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /><input placeholder={language === "ar" ? "باركود" : "Barcode"} value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} /><input placeholder={language === "ar" ? "المخزون" : "Stock"} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} /><input placeholder={language === "ar" ? "سعر التكلفة" : "Cost price"} value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} /><input placeholder={language === "ar" ? "سعر البيع" : "Sale price"} value={form.sale_price} onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))} /><button className="action-button" type="submit">{editing ? (language === "ar" ? "حفظ" : "Save") : (language === "ar" ? "إضافة" : "Add")}</button></form></section><section className="panel"><div className="panel__header"><h2>{language === "ar" ? "قائمة" : "Catalog list"}</h2></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>Type</th><th>Name</th><th>Barcode</th><th>Stock</th><th>Cost</th><th>Sale</th><th>Actions</th></tr></thead><tbody>{(items.data ?? []).map((it) => <tr key={it.id}><td>{it.item_type}</td><td>{it.name}</td><td>{it.barcode}</td><td>{it.stock_quantity}</td><td>{it.cost_price}</td><td>{it.sale_price}</td><td><button className="table-action" onClick={() => { setEditing(it); setForm({ item_type: it.item_type, name: it.name, barcode: it.barcode, stock_quantity: it.stock_quantity, cost_price: it.cost_price, sale_price: it.sale_price }); }}>Edit</button><button className="table-action" onClick={() => removeItem.mutate(it.id)}>Delete</button>{it.item_type === "product" ? <button className="table-action" onClick={() => addStock.mutate({ id: it.id, quantity: "1" })}>+1 Stock</button> : null}</td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel__header"><h2>{language === "ar" ? "حركات المخزون" : "Inventory transactions"}</h2></div><div className="table-wrapper"><table className="data-table"><thead><tr><th>Item</th><th>Type</th><th>Qty Δ</th><th>Memo</th><th>Date</th></tr></thead><tbody>{(tx.data ?? []).map((row) => <tr key={row.id}><td>{row.item_name}</td><td>{row.transaction_type}</td><td>{row.quantity_delta}</td><td>{row.memo}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section></>}</DashboardShell>;
}