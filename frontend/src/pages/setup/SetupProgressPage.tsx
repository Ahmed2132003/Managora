import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Center,
  Group,
  List,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";

type SetupState = {
  roles_applied?: boolean;
  policies_applied?: boolean;
  shifts_applied?: boolean;
  coa_applied?: boolean;
};

type ApplyResponse = {
  status: "succeeded" | "already_applied" | "failed";
  detail?: string;
  error?: string;
  setup_state?: SetupState;
};

const steps = [
  { key: "roles_applied", label: "الأدوار والصلاحيات" },
  { key: "shifts_applied", label: "المواقع والشِفتات" },
  { key: "policies_applied", label: "السياسات" },
  { key: "coa_applied", label: "دليل الحسابات" },
] as const;

export function SetupProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateCode = searchParams.get("template");

  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ApplyResponse | null>(null);

  const state = response?.setup_state ?? {};

  const statusMessage = useMemo(() => {
    if (!response) {
      return "";
    }
    if (response.status === "already_applied") {
      return "القالب متطبّق بالفعل على الشركة.";
    }
    if (response.status === "succeeded") {
      return "تم تجهيز الشركة بنجاح ✅";
    }
    return "حدث خطأ أثناء تطبيق القالب.";
  }, [response]);

  useEffect(() => {
    const applyTemplate = async () => {
      if (!templateCode) {
        setResponse({
          status: "failed",
          detail: "Template code is missing.",
          error: "Template code is missing.",
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await http.post(endpoints.setup.applyTemplate, {
          template_code: templateCode,
        });
        setResponse(result.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || String(err);
        const error = err?.response?.data?.error;
        setResponse({ status: "failed", detail, error });
      } finally {
        setLoading(false);
      }
    };

    applyTemplate();
  }, [templateCode]);

  if (loading) {
    return (
      <Center>
        <Stack align="center">
          <Loader />
          <Text>جاري تطبيق القالب...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Title order={3}>التقدّم</Title>
      <Text>{statusMessage}</Text>

      <Card withBorder shadow="sm" padding="md">
        <List spacing="xs">
          {steps.map((step) => {
            const completed = state?.[step.key];
            return (
              <List.Item key={step.key}>
                <Group justify="space-between">
                  <Text>{step.label}</Text>
                  <Text>{completed ? "✅" : "⏳"}</Text>
                </Group>
              </List.Item>
            );
          })}
        </List>
      </Card>

      {response?.status === "failed" && (
        <Card withBorder padding="md" radius="md">
          <Text c="red" fw={600}>
            {response.detail}
          </Text>
          {response.error && (
            <Text c="red" size="sm" mt="xs">
              {response.error}
            </Text>
          )}
        </Card>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={() => navigate("/setup/templates")}>
          رجوع للقوالب
        </Button>
        {(response?.status === "succeeded" || response?.status === "already_applied") && (
          <Button onClick={() => navigate("/dashboard")}>اذهب للوحة التحكم</Button>
        )}
      </Group>
    </Stack>
  );
}