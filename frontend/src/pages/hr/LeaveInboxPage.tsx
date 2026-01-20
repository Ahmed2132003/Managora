import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import {
  useApproveLeaveRequestMutation,
  useLeaveApprovalsInboxQuery,
  useRejectLeaveRequestMutation,
} from "../../shared/hr/hooks";
import type { LeaveRequest } from "../../shared/hr/hooks";

const statusColors: Record<string, string> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
};

export function LeaveInboxPage() {
  const queryClient = useQueryClient();
  const inboxQuery = useLeaveApprovalsInboxQuery({ status: "pending" });
  const approveMutation = useApproveLeaveRequestMutation();
  const rejectMutation = useRejectLeaveRequestMutation();
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const rows = useMemo(() => {
    return (inboxQuery.data ?? []).map((request) => (
      <Table.Tr key={request.id}>
        <Table.Td>{request.employee?.full_name ?? "-"}</Table.Td>
        <Table.Td>{request.leave_type.name}</Table.Td>
        <Table.Td>
          {request.start_date} → {request.end_date}
        </Table.Td>
        <Table.Td>{request.days}</Table.Td>
        <Table.Td>
          <Badge color={statusColors[request.status] ?? "gray"}>
            {request.status}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Button
              size="xs"
              onClick={() => setSelected(request)}
              variant="light"
            >
              مراجعة
            </Button>
          </Group>
        </Table.Td>
      </Table.Tr>
    ));
  }, [inboxQuery.data]);

  async function handleApprove() {
    if (!selected) return;
    try {
      await approveMutation.mutateAsync(selected.id);
      notifications.show({
        title: "تمت الموافقة",
        message: "تم اعتماد الطلب.",
        color: "green",
      });
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "balances", "my"] });
    } catch (error) {
      notifications.show({
        title: "فشل الموافقة",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleReject() {
    if (!selected) return;
    try {
      await rejectMutation.mutateAsync({
        id: selected.id,
        reason: rejectReason.trim() || undefined,
      });
      notifications.show({
        title: "تم الرفض",
        message: "تم رفض الطلب.",
        color: "yellow",
      });
      setSelected(null);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["leaves", "approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
    } catch (error) {
      notifications.show({
        title: "فشل الرفض",
        message: String(error),
        color: "red",
      });
    }
  }

  if (isForbiddenError(inboxQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Title order={3}>الموافقات - الطلبات المعلقة</Title>

      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Pending Requests</Text>
          {inboxQuery.isLoading && <Text c="dimmed">تحميل...</Text>}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>الموظف</Table.Th>
              <Table.Th>نوع الإجازة</Table.Th>
              <Table.Th>التواريخ</Table.Th>
              <Table.Th>الأيام</Table.Th>
              <Table.Th>الحالة</Table.Th>
              <Table.Th>إجراء</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows}
            {!inboxQuery.isLoading && rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    لا توجد طلبات معلقة.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="مراجعة الطلب"
        centered
      >
        {selected && (
          <Stack gap="md">
            <Text>
              الموظف: <strong>{selected.employee?.full_name ?? "-"}</strong>
            </Text>
            <Text>
              النوع: <strong>{selected.leave_type.name}</strong>
            </Text>
            <Text>
              المدة:{" "}
              <strong>
                {selected.start_date} → {selected.end_date}
              </strong>
            </Text>
            <Text>عدد الأيام: {selected.days}</Text>
            {selected.reason && <Text>السبب: {selected.reason}</Text>}

            <Textarea
              label="سبب الرفض (اختياري)"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.currentTarget.value)}
              minRows={2}
            />
            <Group justify="space-between">
              <Button
                color="red"
                variant="light"
                onClick={handleReject}
                loading={rejectMutation.isPending}
              >
                رفض
              </Button>
              <Button
                onClick={handleApprove}
                loading={approveMutation.isPending}
              >
                موافقة
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}