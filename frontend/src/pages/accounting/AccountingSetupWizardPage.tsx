import { useState } from "react";
import { Button, Card, Group, Stack, Text, Title, Badge } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";

type TemplatePreview = {
  key: string;
  name: string;
  description: string;
  accountCount: number;
  examples: string[];
  costCenters: string[];
};

const templates: TemplatePreview[] = [
  {
    key: "services_small",
    name: "Services Small",
    description: "خطة حسابات لشركة خدمات صغيرة مع مصروفات تشغيل أساسية.",
    accountCount: 12,
    examples: ["Cash", "Bank", "Accounts Receivable", "Revenue - Services"],
    costCenters: ["Admin", "Sales", "Operations"],
  },
  {
    key: "trading_basic",
    name: "Trading Basic",
    description: "مناسبة للشركات التجارية مع مخزون وتكلفة بضائع.",
    accountCount: 10,
    examples: ["Inventory", "Accounts Payable", "Sales Revenue", "COGS"],
    costCenters: ["Admin", "Sales", "Warehouse"],
  },
];

export function AccountingSetupWizardPage() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleApplyTemplate = async (templateKey: string) => {
    setActiveKey(templateKey);
    try {
      const response = await http.post(endpoints.accounting.applyTemplate, {
        template_key: templateKey,
      });
      const accountsCreated = response.data?.accounts_created ?? 0;
      const costCentersCreated = response.data?.cost_centers_created ?? 0;
      notifications.show({
        title: "Template applied",
        message: `تم إنشاء ${accountsCreated} حساب و ${costCentersCreated} مركز تكلفة.`,
      });
    } catch (err) {
      notifications.show({
        title: "Apply failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setActiveKey(null);
    }
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Accounting Setup Wizard</Title>
        <Text c="dimmed">Step 1: اختيار Template لدليل الحسابات.</Text>
      </div>

      <Stack gap="md">
        {templates.map((template) => (
          <Card key={template.key} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <div>
                  <Title order={4}>{template.name}</Title>
                  <Text size="sm" c="dimmed">
                    {template.description}
                  </Text>
                </div>
                <Badge size="lg" variant="light">
                  {template.accountCount} accounts
                </Badge>
              </Group>

              <Group gap="xs">
                {template.examples.map((example) => (
                  <Badge key={example} variant="outline">
                    {example}
                  </Badge>
                ))}
              </Group>

              <Text size="sm" c="dimmed">
                Cost Centers: {template.costCenters.join(" / ")}
              </Text>

              <Group justify="flex-end">
                <Button
                  onClick={() => handleApplyTemplate(template.key)}
                  loading={activeKey === template.key}
                >
                  Apply Template
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}