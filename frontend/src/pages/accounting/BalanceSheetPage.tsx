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
  const headerCopy = useMemo(
    () => ({
      en: {
        title: "Balance Sheet",
        subtitle: "A structured view of assets, liabilities, and equity.",
        helper: "Filter by reporting date and export your report instantly.",
        tags: ["Accounting", "Reports"],
      },
      ar: {
        title: "الميزانية العمومية",
        subtitle: "عرض منظم للأصول والالتزامات وحقوق الملكية.",
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
      sectionHelper: "Account-level breakdown",
      assets: "Assets",
      liabilities: "Liabilities",
      equity: "Equity",
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
      sectionHelper: "تفاصيل بحسب كل حساب",
      assets: "الأصول",
      liabilities: "الالتزامات",
      equity: "حقوق الملكية",
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
                  <td>{formatAmount(row.balance)}</td>
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
                  labels.sectionHelper
                )}
                {renderSection(
                  labels.liabilities,
                  balanceSheetQuery.data.liabilities,
                  labels.table,
                  labels.sectionHelper
                )}
                {renderSection(
                  labels.equity,
                  balanceSheetQuery.data.equity,
                  labels.table,
                  labels.sectionHelper
                )}
                <section className="panel balance-sheet-totals">
                  <div className="panel__header">
                    <div>
                      <h2>{labels.totalsTitle}</h2>
                      <p className="helper-text">
                        {language === "ar"
                          ? "موازنة الأصول مع الالتزامات وحقوق الملكية."
                          : "Assets balance against liabilities and equity."}
                      </p>
                    </div>
                  </div>
                  <div className="balance-sheet-totals__values">
                    <div>
                      <span>{labels.assets}</span>
                      <strong>
                        {formatAmount(balanceSheetQuery.data.totals.assets_total)}
                      </strong>
                    </div>
                    <div>
                      <span>
                        {labels.liabilities} + {labels.equity}
                      </span>
                      <strong>
                        {formatAmount(
                          balanceSheetQuery.data.totals.liabilities_equity_total
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