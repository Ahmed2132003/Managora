import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { formatApiError, isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useMe } from "../../shared/auth/useMe";
import {
  useGeneratePeriod,
  useLockPayrollPeriod,
  useMarkPayrollRunPaid,
  usePayrollRun,
  usePayrollPeriods,
  usePeriodRuns,
  useAttendanceRecordsQuery,
} from "../../shared/hr/hooks";
import type { AttendanceRecord, PayrollRun, PayrollRunDetail } from "../../shared/hr/hooks";

import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";
import { DashboardShell } from "../DashboardShell";
import "./PayrollPeriodDetailsPage.css";

function formatMoney(value: string | number) {  
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isNaN(amount) ? "-" : amount.toFixed(2);
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

type PayrollUser = {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  roles?: { id: number; name?: string | null; slug?: string | null }[];
};

function formatUserName(user?: PayrollUser | null) {
  if (!user) return "-";
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const fullName = `${first} ${last}`.trim();
  return fullName || user.username || "-";
}

function getBasicFromLines(lines: { name: string; code: string; amount: string }[]) {
  const basicLine = lines.find((line) => {
    const name = line.name.toLowerCase();    
    const code = line.code.toLowerCase();
    return name.includes("basic") || code.includes("basic");
  });
  return basicLine?.amount ?? null;
}

function resolveDailyRateByPeriod(
  periodType: "monthly" | "weekly" | "daily" | undefined,
  basicSalary: number
) {
  if (!basicSalary) return null;
  if (periodType === "daily") return basicSalary;
  if (periodType === "weekly") return basicSalary / 7;
  return basicSalary / 30;
}

function getPeriodRange(period?: { start_date?: string | null; end_date?: string | null }) {
  const dateFrom = period?.start_date ?? null;
  const dateTo = period?.end_date ?? null;
  if (!dateFrom || !dateTo) {
    return null;
  }
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const days = Math.max(
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    1
  );
  return { dateFrom, dateTo, days };
}

type PeriodRange = ReturnType<typeof getPeriodRange>;

type RunSummary = {
  presentDays: number;
  absentDays: number;
  lateMinutes: number;
  bonuses: number;
  commissions: number;
  deductions: number;
  advances: number;
  dailyRate: number;
};

function buildRunSummary(
  run: PayrollRunDetail | null | undefined,
  attendanceRecords: AttendanceRecord[],
  periodRange: PeriodRange
): RunSummary | null {
  if (!run || !periodRange) {
    return null;
  }

  const records = attendanceRecords ?? [];
  const presentDays = records.filter((record) => record.status !== "absent").length;
  const absentDays = Math.max(periodRange.days - presentDays, 0);
  const lateMinutes = records.reduce((sum, record) => sum + (record.late_minutes ?? 0), 0);
  const lines = run.lines ?? [];
  const basicLine = lines.find((line) => line.code.toUpperCase() === "BASIC");
  const basicAmount = basicLine ? parseAmount(basicLine.amount) : 0;
  const metaRate = basicLine?.meta?.rate;
  const dailyRate = metaRate
    ? parseAmount(metaRate)
    : resolveDailyRateByPeriod(run.period.period_type, basicAmount);
  const bonuses = lines
    .filter(
      (line) =>
        line.type === "earning" &&
        line.code.toUpperCase() !== "BASIC" &&
        !line.code.toUpperCase().startsWith("COMM-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const commissions = lines
    .filter((line) => line.type === "earning" && line.code.toUpperCase().startsWith("COMM-"))
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const deductions = lines
    .filter(
      (line) => line.type === "deduction" && line.code.toUpperCase().startsWith("COMP-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);
  const advances = lines
    .filter(
      (line) => line.type === "deduction" && line.code.toUpperCase().startsWith("LOAN-")
    )
    .reduce((sum, line) => sum + parseAmount(line.amount), 0);

  return {
    presentDays,
    absentDays,
    lateMinutes,
    bonuses,
    commissions,
    deductions,
    advances,
    dailyRate: dailyRate ?? 0,
  };
}

function calculatePayableTotal(summary: RunSummary | null) {
  if (!summary) return null;
  return (
    summary.presentDays * summary.dailyRate +
    summary.bonuses +
    summary.commissions -
    summary.deductions -
    summary.advances
  );
}

const contentMap = {
  en: {
    title: "Payroll Period Details",
    subtitle: "Review payroll runs, attendance, and payable totals.",
    periodLabel: "Period",
    statusLabel: "Status",
    searchLabel: "Search",
    searchPlaceholder: "Search by name",
    lockPeriod: "Lock period",
    locking: "Locking...",
    runsTitle: "Payroll runs",
    runsSubtitle: "Tap an employee to review payroll details.",
    loadingRuns: "Loading payroll runs...",
    emptyRuns: "No matching payroll runs.",
    table: {
      employee: "Employee",
      earnings: "Earnings total",
      deductions: "Deductions total",
      net: "Net",
      payable: "Payable total",
      actions: "Actions",
      view: "View details",
    },
    detailsTitle: "Run details",
    detailsSubtitle: "Payroll breakdown, attendance, and approvals.",
    closeDetails: "Hide details",
    loadingDetails: "Loading payroll details...",
    emptyDetails: "Select an employee to view details.",
    basic: "Basic",
    payableTotal: "Payable total",
    summary: {
      attendanceDays: "Attendance days",
      absenceDays: "Absence days",
      lateMinutes: "Late minutes",
      bonuses: "Bonuses",
      commissions: "Commissions",
      deductions: "Deductions",
      advances: "Advances",
    },
    linesTable: {
      line: "Line",
      type: "Type",
      amount: "Amount",
    },
    company: "Company",
    manager: "Manager",
    hr: "HR",
    markPaid: "Mark paid",
    markPaidDone: "Paid",
    savePng: "Save as PNG",
    status: {
      draft: "Draft",
      locked: "Locked",
      approved: "Approved",
      paid: "Paid",
    },
  },
  ar: {
    title: "تفاصيل فترة الرواتب",
    subtitle: "راجع الرواتب والحضور والإجمالي المستحق.",
    periodLabel: "الفترة",
    statusLabel: "الحالة",
    searchLabel: "بحث",
    searchPlaceholder: "ابحث بالاسم",
    lockPeriod: "قفل الفترة",
    locking: "جاري القفل...",
    runsTitle: "رواتب الفترة",
    runsSubtitle: "اختر موظفًا لعرض تفاصيل الراتب.",
    loadingRuns: "جاري تحميل الرواتب...",
    emptyRuns: "لا توجد رواتب مطابقة.",
    table: {
      employee: "الموظف",
      earnings: "إجمالي الاستحقاقات",
      deductions: "إجمالي الاستقطاعات",
      net: "الصافي",
      payable: "الإجمالي المستحق",
      actions: "الإجراءات",
      view: "عرض التفاصيل",
    },
    detailsTitle: "تفاصيل الراتب",
    detailsSubtitle: "تفاصيل الراتب والحضور والاعتمادات.",
    closeDetails: "إخفاء التفاصيل",
    loadingDetails: "جاري تحميل تفاصيل الراتب...",
    emptyDetails: "اختر موظفًا لعرض التفاصيل.",
    basic: "الأساسي",
    payableTotal: "الإجمالي المستحق",
    summary: {
      attendanceDays: "أيام الحضور",
      absenceDays: "أيام الغياب",
      lateMinutes: "دقائق التأخير",
      bonuses: "المكافآت",
      commissions: "العمولات",
      deductions: "الخصومات",
      advances: "السلف",
    },
    linesTable: {
      line: "البند",
      type: "النوع",
      amount: "المبلغ",
    },
    company: "الشركة",
    manager: "المدير",
    hr: "الموارد البشرية",
    markPaid: "تم الدفع",
    markPaidDone: "مدفوع",
    savePng: "حفظ كصورة",
    status: {
      draft: "مسودة",
      locked: "مقفلة",
      approved: "معتمدة",
      paid: "مدفوعة",
    },
  },
} as const;

export function PayrollPeriodDetailsPage() {
  const params = useParams();
  const periodId = params.id ? Number(params.id) : null;
  const [search, setSearch] = useState("");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [hrName, setHrName] = useState("-");  
  const runsQuery = usePeriodRuns(periodId);
  const periodsQuery = usePayrollPeriods();
  const runDetailsQuery = usePayrollRun(selectedRun?.id ?? null);   
  const lockMutation = useLockPayrollPeriod(periodId);
  const generateMutation = useGeneratePeriod(periodId);
  const markPaidMutation = useMarkPayrollRunPaid();
  const canGenerate = useCan("hr.payroll.generate");
  const meQuery = useMe();
  const autoGeneratedRef = useRef(false);  

  const runsCount = runsQuery.data?.length ?? 0;  
  const runsLoading = runsQuery.isLoading;
  const runsFetching = runsQuery.isFetching;

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);
  const [runPayables, setRunPayables] = useState<Record<number, number>>({});
  const filteredRuns = useMemo(() => {
    if (!search) return runs;
    const term = search.toLowerCase();    
    return runs.filter((run) =>
      run.employee.full_name.toLowerCase().includes(term)
    );
  }, [runs, search]);

  const periodStatus =
    periodsQuery.data?.find((period) => period.id === periodId)?.status ??
    runDetailsQuery.data?.period?.status;
  const periodInfo =
    periodsQuery.data?.find((period) => period.id === periodId) ??
    runDetailsQuery.data?.period ??
    null;

  const periodRange = useMemo(
    () => (periodInfo ? getPeriodRange(periodInfo) : null),
    [periodInfo]
  );

  const runPeriodRange = useMemo(() => {
    return runDetailsQuery.data?.period
      ? getPeriodRange(runDetailsQuery.data.period)      
      : null;
  }, [runDetailsQuery.data]);
  
  const attendanceQuery = useAttendanceRecordsQuery(
    {
      dateFrom: runPeriodRange?.dateFrom ?? undefined,
      dateTo: runPeriodRange?.dateTo ?? undefined,
      employeeId: runDetailsQuery.data?.employee.id
        ? String(runDetailsQuery.data.employee.id)
        : undefined,
    },
    Boolean(runDetailsQuery.data?.employee.id && runPeriodRange)
  );

  const runSummary = useMemo(
    () => buildRunSummary(runDetailsQuery.data, attendanceQuery.data ?? [], runPeriodRange),
    [attendanceQuery.data, runDetailsQuery.data, runPeriodRange]
  );

  const currentUserName = useMemo(() => {
    const user = meQuery.data?.user;
    if (!user) {
      return "-";
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return fullName || user.username || "-";
  }, [meQuery.data?.user]);

  const roleNames = useMemo(() => {
    const currentRoles = meQuery.data?.roles ?? [];
    return currentRoles.map((role) => (role.slug || role.name).toLowerCase());
  }, [meQuery.data?.roles]);
    
  const isSuperUser = meQuery.data?.user.is_superuser ?? false;
  const managerName = roleNames.includes("manager") || isSuperUser ? currentUserName : "-";
  const payableTotal = useMemo(() => {
    if (runSummary) {
      return calculatePayableTotal(runSummary);
    }
    return runDetailsQuery.data?.net_total;
  }, [runDetailsQuery.data?.net_total, runSummary]);

  useEffect(() => {
    const currentPeriodRange = periodRange;
    if (!currentPeriodRange) {
      return;
    }
    const { dateFrom, dateTo } = currentPeriodRange;
    const missingRuns = runs.filter((run) => runPayables[run.id] == null);
    if (missingRuns.length === 0) {
      return;
    }

    let cancelled = false;
    async function loadPayables() {
      const results = await Promise.all(
        missingRuns.map(async (run) => {
          try {
            const [runDetailsResponse, attendanceResponse] = await Promise.all([
              http.get<PayrollRunDetail>(endpoints.hr.payrollRun(run.id)),
              http.get<AttendanceRecord[]>(endpoints.hr.attendanceRecords, {
                params: {
                  date_from: dateFrom,                  
                  date_to: dateTo,                                 
                  employee_id: run.employee.id,
                },
              }),
            ]);
            const summary = buildRunSummary(
              runDetailsResponse.data,
              attendanceResponse.data ?? [],
              currentPeriodRange              
            );
            const calculated = calculatePayableTotal(summary);
            return {
              id: run.id,
              payable:
                calculated ?? parseAmount(runDetailsResponse.data.net_total ?? run.net_total),
            };
          } catch {
            return { id: run.id, payable: parseAmount(run.net_total) };
          }
        })
      );

      if (cancelled) {
        return;
      }

      setRunPayables((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result) {
            next[result.id] = result.payable;
          }
        });
        return next;
      });
    }

    loadPayables();
    return () => {
      cancelled = true;
    };
  }, [periodRange, runPayables, runs]);

  useEffect(() => {
    let cancelled = false;

    async function loadHrUser() {
      try {
        const response = await http.get<PayrollUser[]>(endpoints.users);
        const users = response.data ?? [];
        const hrUser = users.find((user) =>
          (user.roles ?? []).some(
            (role) => (role.slug || role.name || "").toLowerCase() === "hr"
          )
        );
        if (!cancelled) {
          setHrName(formatUserName(hrUser));
        }
      } catch {
        if (!cancelled) {
          setHrName("-");
        }
      }
    }

    loadHrUser();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleMarkPaid() {
    if (!selectedRun?.id) {
      return;      
    }
    try {
      await markPaidMutation.mutateAsync(selectedRun.id);
      notifications.show({
        title: "Payroll marked as paid",
        message: "تم تسجيل الراتب كمدفوع.",
      });
      runsQuery.refetch();
      runDetailsQuery.refetch();
    } catch {
      notifications.show({
        title: "Update failed",
        message: "تعذر تحديث حالة الراتب.",
        color: "red",
      });
    }
  }

  useEffect(() => {
    autoGeneratedRef.current = false;
  }, [periodId]);

  useEffect(() => {
    if (!periodId || autoGeneratedRef.current || !canGenerate) {
      return;
    }    
    if (runsLoading || runsFetching) {
      return;
    }
    if (runsCount > 0) {
      return;
    }
    if (periodStatus && periodStatus !== "draft") {
      return;
    }

    autoGeneratedRef.current = true;    
    generateMutation
      .mutateAsync()
      .then(() => {
        notifications.show({
          title: "Payroll generated",
          message: "تم توليد الرواتب تلقائيًا.",
        });
        runsQuery.refetch();
      })
      .catch(() => {
        notifications.show({
          title: "Generate failed",
          message: "لم يتم توليد الرواتب تلقائيًا.",
          color: "red",
        });
      });
  }, [
    canGenerate,
    generateMutation,
    periodId,    
    periodStatus,
    runsCount,
    runsFetching,
    runsLoading,
    runsQuery,
  ]);

  const shellCopy = useMemo(
    () => ({
      en: { title: contentMap.en.title, subtitle: contentMap.en.subtitle },
      ar: { title: contentMap.ar.title, subtitle: contentMap.ar.subtitle },
    }),
    []
  );

  if (
    isForbiddenError(runsQuery.error) ||
    isForbiddenError(runDetailsQuery.error) ||
    isForbiddenError(periodsQuery.error)
  ) {
    return <AccessDenied />;
  }

  async function fetchPayslipPngBlob(runId: number): Promise<Blob> {
    const url = endpoints.hr.payrollRunPayslipPng(runId);    
    const res = await http.get(url, {
      responseType: "blob",
      headers: { Accept: "image/png" },
      validateStatus: (s: number) => s >= 200 && s < 300,
    });
    const blob = res.data as Blob;
    const ct = (blob.type || String(res.headers["content-type"] || "")).toLowerCase();
    if (!ct.includes("image/png")) {
      const txt = await blob.text().catch(() => "");
      throw new Error(`Non-PNG response: ${ct}. ${txt.slice(0, 200)}`);
    }
    // Verify PNG signature
    const headBuf = await blob.slice(0, 8).arrayBuffer();
    const sig = Array.from(new Uint8Array(headBuf));
    const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
    const ok = pngSig.every((b, idx) => sig[idx] === b);
    if (!ok) {
      const txt = await blob.text().catch(() => "");
      throw new Error(`Invalid PNG signature. ${txt.slice(0, 200)}`);
    }
    return blob;
  }

  async function handleSavePng(runId: number) {
    try {
      const blob = await fetchPayslipPngBlob(runId);      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `payslip-${runId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Save failed",
        message: "تعذر حفظ كشف المرتب.",        
        color: "red",
      });
    }
  }
  async function handleLockPeriod() {
    if (!periodId) {
      return;
    }
    try {
      await lockMutation.mutateAsync();
      notifications.show({
        title: "Period locked",
        message: "تم قفل فترة الرواتب.",
      });
      runsQuery.refetch();
      runDetailsQuery.refetch();
    } catch (error) {      
      notifications.show({
        title: "Lock failed",
        message: formatApiError(error) || "تعذر قفل الفترة.",        
        color: "red",
      });
    }
  }

  return (    
    <DashboardShell copy={shellCopy} className="payroll-period-details-page">
      {({ language, isArabic }) => {
        const content = contentMap[language];
        const statusLabel =
          periodStatus && content.status[periodStatus as keyof typeof content.status]
            ? content.status[periodStatus as keyof typeof content.status]
            : periodStatus;
        const runStatusLabel =
          runDetailsQuery.data?.status &&
          content.status[runDetailsQuery.data.status as keyof typeof content.status]
            ? content.status[runDetailsQuery.data.status as keyof typeof content.status]
            : runDetailsQuery.data?.status;

        const rows = filteredRuns.map((run) => {
          const payableValue = runPayables[run.id];
          return (
            <tr key={run.id}>
              <td>{run.employee.full_name}</td>
              <td>{formatMoney(run.earnings_total)}</td>
              <td>{formatMoney(run.deductions_total)}</td>
              <td>{formatMoney(payableValue ?? run.net_total)}</td>
              <td>{formatMoney(payableValue ?? run.net_total)}</td>
              <td>
                <button
                  type="button"
                  className="table-action"
                  onClick={() => setSelectedRun(run)}
                >
                  {content.table.view}
                </button>
              </td>
            </tr>
          );
        });

        return (
          <div
            className="payroll-period-details__content"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <section className="panel hero-panel">
              <div className="panel__header payroll-period-details__header">
                <div>
                  <h2>{content.runsTitle}</h2>
                  <p>{content.runsSubtitle}</p>
                </div>
                {periodStatus && (
                  <span
                    className={`status-pill status-pill--${periodStatus}`}
                    aria-label={`${content.statusLabel}: ${statusLabel}`}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>
              <div className="payroll-period-details__meta">
                {periodInfo && (
                  <span className="pill">
                    {content.periodLabel}: {periodInfo.period_type} · {periodInfo.start_date} →{" "}
                    {periodInfo.end_date}
                  </span>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.searchLabel}</h2>
                  <p>{content.searchPlaceholder}</p>
                </div>
                <div className="panel-actions panel-actions--right">
                  {periodStatus === "draft" && (
                    <button
                      type="button"
                      className={`action-button ${
                        lockMutation.isPending ? "action-button--disabled" : ""
                      }`}
                      onClick={handleLockPeriod}
                      disabled={lockMutation.isPending}
                    >
                      {lockMutation.isPending ? content.locking : content.lockPeriod}
                    </button>
                  )}
                </div>
              </div>
              <div className="filters-grid">
                <label className="field field--full">
                  <span>{content.searchLabel}</span>
                  <input
                    value={search}
                    placeholder={content.searchPlaceholder}
                    onChange={(event) => setSearch(event.currentTarget.value)}
                  />
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.runsTitle}</h2>
                  <p>{content.runsSubtitle}</p>
                </div>
              </div>
              {runsQuery.isLoading ? (
                <p className="helper-text">{content.loadingRuns}</p>
              ) : filteredRuns.length === 0 ? (
                <p className="helper-text">{content.emptyRuns}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{content.table.employee}</th>
                        <th>{content.table.earnings}</th>
                        <th>{content.table.deductions}</th>
                        <th>{content.table.net}</th>
                        <th>{content.table.payable}</th>
                        <th>{content.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{content.detailsTitle}</h2>
                  <p>{content.detailsSubtitle}</p>
                </div>
                {selectedRun && (
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => setSelectedRun(null)}
                  >
                    {content.closeDetails}
                  </button>
                )}
              </div>
              {runDetailsQuery.isLoading && selectedRun ? (
                <p className="helper-text">{content.loadingDetails}</p>
              ) : runDetailsQuery.data ? (
                <div className="payroll-period-details__details">
                  <div className="payroll-period-details__detail-header">
                    <div>
                      <h3>{runDetailsQuery.data.employee.full_name}</h3>
                      <span className="helper-text">
                        {runDetailsQuery.data.employee.employee_code}
                      </span>
                    </div>
                    {runStatusLabel && (
                      <span
                        className={`status-pill status-pill--${runDetailsQuery.data.status}`}
                      >
                        {runStatusLabel}
                      </span>
                    )}
                  </div>

                  <div className="payroll-period-details__detail-summary">
                    <div>
                      <span className="helper-text">{content.basic}</span>
                      <strong>
                        {formatMoney(
                          getBasicFromLines(runDetailsQuery.data.lines) ??
                            runDetailsQuery.data.earnings_total
                        )}
                      </strong>
                    </div>
                    {payableTotal != null && (
                      <div>
                        <span className="helper-text">{content.payableTotal}</span>
                        <strong>{formatMoney(payableTotal)}</strong>
                      </div>
                    )}
                  </div>

                  {runSummary && (
                    <div className="payroll-period-details__summary-grid">
                      <div>
                        <span className="helper-text">
                          {content.summary.attendanceDays}
                        </span>
                        <strong>{runSummary.presentDays}</strong>
                      </div>
                      <div>
                        <span className="helper-text">
                          {content.summary.absenceDays}
                        </span>
                        <strong>{runSummary.absentDays}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.summary.lateMinutes}</span>
                        <strong>{runSummary.lateMinutes}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.summary.bonuses}</span>
                        <strong>{formatMoney(runSummary.bonuses)}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.summary.commissions}</span>
                        <strong>{formatMoney(runSummary.commissions)}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.summary.deductions}</span>
                        <strong>{formatMoney(runSummary.deductions)}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.summary.advances}</span>
                        <strong>{formatMoney(runSummary.advances)}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.payableTotal}</span>
                        <strong>{formatMoney(payableTotal ?? 0)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{content.linesTable.line}</th>
                          <th>{content.linesTable.type}</th>
                          <th>{content.linesTable.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runDetailsQuery.data.lines.map((line) => (
                          <tr key={line.id}>
                            <td>{line.name}</td>
                            <td>{line.type}</td>
                            <td>{formatMoney(line.amount)}</td>
                          </tr>
                        ))}
                        {runSummary && (
                          <tr>
                            <td colSpan={2}>
                              <strong>{content.payableTotal}</strong>
                            </td>
                            <td>
                              <strong>{formatMoney(payableTotal ?? 0)}</strong>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="payroll-period-details__footer">
                    <div className="payroll-period-details__footer-grid">
                      <div>
                        <span className="helper-text">{content.company}</span>
                        <strong>{meQuery.data?.company.name ?? "-"}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.manager}</span>
                        <strong>{managerName}</strong>
                      </div>
                      <div>
                        <span className="helper-text">{content.hr}</span>
                        <strong>{hrName}</strong>
                      </div>
                    </div>
                    <div className="panel-actions">
                      <button
                        type="button"
                        className={`action-button ${
                          runDetailsQuery.data.status === "paid" ||
                          markPaidMutation.isPending
                            ? "action-button--disabled"
                            : ""
                        }`}
                        onClick={handleMarkPaid}
                        disabled={
                          runDetailsQuery.data.status === "paid" ||
                          markPaidMutation.isPending
                        }
                      >
                        {runDetailsQuery.data.status === "paid"
                          ? content.markPaidDone
                          : content.markPaid}
                      </button>
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => handleSavePng(runDetailsQuery.data.id)}
                      >
                        {content.savePng}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="helper-text">{content.emptyDetails}</p>
              )}
            </section>
          </div>
        );
      }}
    </DashboardShell>
  );
}