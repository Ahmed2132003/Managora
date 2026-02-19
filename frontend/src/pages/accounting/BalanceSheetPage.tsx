import { useMemo, useState } from "react";
import { isForbiddenError } from "../../shared/api/errors";
import { type BalanceSheetLine, useBalanceSheet } from "../../shared/accounting/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting";
import { DashboardShell } from "../DashboardShell";
import { TablePagination } from "../../shared/ui/TablePagination";
import { useClientPagination } from "../../shared/ui/useClientPagination";
import "./BalanceSheetPage.css";


type BalanceSheetSectionProps = {
  title: string;
  rows: BalanceSheetLine[];
  tableLabels: { account: string; name: string; balance: string };
  helperText: string;
  noDataText: string;
  renderBalance: (value: string | number) => string;
};

function BalanceSheetSection({
  title,
  rows,
  tableLabels,
  helperText,
  noDataText,
  renderBalance,
}: BalanceSheetSectionProps) {
  const { page, setPage, totalPages, paginatedRows } = useClientPagination(rows, 10);

  return (
    <section className="panel balance-sheet-section">
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          <p className="helper-text">{helperText}</p>
        </div>
      </div>

      <div className="table-wrapper">
        {rows.length === 0 ? (
          <p className="helper-text">{noDataText}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{tableLabels.account}</th>
                <th>{tableLabels.name}</th>
                <th style={{ textAlign: "end" }}>{tableLabels.balance}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={`${title}-${row.code}-${row.name}`}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td style={{ textAlign: "end" }}>{renderBalance(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPreviousPage={() => setPage((prev) => prev - 1)}
          onNextPage={() => setPage((prev) => prev + 1)}
          disabled={!rows.length}
        />
      </div>
    </section>
  );
}

export function BalanceSheetPage() {
  const [asOf, setAsOf] = useState("");
  const balanceSheetQuery = useBalanceSheet(asOf || undefined);
  const canExport = useCan("export.accounting");

  const parseAmount = (value: string | number) => {
    if (typeof value === "number") return value;
    const trimmed = value.trim();

    // support "1,234.50-" formatting
    const normalized = trimmed.endsWith("-")
      ? `-${trimmed.slice(0, -1)}`
      : trimmed;

    const numeric = Number(normalized.replace(/,/g, ""));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const formatAbsAmount = (value: string | number) =>
    formatAmount(Math.abs(parseAmount(value)));

  // ✅ Do not trust API signs in totals. Normalize for display + compute net assets / equity from display values.
  const getDisplayTotals = (totals: {
    assets_total: string | number;
    liabilities_total: string | number;
  }) => {
    const assets = Math.abs(parseAmount(totals.assets_total));
    const liabilities = Math.abs(parseAmount(totals.liabilities_total));

    const netResult = assets - liabilities;
    const equity = netResult;
    const liabilitiesEquity = liabilities + equity;

    return { assets, liabilities, equity, liabilitiesEquity, netAssets: netResult };    
  };

  const handleExportCsv = () => {
    if (!balanceSheetQuery.data) return;

    const headers = ["Section", "Account Code", "Account Name", "Balance"];

    const rows = [
      ...balanceSheetQuery.data.assets.map((item) => [
        "Revenue",        
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.liabilities.map((item) => [
        "Expenses",        
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.equity.map((item) => [
        "Net Result",        
        item.code,
        item.name,
        item.balance,
      ]),
    ];

    downloadCsv(`balance-sheet-${asOf || "as-of"}.csv`, headers, rows);
  };

  const headerCopy = {
    en: {
      title: "Income & expense summary",      
      subtitle:
        "A summary of all incoming revenues and outgoing expenses as of the selected date.",
      helper: "Review revenue, expenses, and net result at a glance.",      
      tags: ["Accounting", "Reporting"],
    },
    ar: {
      title: "ملخص الإيرادات والمصروفات",
      subtitle: "ملخص لكل الأموال الداخلة كإيرادات والخارجة كمصروفات حتى التاريخ المحدد.",      
      helper: "راجع الأصول والالتزامات وحقوق الملكية بسرعة.",
      tags: ["المحاسبة", "التقارير"],
    },
  };

  const pageContent = useMemo(
    () => ({
      en: {        
        exportLabel: "Export CSV",
        filtersTitle: "Report filters",
        asOfLabel: "As of",
        empty: "Select a date to view revenue and expense summary.",
        loading: "Loading revenue and expense summary…",
        title: "Income & expense summary",
        subtitle:
          "A summary of all incoming revenues and outgoing expenses as of the selected date.",
        assets: "Revenue",
        liabilities: "Expenses",
        equity: "Net result",
        netAssets: "Net result",        
        totalsTitle: "Totals",
        table: {
          account: "Account",
          name: "Name",
          balance: "Balance",
        },
        assetsHelper:
          "Revenue includes all incoming money from invoices, services, and product sales.",          
        liabilitiesHelper:
          "Expenses include all outgoing money such as operating and payroll costs.",          
        equityHelper:
          "Net result equals revenue minus expenses for the selected period up to the date.",          
        noData: "No data.",
        totalsHelper:
          "Revenue = Expenses + Net result.",          
      },
      ar: {
        exportLabel: "تصدير CSV",
        filtersTitle: "فلاتر التقرير",
        asOfLabel: "حتى تاريخ",
        empty: "اختر تاريخًا لعرض ملخص الإيرادات والمصروفات.",
        loading: "جاري تحميل ملخص الإيرادات والمصروفات…",
        title: "ملخص الإيرادات والمصروفات",
        subtitle: "ملخص لكل الأموال الداخلة كإيرادات والخارجة كمصروفات حتى التاريخ المحدد.",
        assets: "الإيرادات",
        liabilities: "المصروفات",
        equity: "صافي النتيجة",
        netAssets: "صافي النتيجة",        
        totalsTitle: "الإجمالي",
        table: {
          account: "الحساب",
          name: "الاسم",
          balance: "الرصيد",
        },
        assetsHelper: "الإيرادات تشمل كل الأموال الداخلة من الفواتير والخدمات والمبيعات.",
        liabilitiesHelper:
          "المصروفات تشمل كل الأموال الخارجة مثل التشغيل والرواتب.",
        equityHelper:
          "صافي النتيجة = الإيرادات − المصروفات حتى التاريخ المحدد.",
        noData: "لا توجد بيانات.",
        totalsHelper:
          "الإيرادات = المصروفات + صافي النتيجة.",          
      },
    }),
    []
  );

  if (balanceSheetQuery.error && isForbiddenError(balanceSheetQuery.error)) {
    return (
      <DashboardShell copy={headerCopy} className="balance-sheet-page">
        {() => <AccessDenied />}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell copy={headerCopy} className="balance-sheet-page">
      {({ language, isArabic }) => {
        const lang = language === "ar" || isArabic ? "ar" : "en";
        const labels = pageContent[lang];

        return (
          <>
            <section className="panel balance-sheet-filters">
              <div className="panel__header">
                <div>
                  <h2>{labels.filtersTitle}</h2>
                </div>
                <div className="panel-actions panel-actions--right">
                  {canExport && balanceSheetQuery.data ? (
                    <button
                      className="action-button action-button--ghost"
                      type="button"
                      onClick={handleExportCsv}
                    >
                      {labels.exportLabel}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="filters-grid">
                <label className="field">
                  <span>{labels.asOfLabel}</span>
                  <input
                    type="date"
                    value={asOf}
                    onChange={(e) => setAsOf(e.target.value)}
                  />
                </label>
              </div>
            </section>
            {balanceSheetQuery.isLoading ? (
              <section className="panel">
                <p className="helper-text">{labels.loading}</p>
              </section>
            ) : balanceSheetQuery.data ? (
              <div className="grid-panels balance-sheet-grid">                
                <BalanceSheetSection
                  title={labels.assets}
                  rows={balanceSheetQuery.data.assets}
                  tableLabels={labels.table}
                  helperText={labels.assetsHelper}
                  noDataText={labels.noData}
                  renderBalance={formatAbsAmount}
                />
                <BalanceSheetSection
                  title={labels.liabilities}
                  rows={balanceSheetQuery.data.liabilities}
                  tableLabels={labels.table}
                  helperText={labels.liabilitiesHelper}
                  noDataText={labels.noData}
                  renderBalance={formatAbsAmount}
                />
                <BalanceSheetSection
                  title={labels.equity}
                  rows={balanceSheetQuery.data.equity}
                  tableLabels={labels.table}
                  helperText={labels.equityHelper}
                  noDataText={labels.noData}
                  renderBalance={formatAbsAmount}
                />

                {(() => {
                  const dt = getDisplayTotals(balanceSheetQuery.data.totals);
                  return (
                    <section className="panel balance-sheet-totals">
                      <div className="panel__header">
                        <div>
                          <h2>{labels.totalsTitle}</h2>
                          <p className="helper-text">{labels.totalsHelper}</p>
                        </div>
                      </div>

                      <div className="balance-sheet-totals__values">
                        <div>
                          <span>{labels.assets}</span>
                          <strong>{formatAmount(dt.assets)}</strong>
                        </div>

                        <div>
                          <span>{labels.liabilities}</span>
                          <strong>{formatAmount(dt.liabilities)}</strong>
                        </div>

                        <div>
                          <span>{labels.equity}</span>
                          <strong>{formatAmount(dt.equity)}</strong>
                        </div>

                        <div>
                          <span>
                            {labels.liabilities} + {labels.equity}
                          </span>
                          <strong>{formatAmount(dt.liabilitiesEquity)}</strong>
                        </div>

                        <div>
                          <span>{labels.netAssets}</span>
                          <strong>{formatAmount(dt.netAssets)}</strong>
                        </div>
                      </div>
                    </section>
                  );
                })()}
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