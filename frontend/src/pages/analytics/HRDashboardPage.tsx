import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsSummary, useAnalyticsKpis, useAnalyticsBreakdown } from "../../shared/analytics/insights.ts";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { RangeSelector } from "../../shared/analytics/RangeSelector";
import { formatNumber, formatPercent } from "../../shared/analytics/format.ts";

const kpiKeys = ["absence_rate_daily", "lateness_rate_daily", "overtime_hours_daily"];

function buildChartData(series: Array<{ key: string; points: { date: string; value: string | null }[] }>) {
  const valuesByDate = new Map<string, Record<string, number | null>>();

  series.forEach((kpi) => {
    kpi.points.forEach((point) => {
      const entry = valuesByDate.get(point.date) ?? {};
      entry[kpi.key] = point.value ? Number(point.value) : null;
      valuesByDate.set(point.date, entry);
    });
  });

  return Array.from(valuesByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      absence: values.absence_rate_daily ?? 0,
      lateness: values.lateness_rate_daily ?? 0,
      overtime: values.overtime_hours_daily ?? 0,
    }));
}

export function HRDashboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const selection = useMemo(
    () => buildRangeSelection(range, customStart, customEnd),
    [range, customStart, customEnd]
  );

  const summaryQuery = useAnalyticsSummary(selection.rangeParam);
  const kpisQuery = useAnalyticsKpis(kpiKeys, selection.start, selection.end);
  const breakdownQuery = useAnalyticsBreakdown(
    "lateness_by_department_daily",
    "department",
    selection.end,
    5
  );

  const chartData = useMemo(() => {
    if (!kpisQuery.data) {
      return [];
    }
    return buildChartData(kpisQuery.data);
  }, [kpisQuery.data]);

  const overtimeTotal = useMemo(() => {
    const overtimeSeries = kpisQuery.data?.find((series) => series.key === "overtime_hours_daily");
    if (!overtimeSeries) {
      return null;
    }
    const total = overtimeSeries.points.reduce((sum, point) => sum + Number(point.value ?? 0), 0);
    return formatNumber(String(total));
  }, [kpisQuery.data]);

  const showCustomHint = range === "custom" && (!selection.start || !selection.end);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3}>لوحة HR</Title>
        <Text c="dimmed">متابعة الغياب والتأخير والساعات الإضافية.</Text>
      </Stack>

      <RangeSelector
        value={range}
        onChange={setRange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />
      {showCustomHint && <Text c="dimmed">اختر تاريخ البداية والنهاية لعرض البيانات.</Text>}

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        {summaryQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={120} radius="md" />
          ))
        ) : (
          <>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  متوسط الغياب
                </Text>
                <Text size="xl" fw={600}>
                  {formatPercent(summaryQuery.data?.absence_rate_avg ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  متوسط التأخير
                </Text>
                <Text size="xl" fw={600}>
                  {formatPercent(summaryQuery.data?.lateness_rate_avg ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    ساعات إضافية
                  </Text>
                  <Badge variant="light">الفترة الحالية</Badge>
                </Group>
                <Text size="xl" fw={600}>
                  {overtimeTotal ?? "-"}
                </Text>
              </Stack>
            </Card>
          </>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="md" p="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={5}>اتجاه الغياب</Title>
              <Badge variant="light">Trend</Badge>
            </Group>
            {kpisQuery.isLoading ? (
              <Skeleton height={240} radius="md" />
            ) : chartData.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatPercent(String(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="absence"
                      name="الغياب"
                      stroke="#845ef7"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Text c="dimmed">لسه مفيش داتا.</Text>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={5}>اتجاه التأخير</Title>
              <Badge variant="light">Trend</Badge>
            </Group>
            {kpisQuery.isLoading ? (
              <Skeleton height={240} radius="md" />
            ) : chartData.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatPercent(String(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="lateness"
                      name="التأخير"
                      stroke="#fab005"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Text c="dimmed">لسه مفيش داتا.</Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Title order={5}>أكثر الأقسام تأخيرًا</Title>
          {breakdownQuery.isLoading ? (
            <Skeleton height={160} radius="md" />
          ) : breakdownQuery.data?.items?.length ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>القسم</Table.Th>
                  <Table.Th>القيمة</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {breakdownQuery.data.items.map((item) => (
                  <Table.Tr key={item.dimension_id}>
                    <Table.Td>{item.dimension_id}</Table.Td>
                    <Table.Td>{formatNumber(item.amount ?? null)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed">لسه مفيش داتا.</Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}