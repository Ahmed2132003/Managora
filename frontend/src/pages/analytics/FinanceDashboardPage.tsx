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
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsSummary, useAnalyticsBreakdown } from "../../shared/analytics/insights.ts";
import { useAlerts } from "../../shared/analytics/hooks";
import { useCashForecast } from "../../shared/analytics/forecast";
import { useAgingReport } from "../../shared/accounting/hooks";
import { buildRangeSelection, RangeOption } from "../../shared/analytics/range.ts";
import { RangeSelector } from "../../shared/analytics/RangeSelector.ts";
import { formatCurrency } from "../../shared/analytics/format.ts";

export function FinanceDashboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const selection = useMemo(
    () => buildRangeSelection(range, customStart, customEnd),
    [range, customStart, customEnd]
  );

  const summaryQuery = useAnalyticsSummary(selection.rangeParam);
  const alertsQuery = useAlerts({ status: "open", range: selection.rangeParam });
  const forecastQuery = useCashForecast();
  const agingQuery = useAgingReport();
  const expensesByCategoryQuery = useAnalyticsBreakdown(
    "expense_by_category_daily",
    "expense_category",
    selection.end,
    6
  );
  const vendorsQuery = useAnalyticsBreakdown(
    "expense_by_vendor_daily",
    "vendor",
    selection.end,
    5
  );

  const expenseSpikeAlert = useMemo(() => {
    return (alertsQuery.data ?? []).find((alert) => alert.rule_key === "expense_spike");
  }, [alertsQuery.data]);

  const arTotal = useMemo(() => {
    if (!agingQuery.data?.length) {
      return null;
    }
    const total = agingQuery.data.reduce((sum, row) => sum + Number(row.total_due ?? 0), 0);
    return formatCurrency(String(total));
  }, [agingQuery.data]);

  const forecastChartData = useMemo(() => {
    return (forecastQuery.data ?? []).map((snapshot) => ({
      horizon: `${snapshot.horizon_days} يوم`,
      inflows: Number(snapshot.expected_inflows),
      outflows: Number(snapshot.expected_outflows),
      net: Number(snapshot.net_expected),
    }));
  }, [forecastQuery.data]);

  const expenseCategoryData = useMemo(() => {
    return (expensesByCategoryQuery.data?.items ?? []).map((item) => ({
      name: item.dimension_id,
      amount: Number(item.amount ?? 0),
    }));
  }, [expensesByCategoryQuery.data]);

  const showCustomHint = range === "custom" && (!selection.start || !selection.end);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3}>لوحة Finance (CFO-lite)</Title>
        <Text c="dimmed">ملخص السيولة والمصروفات والذمم المدينة.</Text>
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
                  رصيد النقدية الحالي
                </Text>
                <Text size="xl" fw={600}>
                  {formatCurrency(summaryQuery.data?.cash_balance_latest ?? null)}
                </Text>
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  إجمالي الذمم المدينة
                </Text>
                <Text size="xl" fw={600}>
                  {arTotal ?? "-"}
                </Text>
                {!agingQuery.isLoading && !agingQuery.data?.length && (
                  <Text size="sm" c="dimmed">
                    لسه مفيش داتا.
                  </Text>
                )}
              </Stack>
            </Card>
            <Card withBorder radius="md" p="lg">
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    تنبيه مصروفات مرتفعة
                  </Text>
                  <Badge
                    color={expenseSpikeAlert ? "red" : "green"}
                    variant="light"
                  >
                    {expenseSpikeAlert ? "Open" : "OK"}
                  </Badge>
                </Group>
                <Text size="sm">
                  {expenseSpikeAlert
                    ? expenseSpikeAlert.title
                    : "لا توجد طفرات مصروفات."}
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
              <Title order={5}>المصروفات حسب الفئة</Title>
              <Badge variant="light">تصنيف</Badge>
            </Group>
            {expensesByCategoryQuery.isLoading ? (
              <Skeleton height={240} radius="md" />
            ) : expenseCategoryData.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={expenseCategoryData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                    <Bar dataKey="amount" name="الإجمالي" fill="#228be6" />
                  </BarChart>
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
              <Title order={5}>توقع السيولة</Title>
              <Badge variant="light">In/Out/Net</Badge>
            </Group>
            {forecastQuery.isLoading ? (
              <Skeleton height={240} radius="md" />
            ) : forecastChartData.length ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={forecastChartData}>
                    <XAxis dataKey="horizon" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inflows"
                      name="الداخل"
                      stroke="#2f9e44"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="outflows"
                      name="الخارج"
                      stroke="#f03e3e"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="الصافي"
                      stroke="#1971c2"
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
          <Title order={5}>Top Vendors</Title>
          {vendorsQuery.isLoading ? (
            <Skeleton height={160} radius="md" />
          ) : vendorsQuery.data?.items?.length ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>المورد</Table.Th>
                  <Table.Th>الإجمالي</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {vendorsQuery.data.items.map((item) => (
                  <Table.Tr key={item.dimension_id}>
                    <Table.Td>{item.dimension_id}</Table.Td>
                    <Table.Td>{formatCurrency(item.amount ?? null)}</Table.Td>
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