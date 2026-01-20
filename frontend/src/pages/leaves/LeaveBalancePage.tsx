import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMemo } from "react";
import { useMyLeaveBalancesQuery } from "../../shared/hr/hooks";

function formatDays(value: string | number) {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toFixed(2);
}

export function LeaveBalancePage() {
  const balancesQuery = useMyLeaveBalancesQuery();

  const totals = useMemo(() => {
    const balances = balancesQuery.data ?? [];
    return balances.reduce(
      (acc, balance) => {
        acc.allocated += Number(balance.allocated_days);
        acc.used += Number(balance.used_days);
        acc.remaining += Number(balance.remaining_days);
        return acc;
      },
      { allocated: 0, used: 0, remaining: 0 }
    );
  }, [balancesQuery.data]);

  return (
    <Stack gap="lg">
      <Title order={3}>رصيدي من الإجازات</Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder radius="md">
          <Text size="sm" c="dimmed">
            الرصيد المتبقي
          </Text>
          <Text fw={700} size="xl">
            {formatDays(totals.remaining)}
          </Text>
        </Card>
        <Card withBorder radius="md">
          <Text size="sm" c="dimmed">
            الرصيد المستخدم
          </Text>
          <Text fw={700} size="xl">
            {formatDays(totals.used)}
          </Text>
        </Card>
        <Card withBorder radius="md">
          <Text size="sm" c="dimmed">
            الرصيد المخصص
          </Text>
          <Text fw={700} size="xl">
            {formatDays(totals.allocated)}
          </Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>تفاصيل الرصيد حسب النوع</Text>
          {balancesQuery.isLoading && <Text c="dimmed">تحميل...</Text>}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>نوع الإجازة</Table.Th>
              <Table.Th>السنة</Table.Th>
              <Table.Th>المخصص</Table.Th>
              <Table.Th>المستخدم</Table.Th>
              <Table.Th>المتبقي</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(balancesQuery.data ?? []).map((balance) => (
              <Table.Tr key={balance.id}>
                <Table.Td>{balance.leave_type.name}</Table.Td>
                <Table.Td>{balance.year}</Table.Td>
                <Table.Td>{formatDays(balance.allocated_days)}</Table.Td>
                <Table.Td>{formatDays(balance.used_days)}</Table.Td>
                <Table.Td>{formatDays(balance.remaining_days)}</Table.Td>
              </Table.Tr>
            ))}
            {!balancesQuery.isLoading && (balancesQuery.data ?? []).length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    لا يوجد رصيد مسجل بعد.
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