import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { isForbiddenError } from "../../shared/api/errors";
import { useDepartments, useEmployees } from "../../shared/hr/hooks";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
];

const statusColors: Record<string, string> = {
  active: "green",
  inactive: "gray",
  terminated: "red",
};

export function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [page] = useState(1);

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees({
    search,
    page,
    filters: {
      departmentId: departmentId ?? undefined,
      status: (status as "active" | "inactive" | "terminated") ?? undefined,
    },
  });

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((dept) => ({
        value: String(dept.id),
        label: dept.name,
      })),
    [departmentsQuery.data]
  );

  if (isForbiddenError(employeesQuery.error) || isForbiddenError(departmentsQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Employees</Title>
        <Button onClick={() => navigate("/hr/employees/new")}>Add Employee</Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group align="flex-end" gap="md">
          <TextInput
            label="Search"
            placeholder="Search by name, code, national ID"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
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
            label="Status"
            placeholder="All statuses"
            data={statusOptions}
            value={status}
            onChange={setStatus}
            clearable
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        {employeesQuery.isLoading ? (
          <Text c="dimmed">Loading employees...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Job Title</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Hire Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(employeesQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed">No employees found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (employeesQuery.data ?? []).map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td>{employee.employee_code}</Table.Td>
                    <Table.Td>{employee.full_name}</Table.Td>
                    <Table.Td>{employee.department?.name ?? "-"}</Table.Td>
                    <Table.Td>{employee.job_title?.name ?? "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColors[employee.status] ?? "gray"}>
                        {employee.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{employee.hire_date}</Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => navigate(`/hr/employees/${employee.id}`)}
                      >
                        View
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}