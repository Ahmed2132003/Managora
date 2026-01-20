import { useMemo, useState } from "react";
import axios from "axios";

import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  NumberInput,
  Stack,
  Text,
  TextInput,
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
import { useMe } from "../../shared/auth/useMe";

const statusColors: Record<string, string> = {
  "no-record": "gray",
  "checked-in": "blue",
  completed: "green",
  present: "green",
  late: "orange",
  early_leave: "yellow",
  absent: "red",
  incomplete: "blue",
};

const methodOptions = [
  { value: "gps", label: "GPS" },
  { value: "qr", label: "QR" },
  { value: "manual", label: "Manual" },
];

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

function normalizeCoordinate(value: number) {
  return Number(value.toFixed(6));
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

function formatApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;

      // DRF-style: {"detail": "..."}
      if (typeof obj.detail === "string") {
        return obj.detail;
      }

      // DRF field errors: {"field":["msg1","msg2"], ...}
      return Object.entries(obj)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            const parts = value.map((v) => String(v));
            return `${key}: ${parts.join(", ")}`;
          }
          return `${key}: ${String(value)}`;
        })
        .join(" | ");
    }

    const status = error.response?.status;
    return status ? `HTTP ${status}` : error.message;
  }

  return String(error);
}

export function SelfAttendancePage() {
  const queryClient = useQueryClient();
  const todayValue = useMemo(() => getTodayValue(), []);
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const [worksiteId, setWorksiteId] = useState<number | undefined>(undefined);
  const [method, setMethod] = useState<AttendanceActionPayload["method"]>("gps");
  const [qrToken, setQrToken] = useState("");

  const meQuery = useMe();
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
      ? "completed"
      : todayRecord.status || "checked-in"
    : "no-record";

  const hasOpenCheckIn = Boolean(
    todayRecord?.check_in_time && !todayRecord?.check_out_time
  );

  const resolvedEmployeeId =
    employeeId ?? meQuery.data?.employee?.id ?? todayRecord?.employee?.id;
  const isSelfCheckIn =
    Boolean(meQuery.data?.employee?.id) &&
    resolvedEmployeeId === meQuery.data?.employee?.id;

  async function handleAction(action: "check-in" | "check-out") {
    if (!resolvedEmployeeId) {
      notifications.show({
        title: "Missing info",
        message: "من فضلك أدخل رقم الموظف قبل المتابعة.",
        color: "red",
      });
      return;
    }

    let resolvedMethod: AttendanceActionPayload["method"] = method;
    let location: { lat: number; lng: number } | null = null;

    if (!isSelfCheckIn) {
      notifications.show({
        title: "طريقة تسجيل الحضور",
        message:
          "تسجيل الحضور لشخص آخر يجب أن يكون يدويًا. سيتم تجاهل بيانات الموقع.",
        color: "yellow",
      });
      resolvedMethod = "manual";
    } else {
      if (method === "gps") {
        location = await readGeolocation();

        if (!location) {
          notifications.show({
            title: "اسمح بالموقع",
            message:
              "لم نتمكن من قراءة الموقع، سيتم تسجيل الحضور بالطريقة اليدوية.",
            color: "yellow",
          });
          resolvedMethod = "manual";
        } else if (!worksiteId) {
          notifications.show({
            title: "Worksite مطلوب",
            message:
              "أدخل معرف الموقع لتفعيل تسجيل الحضور بالموقع. سيتم استخدام الطريقة اليدوية.",
            color: "yellow",
          });
          resolvedMethod = "manual";
        }
      }
    }

    if (resolvedMethod === "qr" && !qrToken.trim()) {
      notifications.show({
        title: "QR token مطلوب",
        message: "من فضلك أدخل كود الـ QR قبل المتابعة.",
        color: "red",
      });
      return;
    }

    if (resolvedMethod !== "qr" && !shiftId) {
      notifications.show({
        title: "Missing info",
        message: "من فضلك أدخل الوردية قبل المتابعة.",
        color: "red",
      });
      return;
    }
    const payload: AttendanceActionPayload = {
      employee_id: resolvedEmployeeId,
      shift_id: resolvedMethod === "qr" ? undefined : shiftId,
      method: resolvedMethod,
    };

    if (resolvedMethod === "gps") {
      payload.worksite_id = worksiteId;
      payload.lat = location ? normalizeCoordinate(location.lat) : undefined;
      payload.lng = location ? normalizeCoordinate(location.lng) : undefined;
    }

    if (resolvedMethod === "qr") {
      payload.qr_token = qrToken.trim();
    }

    try {
      if (action === "check-in") {
        await checkInMutation.mutateAsync(payload);
        notifications.show({
          title: "Checked in",
          message: "تم تسجيل الحضور بنجاح",
        });
      } else {
        await checkOutMutation.mutateAsync(payload);
        notifications.show({
          title: "Checked out",
          message: "تم تسجيل الانصراف بنجاح",
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["attendance", "my"] });
    } catch (error) {
      notifications.show({
        title: "عملية غير مكتملة",
        message: formatApiError(error), // ✅ هنا الإصلاح
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
            <Badge color={statusColors[statusLabel] ?? "gray"}>
              {statusLabel.replace("_", " ")}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text>Check-in</Text>
            <Text>{getTimeLabel(todayRecord?.check_in_time ?? null)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Check-out</Text>
            <Text>{getTimeLabel(todayRecord?.check_out_time ?? null)}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Late minutes</Text>
            <Text>{todayRecord?.late_minutes ?? "-"}</Text>
          </Group>
          <Group justify="space-between">
            <Text>Early leave minutes</Text>
            <Text>{todayRecord?.early_leave_minutes ?? "-"}</Text>
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
              onChange={(value) =>
                setEmployeeId(typeof value === "number" ? value : undefined)
              }
              min={1}
              hideControls
            />
            <Select
              label="Method"
              data={methodOptions}
              value={method}
              onChange={(value) =>
                setMethod((value as AttendanceActionPayload["method"]) ?? "gps")
              }
            />
            <NumberInput
              label="Shift ID"
              placeholder={method === "qr" ? "يتم أخذها من QR" : "مثال: 3"}
              value={shiftId}
              onChange={(value) =>
                setShiftId(typeof value === "number" ? value : undefined)
              }
              min={1}
              hideControls
              disabled={method === "qr"}
            />
            <NumberInput
              label="Worksite ID (اختياري)"
              placeholder="مطلوب لطريقة GPS"
              value={worksiteId}
              onChange={(value) =>
                setWorksiteId(typeof value === "number" ? value : undefined)
              }
              min={1}
              hideControls
            />
          </Group>
          {method === "qr" && (
            <TextInput
              label="QR Token"
              placeholder="الصق كود الـ QR هنا"
              value={qrToken}
              onChange={(event) => setQrToken(event.currentTarget.value)}
            />
          )}

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
