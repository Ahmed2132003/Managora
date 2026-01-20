import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import {
  type AttendanceActionPayload,
  type AttendanceRecord,
  useCheckInMutation,
  useCheckOutMutation,
  useMyAttendanceQuery,
} from "../../shared/hr/hooks";

const statusColors: Record<string, string> = {
  "No record": "gray",
  "Checked-in": "blue",
  Completed: "green",
};

function getTodayValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getTimeLabel(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function readGeolocation() {
  if (!navigator.geolocation) {
    return null;
  }
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export function SelfAttendancePage() {
  const queryClient = useQueryClient();
  const todayValue = useMemo(() => getTodayValue(), []);
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const [worksiteId, setWorksiteId] = useState<number | undefined>(undefined);

  const myAttendanceQuery = useMyAttendanceQuery({
    dateFrom: todayValue,
    dateTo: todayValue,
  });
  const checkInMutation = useCheckInMutation();
  const checkOutMutation = useCheckOutMutation();

  const todayRecord = useMemo<AttendanceRecord | undefined>(() => {
    return myAttendanceQuery.data?.find((record) => record.date === todayValue);
  }, [myAttendanceQuery.data, todayValue]);

  const statusLabel = todayRecord
    ? todayRecord.check_out_time
      ? "Completed"
      : "Checked-in"
    : "No record";

  const hasOpenCheckIn = Boolean(todayRecord?.check_in_time && !todayRecord?.check_out_time);

  const resolvedEmployeeId = employeeId ?? todayRecord?.employee?.id;

  async function handleAction(action: "check-in" | "check-out") {
    if (!resolvedEmployeeId || !shiftId) {        
      notifications.show({
        title: "Missing info",
        message: "من فضلك أدخل رقم الموظف والوردية قبل المتابعة.",
        color: "red",
      });
      return;
    }

    let method: AttendanceActionPayload["method"] = "manual";
    let location: { lat: number; lng: number } | null = null;

    location = await readGeolocation();
    if (!location) {
      notifications.show({
        title: "اسمح بالموقع",
        message: "لم نتمكن من قراءة الموقع، سيتم تسجيل الحضور بالطريقة اليدوية.",
        color: "yellow",
      });
    } else if (!worksiteId) {
      notifications.show({
        title: "Worksite مطلوب",
        message: "أدخل معرف الموقع لتفعيل تسجيل الحضور بالموقع. سيتم استخدام الطريقة اليدوية.",
        color: "yellow",
      });
    } else {
      method = "gps";
    }

    const payload: AttendanceActionPayload = {
      employee_id: resolvedEmployeeId,      
      shift_id: shiftId,
      method,
    };

    if (method === "gps") {
      payload.worksite_id = worksiteId;      
      payload.lat = location?.lat ?? undefined;
      payload.lng = location?.lng ?? undefined;
    }

    try {
      if (action === "check-in") {
        await checkInMutation.mutateAsync(payload);
        notifications.show({ title: "Checked in", message: "تم تسجيل الحضور بنجاح" });
      } else {
        await checkOutMutation.mutateAsync(payload);
        notifications.show({ title: "Checked out", message: "تم تسجيل الانصراف بنجاح" });
      }
      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (error) {
      notifications.show({
        title: "عملية غير مكتملة",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>My Attendance</Title>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Text c="dimmed">Status today</Text>
            <Badge color={statusColors[statusLabel] ?? "gray"}>{statusLabel}</Badge>
          </Group>
          <Group justify="space-between">
            <Text>Check-in</Text>
            <Text>{getTimeLabel(todayRecord?.check_in_time ?? null)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Check-out</Text>
            <Text>{getTimeLabel(todayRecord?.check_out_time ?? null)}</Text>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Text fw={600}>Self-service details</Text>
          <Group align="flex-end" gap="md">
            <NumberInput
              label="Employee ID"
              placeholder="مثال: 12"
              value={resolvedEmployeeId}
              onChange={(value) => setEmployeeId(typeof value === "number" ? value : undefined)}              
              min={1}
              hideControls
            />
            <NumberInput
              label="Shift ID"
              placeholder="مثال: 3"
              value={shiftId}
              onChange={(value) => setShiftId(typeof value === "number" ? value : undefined)}              
              min={1}
              hideControls
            />
            <NumberInput
              label="Worksite ID (اختياري)"
              placeholder="مطلوب لطريقة GPS"
              value={worksiteId}
              onChange={(value) => setWorksiteId(typeof value === "number" ? value : undefined)}              
              min={1}
              hideControls
            />
          </Group>
          <Group gap="md">
            <Button
              onClick={() => handleAction("check-in")}
              loading={checkInMutation.isPending}
              disabled={Boolean(todayRecord?.check_in_time)}
            >
              Check-in
            </Button>
            <Button
              variant="light"
              onClick={() => handleAction("check-out")}
              loading={checkOutMutation.isPending}
              disabled={!hasOpenCheckIn}
            >
              Check-out
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}