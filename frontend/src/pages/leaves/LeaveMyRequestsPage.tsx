import { Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { useMyLeaveRequestsQuery } from "../../shared/hr/hooks";

const statusColors: Record<string, string> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
};

function formatDateRange(start: string, end: string) {
  if (!start || !end) return "-";
  return `${start} → ${end}`;
}

export function LeaveMyRequestsPage() {
  const requestsQuery = useMyLeaveRequestsQuery();

  const rows = useMemo(() => {
    return (requestsQuery.data ?? []).map((request) => (
      <Table.Tr key={request.id}>
        <Table.Td>{request.leave_type.name}</Table.Td>
        <Table.Td>{formatDateRange(request.start_date, request.end_date)}</Table.Td>
        <Table.Td>{request.days}</Table.Td>
        <Table.Td>
          <Badge color={statusColors[request.status] ?? "gray"}>
            {request.status}
          </Badge>
        </Table.Td>
      </Table.Tr>
    ));
  }, [requestsQuery.data]);

  return (
    <Stack gap="lg">
      <Title order={3}>طلباتي</Title>

      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>طلبات الإجازات</Text>
          {requestsQuery.isLoading && <Text c="dimmed">تحميل...</Text>}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>نوع الإجازة</Table.Th>
              <Table.Th>التواريخ</Table.Th>
              <Table.Th>عدد الأيام</Table.Th>
              <Table.Th>الحالة</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows}
            {!requestsQuery.isLoading && rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    لا توجد طلبات بعد.
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