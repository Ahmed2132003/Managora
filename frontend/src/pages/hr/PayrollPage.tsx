import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
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
  useCreatePeriod,
  useGeneratePeriod,
  useCreateSalaryStructure,
  useEmployees,
  usePayrollPeriods,
  useSalaryStructures,
  useUpdateSalaryStructure,
} from "../../shared/hr/hooks";
import type { PayrollPeriod, SalaryStructure, SalaryType } from "../../shared/hr/hooks";

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

const salaryTypeOptions: { value: SalaryType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "commission", label: "Commission" },
];

function formatPeriodLabel(period: PayrollPeriod) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

function resolveDailyRate(type: SalaryType, basicSalary: number): number | null {
  if (type === "daily") return basicSalary;
  if (type === "weekly") return basicSalary / 7;
  if (type === "commission") return null;
  return basicSalary / 30;
}

export function PayrollPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryEmployeeId, setSalaryEmployeeId] = useState<number | null>(null);
  const [salaryType, setSalaryType] = useState<SalaryType>("monthly");
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("");

  const periodsQuery = usePayrollPeriods();
  const createPeriodMutation = useCreatePeriod();
  const employeesQuery = useEmployees({});
  const salaryStructuresQuery = useSalaryStructures();
  const createSalaryStructureMutation = useCreateSalaryStructure();
  const updateSalaryStructureMutation = useUpdateSalaryStructure();

  const periods = useMemo(() => periodsQuery.data ?? [], [periodsQuery.data]);
  const salaryStructuresByEmployee = useMemo(() => {
    return new Map<number, SalaryStructure>(
      (salaryStructuresQuery.data ?? []).map((structure) => [
        structure.employee,
        structure,
      ])
    );
  }, [salaryStructuresQuery.data]);  
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

  const selectedEmployee = useMemo(() => {
    if (!salaryEmployeeId) return null;
    return (employeesQuery.data ?? []).find((employee) => employee.id === salaryEmployeeId) ?? null;
  }, [employeesQuery.data, salaryEmployeeId]);

  if (
    isForbiddenError(periodsQuery.error) ||
    isForbiddenError(employeesQuery.error) ||
    isForbiddenError(salaryStructuresQuery.error)
  ) {
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

  function openSalaryModal(employeeId: number) {
    const existing = salaryStructuresByEmployee.get(employeeId);
    setSalaryEmployeeId(employeeId);
    setSalaryType(existing?.salary_type ?? "monthly");
    setBasicSalary(existing ? Number(existing.basic_salary) : 0);
    setCurrency(existing?.currency ?? "");
    setSalaryModalOpen(true);
  }

  async function handleSaveSalary() {
    if (!salaryEmployeeId) {
      return;
    }
    const payload = {
      employee: salaryEmployeeId,
      basic_salary: basicSalary,
      salary_type: salaryType,
      currency: currency ? currency : null,
    };

    try {
      const existing = salaryStructuresByEmployee.get(salaryEmployeeId);
      if (existing) {
        await updateSalaryStructureMutation.mutateAsync({
          id: existing.id,
          payload,
        });
      } else {
        await createSalaryStructureMutation.mutateAsync(payload);
      }
      notifications.show({
        title: "Salary saved",
        message: "تم حفظ بيانات الراتب.",
      });
      salaryStructuresQuery.refetch();
      setSalaryModalOpen(false);
    } catch {
      notifications.show({
        title: "Save failed",
        message: "تعذر حفظ بيانات الراتب.",
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

  const employeeRows = (employeesQuery.data ?? []).map((employee) => {
    const structure = salaryStructuresByEmployee.get(employee.id);
    const dailyRate = structure
      ? resolveDailyRate(structure.salary_type, Number(structure.basic_salary))
      : null;
    const salaryTypeLabel = structure
      ? salaryTypeOptions.find((option) => option.value === structure.salary_type)?.label ?? structure.salary_type
      : "—";

    return (
      <Table.Tr key={employee.id}>
        <Table.Td>{employee.employee_code}</Table.Td>
        <Table.Td>{employee.full_name}</Table.Td>
        <Table.Td>{salaryTypeLabel}</Table.Td>
        <Table.Td>{structure ? Number(structure.basic_salary).toFixed(2) : "—"}</Table.Td>
        <Table.Td>{structure?.currency ?? "—"}</Table.Td>
        <Table.Td>{dailyRate === null ? "—" : dailyRate.toFixed(2)}</Table.Td>
        <Table.Td>
          <Button size="xs" variant="light" onClick={() => openSalaryModal(employee.id)}>
            {structure ? "Edit" : "Set salary"}
          </Button>
        </Table.Td>
      </Table.Tr>
    );
  });

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

      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Employee salaries</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                employeesQuery.refetch();
                salaryStructuresQuery.refetch();
              }}
            >
              Refresh
            </Button>
          </Group>
          {employeesQuery.isLoading || salaryStructuresQuery.isLoading ? (
            <Skeleton height={160} />
          ) : (employeesQuery.data ?? []).length === 0 ? (
            <Text c="dimmed">لا يوجد موظفون حتى الآن.</Text>
          ) : (
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Salary type</Table.Th>
                  <Table.Th>Base salary</Table.Th>
                  <Table.Th>Currency</Table.Th>
                  <Table.Th>Daily rate</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{employeeRows}</Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>

      <Modal
        opened={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        title={selectedEmployee ? `Payroll for ${selectedEmployee.full_name}` : "Payroll details"}
        centered
      >
        <Stack>
          <Select
            label="Salary type"
            placeholder="Select salary type"
            data={salaryTypeOptions}
            value={salaryType}
            onChange={(value) => setSalaryType((value as SalaryType) ?? "monthly")}
            searchable
          />
          <NumberInput
            label="Base salary"
            value={basicSalary}
            onChange={(value) =>
              setBasicSalary(typeof value === "number" ? value : Number(value) || 0)
            }
            min={0}
            hideControls
            thousandSeparator=","
          />          
          <TextInput
            label="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSalary}
              loading={
                createSalaryStructureMutation.isPending ||
                updateSalaryStructureMutation.isPending
              }
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}