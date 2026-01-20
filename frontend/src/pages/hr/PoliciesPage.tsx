import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import {
  useCreatePolicyRuleMutation,
  usePolicyRulesQuery,
} from "../../shared/hr/hooks";
import type { PolicyRule } from "../../shared/hr/hooks";

type TemplateOption = {
  value: PolicyRule["rule_type"];
  label: string;
  requiresPeriod: boolean;
};

const templateOptions: TemplateOption[] = [
  {
    value: "late_over_minutes",
    label: "Late > X minutes → action",
    requiresPeriod: false,
  },
  {
    value: "late_count_over_period",
    label: "Late count > N خلال Y يوم → action",
    requiresPeriod: true,
  },
  {
    value: "absent_count_over_period",
    label: "Absent count > N خلال Y يوم → action",
    requiresPeriod: true,
  },
];

export function PoliciesPage() {
  const queryClient = useQueryClient();
  const rulesQuery = usePolicyRulesQuery();
  const createMutation = useCreatePolicyRuleMutation();

  const [template, setTemplate] = useState<PolicyRule["rule_type"] | null>(
    "late_over_minutes"
  );
  const [threshold, setThreshold] = useState<number | undefined>(5);
  const [periodDays, setPeriodDays] = useState<number | undefined>(30);
  const [actionType, setActionType] = useState<PolicyRule["action_type"]>("warning");
  const [actionValue, setActionValue] = useState<number | undefined>(undefined);  
  const [isActive, setIsActive] = useState(true);
  const [ruleName, setRuleName] = useState("");

  const activeTemplate = useMemo(
    () => templateOptions.find((option) => option.value === template),
    [template]
  );

  const autoName = useMemo(() => {
    if (!template) return "";
    switch (template) {
      case "late_over_minutes":
        return `Late > ${threshold ?? 0} minutes`;
      case "late_count_over_period":
        return `Late > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      case "absent_count_over_period":
        return `Absent > ${threshold ?? 0} times in ${periodDays ?? 0} days`;
      default:
        return "";
    }
  }, [template, threshold, periodDays]);

  async function handleSave() {
    if (!template || threshold == null) {        
      notifications.show({
        title: "بيانات ناقصة",
        message: "اختر القالب وحدد القيم المطلوبة.",
        color: "red",
      });
      return;
    }

    if (activeTemplate?.requiresPeriod && !periodDays) {
      notifications.show({
        title: "مدة غير مكتملة",
        message: "يرجى إدخال عدد الأيام للفترة.",
        color: "red",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: ruleName.trim() || autoName,
        rule_type: template,
        threshold,
        period_days: activeTemplate?.requiresPeriod ? periodDays : null,
        action_type: actionType,
        action_value: actionType === "deduction" ? String(actionValue ?? 0) : null,
        is_active: isActive,
      });
      notifications.show({
        title: "تم الحفظ",
        message: "تم إنشاء القاعدة بنجاح.",
      });
      setRuleName("");
      setThreshold(5);
      setPeriodDays(30);
      setActionType("warning");
      setActionValue(undefined);      
      setIsActive(true);
      await queryClient.invalidateQueries({ queryKey: ["policies", "rules"] });
    } catch (error) {
      notifications.show({
        title: "فشل الحفظ",
        message: String(error),
        color: "red",
      });
    }
  }

  if (isForbiddenError(rulesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Title order={3}>سياسات الجزاءات (Templates)</Title>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Select
            label="Template"
            data={templateOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={template}
            onChange={(value) =>
              setTemplate(value as PolicyRule["rule_type"])
            }
          />

          <TextInput
            label="اسم القاعدة"
            placeholder={autoName || "Rule name"}
            value={ruleName}
            onChange={(event) => setRuleName(event.currentTarget.value)}
          />

          <Group grow>
            <NumberInput
              label={activeTemplate?.requiresPeriod ? "N (عدد المرات)" : "X (الدقائق)"}
              min={1}
              value={threshold}
              onChange={(value) =>
                setThreshold(typeof value === "number" ? value : undefined)
              }
            />
            {activeTemplate?.requiresPeriod && (
              <NumberInput
                label="Y (عدد الأيام)"
                min={1}
                value={periodDays}
                onChange={(value) =>
                  setPeriodDays(typeof value === "number" ? value : undefined)
                }
              />
            )}            
          </Group>

          <Group grow>
            <Select
              label="نوع الإجراء"
              value={actionType}
              onChange={(value) =>
                setActionType((value as PolicyRule["action_type"]) ?? "warning")
              }
              data={[
                { value: "warning", label: "Warning" },
                { value: "deduction", label: "Deduction" },
              ]}
            />
            <NumberInput
              label="قيمة الإجراء"
              min={0}
              value={actionValue}
              onChange={(value) =>
                setActionValue(typeof value === "number" ? value : undefined)
              }
              disabled={actionType !== "deduction"}
            />            
          </Group>

          <Switch
            label="تفعيل القاعدة"
            checked={isActive}
            onChange={(event) => setIsActive(event.currentTarget.checked)}
          />

          <Button onClick={handleSave} loading={createMutation.isPending}>
            حفظ القاعدة
          </Button>
        </Stack>
      </Card>

      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>القواعد الحالية</Text>
          {rulesQuery.isLoading && <Text c="dimmed">تحميل...</Text>}
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>الاسم</Table.Th>
              <Table.Th>النوع</Table.Th>
              <Table.Th>الشرط</Table.Th>
              <Table.Th>الإجراء</Table.Th>
              <Table.Th>الحالة</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(rulesQuery.data ?? []).map((rule) => (
              <Table.Tr key={rule.id}>
                <Table.Td>{rule.name}</Table.Td>
                <Table.Td>{rule.rule_type}</Table.Td>
                <Table.Td>
                  {rule.rule_type === "late_over_minutes" && (
                    <>Late &gt; {rule.threshold} دقيقة</>
                  )}
                  {rule.rule_type !== "late_over_minutes" && (
                    <>
                      &gt; {rule.threshold} خلال {rule.period_days} يوم
                    </>
                  )}
                </Table.Td>
                <Table.Td>
                  {rule.action_type}
                  {rule.action_type === "deduction" && rule.action_value
                    ? ` (${rule.action_value})`
                    : ""}
                </Table.Td>
                <Table.Td>
                  <Badge color={rule.is_active ? "green" : "gray"}>
                    {rule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
            {!rulesQuery.isLoading && (rulesQuery.data ?? []).length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    لا توجد قواعد بعد.
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