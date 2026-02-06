import { useMemo, useState } from "react";
import { isForbiddenError } from "../../shared/api/errors";
import { type BalanceSheetLine, useBalanceSheet } from "../../shared/accounting/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting";
import { DashboardShell } from "../DashboardShell";
import "./BalanceSheetPage.css";

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

  const renderSection = (
    title: string,
    rows: BalanceSheetLine[],
    tableLabels: { account: string; name: string; balance: string },
    helperText: string,
    noDataText: string
  ) => {
    return (
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>{title}</h2>
            <p className="helper-text">{helperText}</p>
          </div>
        </div>

        <div className="table">
          <div className="table__header">
            <div className="table__cell">{tableLabels.account}</div>
            <div className="table__cell">{tableLabels.name}</div>
            <div className="table__cell table__cell--right">
              {tableLabels.balance}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="table__row">
              <div className="table__cell helper-text" style={{ gridColumn: "1 / -1" }}>
                {noDataText}
              </div>
            </div>
          ) : (
            rows.map((row) => (
              <div className="table__row" key={`${title}-${row.code}-${row.name}`}>
                <div className="table__cell">{row.code}</div>
                <div className="table__cell">{row.name}</div>
                <div className="table__cell table__cell--right">
                  {formatAbsAmount(row.balance)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  };

  if (balanceSheetQuery.error && isForbiddenError(balanceSheetQuery.error)) {
    return (
      <DashboardShell>
        {() => <AccessDenied />}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {({ language, isArabic }) => {
        const lang = language === "ar" || isArabic ? "ar" : "en";
        const labels = pageContent[lang];

        return (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">{labels.title}</h1>
                <p className="page-subtitle">{labels.subtitle}</p>
              </div>
            </div>

            <section className="panel balance-sheet-filters">
              <div className="panel__header">
                <div>
                  <h2>{labels.filtersTitle}</h2>
                </div>
                <div className="balance-sheet-filters__actions">
                  {canExport && balanceSheetQuery.data ? (
                    <button className="button" type="button" onClick={handleExportCsv}>
                      {labels.exportLabel}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="balance-sheet-filters__form">
                <label className="field">
                  <span className="field__label">{labels.asOfLabel}</span>
                  <input
                    className="field__input"
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
              <div className="balance-sheet-grid">
                {renderSection(
                  labels.assets,
                  balanceSheetQuery.data.assets,
                  labels.table,
                  labels.assetsHelper,
                  labels.noData
                )}
                {renderSection(
                  labels.liabilities,
                  balanceSheetQuery.data.liabilities,
                  labels.table,
                  labels.liabilitiesHelper,
                  labels.noData
                )}
                {renderSection(
                  labels.equity,
                  balanceSheetQuery.data.equity,
                  labels.table,
                  labels.equityHelper,
                  labels.noData
                )}

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
