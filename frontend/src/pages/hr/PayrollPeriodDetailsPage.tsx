import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useLockPayrollPeriod,
  usePayrollRun,
  usePayrollPeriods,
  usePeriodRuns,
} from "../../shared/hr/hooks";
import type { PayrollRun } from "../../shared/hr/hooks";

import { endpoints } from "../../shared/api/endpoints";
import { http } from "../../shared/api/http";

const statusColors: Record<string, string> = {
  draft: "yellow",
  locked: "green",
  approved: "blue",
};

function formatMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isNaN(amount) ? "-" : amount.toFixed(2);
}

function getBasicFromLines(lines: { name: string; code: string; amount: string }[]) {
  const basicLine = lines.find((line) => {
    const name = line.name.toLowerCase();
    const code = line.code.toLowerCase();
    return name.includes("basic") || code.includes("basic");
  });
  return basicLine?.amount ?? null;
}

export function PayrollPeriodDetailsPage() {
  const params = useParams();
  const periodId = params.id ? Number(params.id) : null;
  const [search, setSearch] = useState("");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  const runsQuery = usePeriodRuns(periodId);
  const periodsQuery = usePayrollPeriods();
  const runDetailsQuery = usePayrollRun(selectedRun?.id ?? null);
  const lockMutation = useLockPayrollPeriod(periodId);

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);  
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
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `payslip-${runId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      notifications.show({
        title: "Download failed",
        message: "تعذر تنزيل كشف المرتب.",
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
    } catch {
      notifications.show({
        title: "Lock failed",
        message: "تعذر قفل الفترة.",
        color: "red",
      });
    }
  }

  const rows = filteredRuns.map((run) => (
    <Table.Tr key={run.id}>
      <Table.Td>{run.employee.full_name}</Table.Td>
      <Table.Td>{formatMoney(run.earnings_total)}</Table.Td>
      <Table.Td>{formatMoney(run.earnings_total)}</Table.Td>
      <Table.Td>{formatMoney(run.deductions_total)}</Table.Td>
      <Table.Td>{formatMoney(run.net_total)}</Table.Td>
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
  ));

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
                  <Table.Th>Basic</Table.Th>
                  <Table.Th>Earnings total</Table.Th>
                  <Table.Th>Deductions total</Table.Th>
                  <Table.Th>Net</Table.Th>
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
              <Text c="dimmed" size="sm">
                Net: {formatMoney(runDetailsQuery.data.net_total)}
              </Text>
            </Group>

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
              </Table.Tbody>
            </Table>
          </Stack>
        ) : (
          <Text c="dimmed">اختر موظفًا لعرض التفاصيل.</Text>
        )}
      </Drawer>
    </Stack>
  );
}