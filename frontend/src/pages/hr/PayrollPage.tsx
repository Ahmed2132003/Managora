import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../shared/api/errors";
import {
  PayrollPeriod,
  useCreatePeriod,
  useGeneratePeriod,
  usePayrollPeriods,
} from "../../shared/hr/hooks";

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const statusColors: Record<string, string> = {
  draft: "yellow",
  locked: "green",
};

function formatPeriodLabel(period: PayrollPeriod) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

export function PayrollPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  const periodsQuery = usePayrollPeriods();
  const createPeriodMutation = useCreatePeriod();

  const periods = periodsQuery.data ?? [];
  const selectedPeriod = useMemo(() => {
    if (!month || !year) return null;
    const monthValue = Number(month);
    const yearValue = Number(year);
    return (
      periods.find(
        (period) => period.month === monthValue && period.year === yearValue
      ) ?? null
    );
  }, [month, year, periods]);
  const generatePeriodMutation = useGeneratePeriod(selectedPeriod?.id ?? null);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const options = [];
    for (let offset = -1; offset <= 1; offset += 1) {
      const value = String(now + offset);
      options.push({ value, label: value });
    }
    return options;
  }, []);

  if (isForbiddenError(periodsQuery.error)) {
    return <AccessDenied />;
  }

  async function handleCreatePeriod() {
    if (!month || !year) {
      notifications.show({
        title: "Missing info",
        message: "من فضلك اختر الشهر والسنة.",
        color: "red",
      });
      return;
    }

    try {
      const created = await createPeriodMutation.mutateAsync({
        month: Number(month),
        year: Number(year),
      });
      notifications.show({
        title: "Period created",
        message: `تم إنشاء فترة ${formatPeriodLabel(created)}.`,
      });
      periodsQuery.refetch();
    } catch {
      notifications.show({
        title: "Failed to create period",
        message: "حدث خطأ أثناء إنشاء الفترة.",
        color: "red",
      });
    }
  }

  async function handleGeneratePeriod() {
    if (!selectedPeriod) {
      notifications.show({
        title: "Select period",
        message: "اختر فترة موجودة أولاً.",
        color: "red",
      });
      return;
    }

    try {
      await generatePeriodMutation.mutateAsync();
      notifications.show({
        title: "Payroll generated",
        message: "تم توليد الرواتب بنجاح.",
      });
    } catch {
      notifications.show({
        title: "Generate failed",
        message: "لم يتم توليد الرواتب.",
        color: "red",
      });
    }
  }

  const rows = periods.map((period) => (
    <Table.Tr key={period.id}>
      <Table.Td>{formatPeriodLabel(period)}</Table.Td>
      <Table.Td>
        <Badge color={statusColors[period.status] ?? "gray"} variant="light">
          {period.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Button
          size="xs"
          variant="light"
          onClick={() => navigate(`/payroll/periods/${period.id}`)}
        >
          View runs
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="lg">
      <Title order={3}>Payroll</Title>
      <Card withBorder radius="md" p="md">
        <Group align="flex-end" gap="md">
          <Select
            label="Month"
            placeholder="Select month"
            data={monthOptions}
            value={month}
            onChange={setMonth}
            searchable
            clearable
          />
          <Select
            label="Year"
            placeholder="Select year"
            data={yearOptions}
            value={year}
            onChange={setYear}
            clearable
          />
          <Button
            onClick={handleCreatePeriod}
            loading={createPeriodMutation.isPending}
          >
            Create Period
          </Button>
          <Button
            variant="light"
            onClick={handleGeneratePeriod}
            loading={generatePeriodMutation.isPending}
            disabled={!selectedPeriod}
          >
            Generate
          </Button>
          {selectedPeriod && (
            <Badge color={statusColors[selectedPeriod.status] ?? "gray"}>
              {selectedPeriod.status}
            </Badge>
          )}
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Payroll periods</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => periodsQuery.refetch()}
            >
              Refresh
            </Button>
          </Group>
          {periodsQuery.isLoading ? (
            <Skeleton height={120} />
          ) : periods.length === 0 ? (
            <Text c="dimmed">لا توجد فترات رواتب بعد.</Text>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Period</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}