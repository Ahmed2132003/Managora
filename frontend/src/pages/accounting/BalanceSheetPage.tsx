import { useMemo, useState } from "react";
import { isForbiddenError } from "../../shared/api/errors";
import { type BalanceSheetLine, useBalanceSheet } from "../../shared/accounting/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting";
import { DashboardShell } from "../DashboardShell";
import { TablePagination, useClientPagination } from "../../shared/ui";
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

    const netAssets = assets - liabilities; // ✅ 10,000 - 903.47 = 9,096.53
    const equity = netAssets;              // ✅ equity shown in totals matches net assets (your requirement)
    const liabilitiesEquity = liabilities + equity; // ✅ should equal assets

    return { assets, liabilities, equity, liabilitiesEquity, netAssets };
  };

  const handleExportCsv = () => {
    if (!balanceSheetQuery.data) return;

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
  };

  const headerCopy = {
    en: {
      title: "Balance sheet",
      subtitle:
        "A snapshot of the company’s financial position as of the selected date.",
      helper: "Review assets, liabilities, and equity at a glance.",
      tags: ["Accounting", "Reporting"],
    },
    ar: {
      title: "الميزانية العمومية",
      subtitle: "لقطة لحظية للوضع المالي حتى التاريخ المحدد.",
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
        empty: "Select a date to view the balance sheet.",
        loading: "Loading balance sheet…",
        title: "Balance sheet",
        subtitle:
          "A snapshot of the company’s financial position as of the selected date.",
        assets: "Assets",
        liabilities: "Liabilities",
        equity: "Equity",
        netAssets: "Net assets",
        totalsTitle: "Totals",
        table: {
          account: "Account",
          name: "Name",
          balance: "Balance",
        },
        assetsHelper:
          "Assets are what the company owns (cash, receivables, equipment, etc.).",
        liabilitiesHelper:
          "Liabilities are what the company owes (payables, loans, accrued expenses, etc.).",
        equityHelper:
          "Equity represents ownership interest (capital + retained earnings).",
        noData: "No data.",
        totalsHelper:
          "Assets = Liabilities + Equity (display values). Net assets = Assets − Liabilities.",
      },
      ar: {
        exportLabel: "تصدير CSV",
        filtersTitle: "فلاتر التقرير",
        asOfLabel: "حتى تاريخ",
        empty: "اختر تاريخًا لعرض الميزانية العمومية.",
        loading: "جاري تحميل الميزانية العمومية…",
        title: "الميزانية العمومية",
        subtitle: "لقطة لحظية للوضع المالي حتى التاريخ المحدد.",
        assets: "الأصول",
        liabilities: "الالتزامات",
        equity: "حقوق الملكية",
        netAssets: "صافي الأصول",
        totalsTitle: "الإجمالي",
        table: {
          account: "الحساب",
          name: "الاسم",
          balance: "الرصيد",
        },
        assetsHelper: "الأصول هي ما تمتلكه الشركة (نقد، ذمم مدينة، معدات، إلخ).",
        liabilitiesHelper:
          "الالتزامات هي ما تدين به الشركة (ذمم دائنة، قروض، مصروفات مستحقة، إلخ).",
        equityHelper:
          "حقوق الملكية تمثل حقوق الملاك (رأس المال + الأرباح المحتجزة).",
        noData: "لا توجد بيانات.",
        totalsHelper:
          "الأصول = الالتزامات + حقوق الملكية (بقِيَم العرض). صافي الأصول = الأصول − الالتزامات.",
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