import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { isForbiddenError } from "../shared/api/errors";
import type { Department } from "../shared/hr/hooks";

type CopilotBlock =
  | {
      type: "kpi_cards";
      data: { label: string; value: string | number | null }[];
    }
  | {
      type: "table";
      columns: { key: string; label: string }[];
      rows: Record<string, string | number | null>[];
    }
  | {
      type: "chart";
      variant: "line" | "bar";
      xKey: string;
      series: { key: string; label: string }[];
      data: Record<string, string | number | null>[];
    };

type CopilotResponse = {
  intent: string;
  title: string;
  blocks: CopilotBlock[];
};

type CopilotIntentKey =
  | "attendance_report"
  | "top_late_employees"
  | "payroll_summary"
  | "top_debtors"
  | "profit_change_explain";

type Suggestion = {
  label: string;
  intent: CopilotIntentKey;
  question: string;
  needsParams: boolean;
};

const suggestions: Suggestion[] = [
  {
    label: "غياب قسم المبيعات آخر 30 يوم",
    intent: "attendance_report",
    question: "Attendance report for sales last 30 days",
    needsParams: true,
  },
  {
    label: "أكتر 10 متأخرين",
    intent: "top_late_employees",
    question: "Top 10 late employees",
    needsParams: true,
  },
  {
    label: "ملخص الرواتب",
    intent: "payroll_summary",
    question: "Payroll summary",
    needsParams: true,
  },
  {
    label: "أكبر العملاء المتعثرين",
    intent: "top_debtors",
    question: "Top debtors",
    needsParams: true,
  },
  {
    label: "شرح تغير الربح",
    intent: "profit_change_explain",
    question: "Explain profit change",
    needsParams: true,
  },
];

