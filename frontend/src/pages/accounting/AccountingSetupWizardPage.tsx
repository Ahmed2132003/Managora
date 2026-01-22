import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
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

type Account = {
  id: number;
  code: string;
  name: string;
};

type AccountMapping = {
  id: number;
  key: string;
  account: number | null;
  required: boolean;
};

const mappingKeys = [
  {
    key: "PAYROLL_SALARIES_EXPENSE",
    label: "Salaries Expense",
    required: true,
  },
  {
    key: "PAYROLL_PAYABLE",
    label: "Payroll Payable",
    required: true,
  },
  {
    key: "EXPENSE_DEFAULT_CASH",
    label: "Expense Default Cash (Optional)",
    required: false,
  },
  {
    key: "EXPENSE_DEFAULT_AP",
    label: "Expense Default AP (Optional)",
    required: false,
  },
];

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountMappings, setAccountMappings] = useState<
    Record<string, number | null>
  >({});
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  const accountOptions = accounts.map((account) => ({
    value: String(account.id),
    label: `${account.code} - ${account.name}`,
  }));

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

  const loadMappings = async () => {
    setLoadingMappings(true);
    try {
      const [accountsRes, mappingsRes] = await Promise.all([
        http.get(endpoints.accounting.accounts),
        http.get(endpoints.accounting.mappings),
      ]);
      const accountsData = accountsRes.data ?? [];
      const mappingsData: AccountMapping[] = mappingsRes.data ?? [];
      setAccounts(accountsData);
      setAccountMappings(
        mappingsData.reduce<Record<string, number | null>>((acc, mapping) => {
          acc[mapping.key] = mapping.account ?? null;
          return acc;
        }, {})
      );
    } catch (err) {
      notifications.show({
        title: "Load failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setLoadingMappings(false);
    }
  };

  useEffect(() => {
    void loadMappings();
  }, []);

  const missingRequired = mappingKeys.filter(
    (mapping) => mapping.required && !accountMappings[mapping.key]
  );

  const handleSaveMappings = async () => {
    if (missingRequired.length > 0) {
      notifications.show({
        title: "Missing required mappings",
        message: "يرجى تحديد الحسابات المطلوبة قبل الإنهاء.",
        color: "red",
      });
      return;
    }
    setSavingMappings(true);
    try {
      const payload: Record<string, number | null> = {};
      mappingKeys.forEach((mapping) => {
        const value = accountMappings[mapping.key];
        if (value) {
          payload[mapping.key] = value;
        }
      });
      await http.post(endpoints.accounting.mappingsBulkSet, payload);
      notifications.show({
        title: "Mappings saved",
        message: "تم حفظ إعدادات الربط للحسابات.",
      });
      await loadMappings();
    } catch (err) {
      notifications.show({
        title: "Save failed",
        message: String(err),
        color: "red",
      });
    } finally {
      setSavingMappings(false);
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

      <Divider my="sm" />

      <Stack gap="md">
        <div>
          <Title order={3}>Step 2: Account Mapping</Title>
          <Text c="dimmed">
            اربط حسابات المرتبات والمصروفات بالحسابات المناسبة لشركتك.
          </Text>
        </div>

        {loadingMappings ? (
          <Text>Loading mappings...</Text>
        ) : (
          <Stack gap="sm">
            {mappingKeys.map((mapping) => (
              <Select
                key={mapping.key}
                data={accountOptions}
                label={mapping.label}
                placeholder="اختر حساب"
                searchable
                value={
                  accountMappings[mapping.key]
                    ? String(accountMappings[mapping.key])
                    : null
                }
                onChange={(value) => {
                  setAccountMappings((prev) => ({
                    ...prev,
                    [mapping.key]: value ? Number(value) : null,
                  }));
                }}
                required={mapping.required}
              />
            ))}

            {missingRequired.length > 0 && (
              <Text size="sm" c="red">
                مطلوب تعيين:{" "}
                {missingRequired.map((mapping) => mapping.label).join(", ")}
              </Text>
            )}

            <Group justify="flex-end">
              <Button
                onClick={handleSaveMappings}
                loading={savingMappings}
                disabled={missingRequired.length > 0 || loadingMappings}
              >
                Finish setup
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}