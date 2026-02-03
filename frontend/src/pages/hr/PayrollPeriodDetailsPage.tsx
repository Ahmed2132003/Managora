import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Skeleton,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,  
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../shared/api/errors";
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

const statusColors: Record<string, string> = {
  draft: "yellow",
  locked: "green",
  approved: "blue",
  paid: "teal",
};

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

  if (
    isForbiddenError(runsQuery.error) ||
    isForbiddenError(runDetailsQuery.error) ||
    isForbiddenError(periodsQuery.error)
  ) {
    return <AccessDenied />;
  }

  async function handleDownload(runId: number) {
    try {
      const response = await http.get(endpoints.hr.payrollRunPayslip(runId), {
        responseType: "blob",
        headers: { Accept: "application/pdf" },
        validateStatus: (s) => s >= 200 && s < 300,
      });

      const blob = response.data as Blob;

      // ✅ 1) تأكد content-type
      const ct = (blob.type || "").toLowerCase();
      if (!ct.includes("application/pdf")) {
        // حاول نقرأ رسالة الخطأ
        const text = await blob.text().catch(() => "");
        throw new Error(`Non-PDF response: ${ct}. ${text?.slice(0, 200) ?? ""}`);
      }

      // ✅ 2) تأكد فعليًا إن أول bytes = %PDF
      const headBuf = await blob.slice(0, 4).arrayBuffer();
      const head = new TextDecoder("ascii").decode(new Uint8Array(headBuf));
      if (head !== "%PDF") {
        const text = await blob.text().catch(() => "");
        throw new Error(`Invalid PDF signature. ${text?.slice(0, 200) ?? ""}`);
      }

      // ✅ 3) اسم الملف من Content-Disposition لو موجود
      const cd = (response.headers["content-disposition"] ||
        response.headers["Content-Disposition"] ||
        "") as string;

      let filename = `payslip-${runId}.pdf`;
      const match = /filename="([^"]+)"/i.exec(cd);
      if (match?.[1]) filename = match[1];

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      notifications.show({
        title: "Download failed",
        message: "تعذر تنزيل كشف المرتب (الملف غير صالح أو يوجد خطأ بالسيرفر).",
        color: "red",
      });
      // مفيد أثناء التطوير
      console.error(e);
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
    } catch {
      notifications.show({
        title: "Lock failed",
        message: "تعذر قفل الفترة.",
        color: "red",
      });
    }
  }

  const rows = filteredRuns.map((run) => {
    const payableValue = runPayables[run.id];
    return (
    <Table.Tr key={run.id}>
      <Table.Td>{run.employee.full_name}</Table.Td>
      <Table.Td>{formatMoney(run.earnings_total)}</Table.Td>      
      <Table.Td>{formatMoney(run.deductions_total)}</Table.Td>
      <Table.Td>{formatMoney(payableValue ?? run.net_total)}</Table.Td>
      <Table.Td>{formatMoney(payableValue ?? run.net_total)}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button size="xs" variant="light" onClick={() => setSelectedRun(run)}>
            View details
          </Button>
          <Button size="xs" variant="subtle" onClick={() => handleDownload(run.id)}>
            Download PDF
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Payroll Period Runs</Title>
        {periodStatus && (
          <Badge color={statusColors[periodStatus] ?? "gray"} variant="light">
            {periodStatus}
          </Badge>
        )}
      </Group>
      {periodInfo && (
        <Text c="dimmed" size="sm">
          {periodInfo.period_type} · {periodInfo.start_date} → {periodInfo.end_date}
        </Text>
      )}
      <Card withBorder radius="md" p="md">
        <Group align="flex-end" gap="md">
          <TextInput
            label="Search"
            placeholder="Search by name"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {periodStatus === "draft" && (
            <Button
              color="red"
              onClick={handleLockPeriod}
              loading={lockMutation.isPending}
            >
              Lock period
            </Button>
          )}
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Text fw={600}>Runs</Text>
          {runsQuery.isLoading ? (
            <Skeleton height={160} />
          ) : filteredRuns.length === 0 ? (
            <Text c="dimmed">لا توجد رواتب مطابقة.</Text>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Earnings total</Table.Th>
                  <Table.Th>Deductions total</Table.Th>
                  <Table.Th>Net</Table.Th>
                  <Table.Th>الإجمالي المستحق</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>

      <Drawer
        opened={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        position="right"
        size="lg"
        title="Run details"
      >
        {runDetailsQuery.isLoading ? (
          <Skeleton height={160} />
        ) : runDetailsQuery.data ? (
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{runDetailsQuery.data.employee.full_name}</Text>
                <Text c="dimmed" size="sm">
                  {runDetailsQuery.data.employee.employee_code}
                </Text>
              </div>
              <Badge color={statusColors[runDetailsQuery.data.status] ?? "gray"}>
                {runDetailsQuery.data.status}
              </Badge>
            </Group>

            <Group gap="md">
              <Text>Basic</Text>
              <Text fw={600}>
                {formatMoney(
                  getBasicFromLines(runDetailsQuery.data.lines) ??
                    runDetailsQuery.data.earnings_total
                )}
              </Text>
              {payableTotal != null && (                
                <Text c="dimmed" size="sm">
                  الإجمالي المستحق: {formatMoney(payableTotal)}                  
                </Text>
              )}
            </Group>

            {runSummary && (
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                <div>
                  <Text size="sm" c="dimmed">
                    Attendance days
                  </Text>
                  <Text fw={600}>{runSummary.presentDays}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Absence days
                  </Text>
                  <Text fw={600}>{runSummary.absentDays}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Late minutes
                  </Text>
                  <Text fw={600}>{runSummary.lateMinutes}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Bonuses
                  </Text>
                  <Text fw={600}>{formatMoney(runSummary.bonuses)}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Deductions
                  </Text>
                  <Text fw={600}>{formatMoney(runSummary.deductions)}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Advances
                  </Text>
                  <Text fw={600}>{formatMoney(runSummary.advances)}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    الإجمالي المستحق (Payable)
                  </Text>
                  <Text fw={600}>{formatMoney(payableTotal ?? 0)}</Text>                  
                </div>
              </SimpleGrid>
            )}

            <Table withTableBorder>              
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Line</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {runDetailsQuery.data.lines.map((line) => (
                  <Table.Tr key={line.id}>
                    <Table.Td>{line.name}</Table.Td>
                    <Table.Td>{line.type}</Table.Td>
                    <Table.Td>{formatMoney(line.amount)}</Table.Td>
                  </Table.Tr>
                ))}
                {runSummary && (
                  <Table.Tr>
                    <Table.Td colSpan={2}>
                      <Text fw={600}>الإجمالي المستحق (Payable)</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>{formatMoney(payableTotal ?? 0)}</Text>                      
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            <Stack gap="xs">
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                <div>
                  <Text size="sm" c="dimmed">
                    Company
                  </Text>
                  <Text fw={600}>{meQuery.data?.company.name ?? "-"}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    Manager
                  </Text>
                  <Text fw={600}>{managerName}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    HR
                  </Text>
                  <Text fw={600}>{hrName}</Text>
                </div>
              </SimpleGrid>
              <Button
                color="green"
                onClick={handleMarkPaid}
                loading={markPaidMutation.isPending}
                disabled={runDetailsQuery.data.status === "paid"}
              >
                تم الدفع
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Text c="dimmed">اختر موظفًا لعرض التفاصيل.</Text>
        )}
      </Drawer>
    </Stack>
  );
}
