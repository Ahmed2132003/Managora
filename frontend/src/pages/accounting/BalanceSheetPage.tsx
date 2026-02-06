import { useMemo, useState } from "react";
import { isForbiddenError } from "../../shared/api/errors";
import { type BalanceSheetLine, useBalanceSheet } from "../../shared/accounting/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";
import { DashboardShell } from "../DashboardShell";
import "./BalanceSheetPage.css";

export function BalanceSheetPage() {
  const [asOf, setAsOf] = useState("");
  const balanceSheetQuery = useBalanceSheet(asOf || undefined);
  const canExport = useCan("export.accounting");
  const parseAmount = (value: string | number) => {
    if (typeof value === "number") {
      return value;
    }
    const trimmed = value.trim();
    const normalized = trimmed.endsWith("-")
      ? `-${trimmed.slice(0, -1)}`
      : trimmed;
    const numeric = Number(normalized.replace(/,/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
  };
  const formatAbsAmount = (value: string | number) =>
    formatAmount(Math.abs(parseAmount(value)));
  const headerCopy = useMemo(
    () => ({
      en: {
        title: "Balance Sheet",
        subtitle: "A full view of assets, liabilities, and equity with clear totals.",
        helper: "Filter by reporting date and export your report instantly.",
        tags: ["Accounting", "Reports"],
      },
      ar: {
        title: "الميزانية العمومية",
        subtitle: "عرض كامل وواضح للأصول والالتزامات وحقوق الملكية مع إجماليات مفهومة.",
        helper: "اختر تاريخ التقرير وصدّر الملف مباشرة.",
        tags: ["المحاسبة", "التقارير"],
      },
    }),
    []
  );

  if (isForbiddenError(balanceSheetQuery.error)) {
    return <AccessDenied />;
  }

  function handleExport() {
    if (!balanceSheetQuery.data) {
      return;
    }
    const headers = ["Section", "Account Code", "Account Name", "Balance"];
    const rows = [
      ...balanceSheetQuery.data.assets.map((item) => [
        "Assets",
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.liabilities.map((item) => [
        "Liabilities",
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.equity.map((item) => [
        "Equity",
        item.code,
        item.name,
        item.balance,
      ]),
    ];
    downloadCsv(`balance-sheet-${asOf || "as-of"}.csv`, headers, rows);
  }

  const pageContent = {
    en: {
      exportLabel: "Export CSV",
      filtersTitle: "Report Filters",
      asOfLabel: "As of",
      loading: "Loading balance sheet...",
      empty: "Select a date to view the balance sheet.",
      totalsTitle: "Totals",
      assetsHelper: "Assets include cash, receivables, inventory, and owned resources.",
      liabilitiesHelper: "Liabilities cover payables and approved obligations due.",
      equityHelper: "Equity represents capital plus retained earnings after expenses.",
      assets: "Assets",
      liabilities: "Liabilities",
      equity: "Equity",
      netAssets: "Net assets (assets - liabilities)",
      table: {
        account: "Account",
        name: "Name",
        balance: "Balance",
      },      
    },
    ar: {
      exportLabel: "تصدير CSV",
      filtersTitle: "فلاتر التقرير",
      asOfLabel: "حتى تاريخ",
      loading: "جاري تحميل الميزانية العمومية...",
      empty: "اختر تاريخًا لعرض الميزانية العمومية.",
      totalsTitle: "الإجمالي",
      assetsHelper: "الأصول تشمل النقدية، الإيرادات المتحققة، الذمم، والمخزون.",
      liabilitiesHelper: "الالتزامات تشمل المصروفات/المدفوعات المستحقة والديون المعتمدة.",
      equityHelper: "حقوق الملكية = رأس المال + الأرباح المحتجزة (الإيرادات بعد المصروفات).",
      assets: "الأصول",
      liabilities: "الالتزامات",
      equity: "حقوق الملكية",
      netAssets: "صافي الأصول (الأصول - الالتزامات)",
      table: {
        account: "الحساب",
        name: "الاسم",
        balance: "الرصيد",
      },      
    },
  } as const;

  function renderSection(
    title: string,
    rows: BalanceSheetLine[],
    labels: { account: string; name: string; balance: string },    
    helper: string
  ) {
    return (
      <section className="panel balance-sheet-section">
        <div className="panel__header">
          <div>
            <h2>{title}</h2>
            <p className="helper-text">{helper}</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{labels.account}</th>
                <th>{labels.name}</th>
                <th>{labels.balance}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.code}-${index}`}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{formatAbsAmount(row.balance)}</td>                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <DashboardShell
      copy={headerCopy}
      className="balance-sheet-page"
      actions={({ language }) => {
        const labels = pageContent[language];
        if (!canExport) {
          return null;
        }
        return (
          <button
            type="button"
            className="action-button"
            onClick={handleExport}
            disabled={!balanceSheetQuery.data}
          >
            {labels.exportLabel}
          </button>
        );
      }}
    >
      {({ language }) => {
        const labels = pageContent[language];
        return (
          <>
            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{labels.filtersTitle}</h2>
                  <p className="helper-text">
                    {language === "ar"
                      ? "حدّث التاريخ لإعادة تحميل البيانات."
                      : "Update the date to refresh the report."}
                  </p>
                </div>
              </div>
              <div className="filters-grid">
                <label className="field">
                  <span>{labels.asOfLabel}</span>
                  <input
                    type="date"
                    value={asOf}
                    onChange={(event) => setAsOf(event.currentTarget.value)}
                  />
                </label>
              </div>
            </section>

            {balanceSheetQuery.isLoading ? (
              <section className="panel">
                <p className="helper-text">{labels.loading}</p>
              </section>
            ) : balanceSheetQuery.data ? (
              <div className="balance-sheet-grid">
                {renderSection(
                  labels.assets,
                  balanceSheetQuery.data.assets,
                  labels.table,
                  labels.assetsHelper
                )}
                {renderSection(
                  labels.liabilities,
                  balanceSheetQuery.data.liabilities,
                  labels.table,
                  labels.liabilitiesHelper
                )}
                {renderSection(
                  labels.equity,
                  balanceSheetQuery.data.equity,
                  labels.table,
                  labels.equityHelper
                )}
                <section className="panel balance-sheet-totals">
                  <div className="panel__header">
                    <div>
                      <h2>{labels.totalsTitle}</h2>
                      <p className="helper-text">
                        {language === "ar"
                          ? "الأصول = الالتزامات + حقوق الملكية، مع إظهار صافي الأصول."
                          : "Assets balance against liabilities and equity."}
                      </p>
                    </div>
                  </div>
                  <div className="balance-sheet-totals__values">
                    <div>
                      <span>{labels.assets}</span>
                      <strong>
                        {formatAbsAmount(balanceSheetQuery.data.totals.assets_total)}
                      </strong>
                    </div>
                    <div>
                      <span>{labels.liabilities}</span>
                      <strong>
                        {formatAbsAmount(balanceSheetQuery.data.totals.liabilities_total)}
                      </strong>
                    </div>
                    <div>
                      <span>{labels.equity}</span>
                      <strong>
                        {formatAbsAmount(balanceSheetQuery.data.totals.equity_total)}
                      </strong>
                    </div>
                    <div>
                      <span>
                        {labels.liabilities} + {labels.equity}
                      </span>
                      <strong>
                        {formatAbsAmount(
                          balanceSheetQuery.data.totals.liabilities_equity_total
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>{labels.netAssets}</span>
                      <strong>
                        {formatAbsAmount(
                          parseAmount(balanceSheetQuery.data.totals.assets_total) -
                            parseAmount(balanceSheetQuery.data.totals.liabilities_total)
                        )}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>              
            ) : (
              <section className="panel">
                <p className="helper-text">{labels.empty}</p>
              </section>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}