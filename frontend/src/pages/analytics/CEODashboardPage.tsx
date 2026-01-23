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
import { useAnalyticsSummary, useAnalyticsKpis } from "../../shared/analytics/insights.ts";
import { useAlerts } from "../../shared/analytics/hooks";
import { useCashForecast } from "../../shared/analytics/forecast";
import { buildRangeSelection } from "../../shared/analytics/range.ts";
import type { RangeOption } from "../../shared/analytics/range.ts";
import { RangeSelector } from "../../shared/analytics/RangeSelector.ts";
import { formatCurrency, formatPercent } from "../../shared/analytics/format.ts";

const kpiKeys = ["revenue_daily", "expenses_daily", "absence_rate_daily"];

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
      revenue: values.revenue_daily ?? 0,
      expenses: values.expenses_daily ?? 0,
      absence: values.absence_rate_daily ?? 0,
    }));
}

export function CEODashboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const selection = useMemo(
    () => buildRangeSelection(range, customStart, customEnd),
    [range, customStart, customEnd]
  );

  const summaryQuery = useAnalyticsSummary(selection.rangeParam);
  const kpisQuery = useAnalyticsKpis(kpiKeys, selection.start, selection.end);
  const alertsQuery = useAlerts({ status: "open", range: selection.rangeParam });
  const forecastQuery = useCashForecast();

  const chartData = useMemo(() => {
    if (!kpisQuery.data) {
      return [];
    }
    return buildChartData(kpisQuery.data);
  }, [kpisQuery.data]);

  const topAlerts = useMemo(() => {
    return (alertsQuery.data ?? []).slice(0, 5);
  }, [alertsQuery.data]);

  const forecast30 = useMemo(() => {
    return (forecastQuery.data ?? []).find((snapshot) => snapshot.horizon_days === 30);
  }, [forecastQuery.data]);

  const showCustomHint = range === "custom" && (!selection.start || !selection.end);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3}>لوحة CEO</Title>
        <Text c="dimmed">نظرة شاملة على الإيرادات والمصروفات والتنبيهات.</Text>
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

      <SimpleGrid cols={{ base: 1, md: 4 }}>
        {summaryQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={120} radius="md" />
          ))
        ) : (
          <>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  إجمالي الإيرادات
                </Text>
                <Text size="xl" fw={600}>
                  {formatCurrency(summaryQuery.data?.revenue_total ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  إجمالي المصروفات
                </Text>
                <Text size="xl" fw={600}>
                  {formatCurrency(summaryQuery.data?.expenses_total ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  صافي الربح التقديري
                </Text>
                <Text size="xl" fw={600}>
                  {formatCurrency(summaryQuery.data?.net_profit_est ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  توقع السيولة 30 يوم
                </Text>
                <Text size="xl" fw={600}>
                  {formatCurrency(forecast30?.net_expected ?? null)}
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
              <Title order={5}>الإيرادات مقابل المصروفات</Title>
              <Badge variant="light">خط زمني</Badge>
            </Group>
            {kpisQuery.isLoading ? (
              <Skeleton height={240} radius="md" />
            ) : chartData.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="الإيرادات"
                      stroke="#1971c2"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="المصروفات"
                      stroke="#f03e3e"
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
              <Title order={5}>معدل الغياب</Title>
              <Badge variant="light">آخر الفترة</Badge>
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
      </SimpleGrid>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={5}>Top Alerts</Title>
            <Badge color="red" variant="light">
              مفتوحة
            </Badge>
          </Group>
          {alertsQuery.isLoading ? (
            <Skeleton height={160} radius="md" />
          ) : topAlerts.length ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>العنوان</Table.Th>
                  <Table.Th>الحدة</Table.Th>
                  <Table.Th>التاريخ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {topAlerts.map((alert) => (
                  <Table.Tr key={alert.id}>
                    <Table.Td>{alert.title}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={alert.severity === "high" ? "red" : "yellow"}
                        variant="light"
                      >
                        {alert.severity}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{alert.event_date}</Table.Td>
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