export function CopilotPage() {
  const [question, setQuestion] = useState("");
  const [intent, setIntent] = useState<CopilotIntentKey | "">("");
  const [params, setParams] = useState<Record<string, string | number | null>>({});
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await http.get(endpoints.hr.departments);
      return res.data as Department[];
    },
  });

  const departmentOptions = useMemo(() => {
    return (departmentsQuery.data ?? []).map((dept) => ({
      value: String(dept.id),
      label: dept.name,
    }));
  }, [departmentsQuery.data]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuestion(suggestion.question);
    setIntent(suggestion.intent);
    setParams({});
    setResponse(null);
    setError(null);
    if (suggestion.needsParams) {
      setModalOpen(true);
    }
  };

  const executeQuery = async (overrideParams?: Record<string, string | number | null>) => {
    if (!intent || !question) {
      setError("يرجى اختيار Intent وإضافة السؤال.");
      return;
    }
    const rawParams = overrideParams ?? params;
    const sanitizedParams = Object.fromEntries(
      Object.entries(rawParams).map(([key, value]) => {
        if (value === null || value === "") {
          return [key, null];
        }
        if (["department_id", "limit", "year", "month"].includes(key)) {
          return [key, Number(value)];
        }
        return [key, value];
      })
    );
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await http.post(endpoints.copilot.query, {
        question,
        intent,
        params: sanitizedParams,
      });
      setResponse(res.data);
    } catch (err) {
      if (isForbiddenError(err)) {
        setError("Access denied. اطلب من الأدمن تفعيل الصلاحية.");
      } else {
        setError("حدث خطأ أثناء تنفيذ الاستعلام.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderParamsForm = () => {
    switch (intent) {
      case "attendance_report":
        return (
          <Stack gap="sm">
            <TextInput
              label="Start date"
              type="date"
              value={(params.start_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
              }
            />
            <TextInput
              label="End date"
              type="date"
              value={(params.end_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
              }
            />
            <Select
              label="Department"
              data={departmentOptions}
              value={(params.department_id as string) ?? null}
              onChange={(value) =>
                setParams((prev) => ({ ...prev, department_id: value }))
              }
              clearable
            />
          </Stack>
        );
      case "top_late_employees":
        return (
          <Stack gap="sm">
            <TextInput
              label="Start date"
              type="date"
              value={(params.start_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
              }
            />
            <TextInput
              label="End date"
              type="date"
              value={(params.end_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
              }
            />
            <NumberInput
              label="Limit"
              value={(params.limit as number) ?? 10}
              min={1}
              max={50}
              onChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  limit: value === null ? null : Number(value),
                }))
              }
            />
          </Stack>
        );
      case "payroll_summary":
        return (
          <Stack gap="sm">
            <NumberInput
              label="Year"
              value={(params.year as number) ?? new Date().getFullYear()}
              min={2000}
              max={2100}
              onChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  year: value === null ? null : Number(value),
                }))
              }
            />
            <NumberInput
              label="Month"
              value={(params.month as number) ?? new Date().getMonth() + 1}
              min={1}
              max={12}
              onChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  month: value === null ? null : Number(value),
                }))
              }
            />
          </Stack>
        );
      case "top_debtors":
        return (
          <Stack gap="sm">
            <NumberInput
              label="Limit"
              value={(params.limit as number) ?? 10}
              min={1}
              max={50}
              onChange={(value) =>
                setParams((prev) => ({
                  ...prev,
                  limit: value === null ? null : Number(value),
                }))
              }
            />
          </Stack>
        );
      case "profit_change_explain":
        return (
          <Stack gap="sm">
            <TextInput
              label="Start date"
              type="date"
              value={(params.start_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, start_date: event.currentTarget.value }))
              }
            />
            <TextInput
              label="End date"
              type="date"
              value={(params.end_date as string) ?? ""}
              onChange={(event) =>
                setParams((prev) => ({ ...prev, end_date: event.currentTarget.value }))
              }
            />
          </Stack>
        );
      default:
        return null;
    }
  };

  const renderBlock = (block: CopilotBlock, index: number) => {
    if (block.type === "kpi_cards") {
      return (
        <SimpleGrid key={`kpi-${index}`} cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {block.data.map((item) => (
            <Card key={item.label} withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                {item.label}
              </Text>
              <Title order={3}>{item.value ?? "-"}</Title>
            </Card>
          ))}
        </SimpleGrid>
      );
    }

    if (block.type === "table") {
      return (
        <Card key={`table-${index}`} withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group gap="md" wrap="wrap">
              {block.columns.map((col) => (
                <Text key={col.key} fw={600} w={140}>
                  {col.label}
                </Text>
              ))}
            </Group>
            {block.rows.length === 0 ? (
              <Text c="dimmed">No data available.</Text>
            ) : (
              block.rows.map((row, rowIndex) => (
                <Group key={`row-${rowIndex}`} gap="md" wrap="wrap">
                  {block.columns.map((col) => (
                    <Text key={`${rowIndex}-${col.key}`} w={140}>
                      {row[col.key] ?? "-"}
                    </Text>
                  ))}
                </Group>
              ))
            )}
          </Stack>
        </Card>
      );
    }

    if (block.type === "chart") {
      const palette = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"];
      return (
        <Card key={`chart-${index}`} withBorder radius="md" p="md" h={320}>
          <ResponsiveContainer width="100%" height="100%">
            {block.variant === "line" ? (
              <LineChart data={block.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={block.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {block.series.map((series, seriesIndex) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={palette[seriesIndex % palette.length]}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={block.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={block.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {block.series.map((series, seriesIndex) => (
                  <Bar
                    key={series.key}
                    dataKey={series.key}
                    name={series.label}
                    fill={palette[seriesIndex % palette.length]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </Card>
      );
    }

    return null;
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Copilot Reports</Title>
      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <TextInput
            label="Question"
            placeholder="اكتب سؤالك أو اختر توصية"
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
          />
          <Group gap="sm" wrap="wrap">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.intent}
                variant="light"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.label}
              </Button>
            ))}
          </Group>
          <Group gap="sm">
            <Button
              onClick={() => executeQuery()}
              loading={loading}
              disabled={!intent}
            >
              Run report
            </Button>
            {intent && (
              <Button variant="subtle" onClick={() => setModalOpen(true)}>
                Edit params
              </Button>
            )}
          </Group>
          {error && (
            <Card withBorder radius="md" p="md" bg="red.0">
              <Text c="red.7">{error}</Text>
            </Card>
          )}
        </Stack>
      </Card>

      {response && (
        <Stack gap="lg">
          <Title order={3}>{response.title}</Title>
          {response.blocks.map((block, index) => renderBlock(block, index))}
        </Stack>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Configure parameters"
      >
        <Stack gap="md">
          {renderParamsForm()}
          <Group justify="flex-end">
            <Button
              onClick={() => {
                setModalOpen(false);
                executeQuery(params);
              }}
            >
              Apply & Run
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}