import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateLeaveRequestMutation,
  useLeaveTypesQuery,
} from "../../shared/hr/hooks";
import { calculateLeaveDays } from "../../shared/leaves/utils";

function formatApiError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function LeaveRequestPage() {
  const queryClient = useQueryClient();
  const leaveTypesQuery = useLeaveTypesQuery();
  const createMutation = useCreateLeaveRequestMutation();

  const [leaveTypeId, setLeaveTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const leaveTypeOptions = useMemo(() => {
    return (leaveTypesQuery.data ?? []).map((type) => ({
      value: String(type.id),
      label: `${type.name} (${type.code})`,
    }));
  }, [leaveTypesQuery.data]);

  const calculatedDays = calculateLeaveDays(startDate, endDate);

  async function handleSubmit() {
    if (!leaveTypeId || !startDate || !endDate) {
      notifications.show({
        title: "بيانات ناقصة",
        message: "يرجى اختيار نوع الإجازة وتحديد المدة.",
        color: "red",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || undefined,
      });
      notifications.show({
        title: "تم الإرسال",
        message: "تم إرسال طلب الإجازة بنجاح.",
        color: "green",
      });
      setLeaveTypeId(null);
      setStartDate("");
      setEndDate("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["leaves", "balances", "my"] });
    } catch (error) {
      notifications.show({
        title: "فشل الإرسال",
        message: formatApiError(error),
        color: "red",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>طلب إجازة</Title>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Select
            label="نوع الإجازة"
            placeholder="اختر النوع"
            data={leaveTypeOptions}
            value={leaveTypeId}
            onChange={setLeaveTypeId}
            searchable
            nothingFoundMessage="لا يوجد أنواع"
            disabled={leaveTypesQuery.isLoading}
          />

          <Group grow>
            <TextInput
              label="تاريخ البداية"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.currentTarget.value)}
            />
            <TextInput
              label="تاريخ النهاية"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.currentTarget.value)}
            />
          </Group>

          <Group justify="space-between">
            <Text c="dimmed">عدد الأيام المحسوبة</Text>
            <Text fw={600}>{calculatedDays} يوم</Text>
          </Group>

          <Textarea
            label="سبب الطلب"
            placeholder="اكتب سبب الإجازة"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            minRows={3}
          />

          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            إرسال الطلب
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}