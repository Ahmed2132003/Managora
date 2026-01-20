import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
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
  useAttendanceQrGenerateMutation,
  useAttendanceRecordsQuery,
  useDepartments,
  useEmployees,
} from "../../shared/hr/hooks";

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "early_leave", label: "Early leave" },
  { value: "absent", label: "Absent" },
  { value: "incomplete", label: "Incomplete" },
];

const statusColors: Record<string, string> = {
  present: "green",
  late: "orange",
  early_leave: "yellow",
  absent: "red",
  incomplete: "blue",
};

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function HRAttendancePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [qrWorksiteId, setQrWorksiteId] = useState<number | undefined>(undefined);
  const [qrShiftId, setQrShiftId] = useState<number | undefined>(undefined);
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState<number | undefined>(60);
  const [qrToken, setQrToken] = useState<{
    token: string;
    expires_at: string;
    worksite_id: number;
    shift_id: number;
  } | null>(null);

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees({

    search: employeeSearch,
    filters: { departmentId: departmentId ?? undefined },
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })),
    [departmentsQuery.data]
  );

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map((employee) => ({
        value: String(employee.id),
        label: `${employee.full_name} (${employee.employee_code})`,
      })),
    [employeesQuery.data]
  );

  const attendanceQuery = useAttendanceRecordsQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    departmentId: departmentId ?? undefined,
    employeeId: employeeId ?? undefined,
    status: status ?? undefined,
    search: employeeSearch || undefined,
  });
  const qrGenerateMutation = useAttendanceQrGenerateMutation();

  if (
    isForbiddenError(attendanceQuery.error) ||
    isForbiddenError(departmentsQuery.error) ||
    isForbiddenError(employeesQuery.error)
  ) {
    return <AccessDenied />;
  }

  async function handleGenerateQr() {
    if (!qrWorksiteId || !qrShiftId) {
      notifications.show({
        title: "Missing info",
        message: "من فضلك أدخل Worksite ID و Shift ID.",
        color: "red",
      });
      return;
    }

    try {
      const token = await qrGenerateMutation.mutateAsync({
        worksite_id: qrWorksiteId,
        shift_id: qrShiftId,
        expires_in_minutes: qrExpiryMinutes,
      });
      setQrToken(token);
      notifications.show({
        title: "QR generated",
        message: "تم إنشاء كود QR بنجاح.",
      });
    } catch {
      notifications.show({
        title: "Failed to generate QR",
        message: "حدث خطأ أثناء إنشاء كود QR.",
        color: "red",        
      });
    }
  }

  return (    
    <Stack gap="lg">
      <Title order={3}>Attendance</Title>
      <Card withBorder radius="md" p="md">
        <Group align="flex-end" gap="md">        
          <TextInput
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.currentTarget.value)}
          />
          <TextInput
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.currentTarget.value)}
          />
          <Select
            label="Department"
            placeholder="All departments"
            data={departmentOptions}
            value={departmentId}
            onChange={setDepartmentId}
            clearable
            searchable
          />
          <Select
            label="Employee"
            placeholder="Search employee"
            data={employeeOptions}
            value={employeeId}
            onChange={setEmployeeId}
            searchable
            clearable
            onSearchChange={setEmployeeSearch}
            searchValue={employeeSearch}
          />
          <Select
            label="Status"
            placeholder="All"
            data={statusOptions}
            value={status}
            onChange={setStatus}
            clearable
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Text fw={600}>Generate QR token</Text>
          <Group align="flex-end" gap="md">
            <NumberInput
              label="Worksite ID"
              placeholder="مثال: 2"
              value={qrWorksiteId}
              onChange={(value) =>
                setQrWorksiteId(typeof value === "number" ? value : undefined)
              }
              min={1}
              hideControls
            />
            <NumberInput
              label="Shift ID"
              placeholder="مثال: 1"
              value={qrShiftId}
              onChange={(value) =>
                setQrShiftId(typeof value === "number" ? value : undefined)
              }
              min={1}
              hideControls
            />
            <NumberInput
              label="Expires (minutes)"
              placeholder="60"
              value={qrExpiryMinutes}
              onChange={(value) =>
                setQrExpiryMinutes(typeof value === "number" ? value : undefined)
              }
              min={1}
              max={1440}
              hideControls
            />
            <Button onClick={handleGenerateQr} loading={qrGenerateMutation.isPending}>
              Generate
            </Button>
          </Group>
          {qrToken && (
            <Stack gap={4}>
              <TextInput label="Token" value={qrToken.token} readOnly />
              <Group gap="md">
                <Text size="sm" c="dimmed">
                  Expires at: {new Date(qrToken.expires_at).toLocaleString()}
                </Text>
                <Text size="sm" c="dimmed">
                  Worksite: {qrToken.worksite_id} · Shift: {qrToken.shift_id}
                </Text>
              </Group>
            </Stack>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        {attendanceQuery.isLoading ? (            
          <Stack gap="sm">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={32} radius="sm" />
            ))}
          </Stack>
        ) : (attendanceQuery.data ?? []).length === 0 ? (
          <Stack align="center" py="lg">
            <Text c="dimmed">No attendance records yet.</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Check-in</Table.Th>
                <Table.Th>Check-out</Table.Th>
                <Table.Th>Late mins</Table.Th>
                <Table.Th>Early mins</Table.Th>
                <Table.Th>Method</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>                
              {(attendanceQuery.data ?? []).map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text fw={600}>{record.employee.full_name}</Text>
                      <Text size="xs" c="dimmed">
                        {record.employee.employee_code}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>{record.date}</Table.Td>
                  <Table.Td>{formatTime(record.check_in_time)}</Table.Td>
                  <Table.Td>{formatTime(record.check_out_time)}</Table.Td>
                  <Table.Td>{record.late_minutes || "-"}</Table.Td>
                  <Table.Td>{record.early_leave_minutes || "-"}</Table.Td>
                  <Table.Td>{record.method}</Table.Td>
                  <Table.Td>
                    <Badge color={statusColors[record.status] ?? "gray"}>
                      {record.status}
                    </Badge>
                  </Table.Td>                  
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}