import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  List,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";

type TemplateOverview = {
  roles?: { name: string }[];
  attendance?: {
    worksites?: { name: string }[];
    shifts?: { name: string; start_time: string; end_time: string }[];
  };
  policies?: {
    rules?: { type: string }[];
  };
  accounting?: {
    chart_of_accounts_template?: string;
    mappings?: Record<string, string>;
  };
};

type SetupTemplate = {
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  version: number;
  overview?: TemplateOverview;
};

export function SetupTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SetupTemplate[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get(endpoints.setup.templates);
        setTemplates(response.data ?? []);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const selectedTemplate = templates.find((template) => template.code === selectedCode);

  if (loading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return <Text c="red">حدث خطأ أثناء تحميل القوالب: {error}</Text>;
  }

  return (
    <Stack gap="md">
      <Title order={3}>اختيار نوع الشركة</Title>
      {templates.map((template) => {
        const roles = template.overview?.roles ?? [];
        const worksites = template.overview?.attendance?.worksites ?? [];
        const shifts = template.overview?.attendance?.shifts ?? [];
        const policies = template.overview?.policies?.rules ?? [];
        const accountingTemplate = template.overview?.accounting?.chart_of_accounts_template;

        return (
          <Card
            key={template.code}
            shadow="sm"
            radius="md"
            withBorder
            padding="lg"
          >
            <Group justify="space-between" align="center">
              <Stack gap={4}>
                <Title order={4}>{template.name_ar}</Title>
                <Text size="sm" c="dimmed">
                  {template.name_en}
                </Text>
              </Stack>
              <Badge color="blue" variant="light">
                v{template.version}
              </Badge>
            </Group>
            <Text mt="sm">{template.description}</Text>
            <Divider my="md" />
            <Text fw={600} mb="xs">
              هيتعمل إيه؟
            </Text>
            <List spacing="xs" size="sm">
              <List.Item>الأدوار: {roles.map((role) => role.name).join(", ") || "-"}</List.Item>
              <List.Item>
                المواقع: {worksites.map((site) => site.name).join(", ") || "-"}
              </List.Item>
              <List.Item>
                الشِفتات: {shifts.map((shift) => shift.name).join(", ") || "-"}
              </List.Item>
              <List.Item>
                السياسات: {policies.map((rule) => rule.type).join(", ") || "-"}
              </List.Item>
              <List.Item>
                دليل الحسابات: {accountingTemplate || "-"}
              </List.Item>
            </List>
            <Group mt="md" justify="flex-end">
              <Button
                variant={selectedCode === template.code ? "filled" : "light"}
                onClick={() => setSelectedCode(template.code)}
              >
                {selectedCode === template.code ? "تم الاختيار" : "اختيار القالب"}
              </Button>
            </Group>
          </Card>
        );
      })}

      <Group justify="flex-end">
        <Button
          disabled={!selectedTemplate}
          onClick={() => {
            if (selectedTemplate) {
              navigate(`/setup/progress?template=${selectedTemplate.code}`);
            }
          }}
        >
          تطبيق القالب
        </Button>
      </Group>
    </Stack>
  );
}