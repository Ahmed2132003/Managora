import { Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { useHrActionsQuery } from "../../shared/hr/hooks";

const actionColors: Record<string, string> = {
  warning: "yellow",
  deduction: "red",
};

function formatValue(value: string) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num.toFixed(2);
}

export function HRActionsPage() {
  const actionsQuery = useHrActionsQuery();

  if (isForbiddenError(actionsQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Title order={3}>HR Actions</Title>

      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>الإجراءات المسجلة</Text>
          {actionsQuery.isLoading && <Text c="dimmed">تحميل...</Text>}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>الموظف</Table.Th>
              <Table.Th>القاعدة</Table.Th>
              <Table.Th>الإجراء</Table.Th>
              <Table.Th>القيمة</Table.Th>
              <Table.Th>السبب</Table.Th>
              <Table.Th>الفترة</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(actionsQuery.data ?? []).map((action) => (
              <Table.Tr key={action.id}>
                <Table.Td>{action.employee.full_name}</Table.Td>
                <Table.Td>{action.rule.name}</Table.Td>
                <Table.Td>
                  <Badge color={actionColors[action.action_type] ?? "gray"}>
                    {action.action_type}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatValue(action.value)}</Table.Td>
                <Table.Td>{action.reason}</Table.Td>
                <Table.Td>
                  {action.period_start && action.period_end
                    ? `${action.period_start} → ${action.period_end}`
                    : "-"}
                </Table.Td>
              </Table.Tr>
            ))}
            {!actionsQuery.isLoading && (actionsQuery.data ?? []).length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    لا توجد إجراءات بعد.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}