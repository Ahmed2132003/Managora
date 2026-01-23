import {
  Card,
  Stack,
  Title,
  Text,
  SimpleGrid,
  Group,
  Table,
  Badge,
  Divider,
} from "@mantine/core";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCashForecast } from "../../shared/analytics/forecast";

const currencyFormatter = new Intl.NumberFormat("ar", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ar", {
  maximumFractionDigits: 2,
});

function formatCurrency(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "-";
  }
  return currencyFormatter.format(numeric);
}

function formatNumber(value: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "-";
  }
  return numberFormatter.format(numeric);
}

export function CashForecastPage() {
  const { data, isLoading, isError } = useCashForecast();

  const snapshots = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data].sort((a, b) => a.horizon_days - b.horizon_days);
  }, [data]);

  const chartData = useMemo(
    () =>
      snapshots.map((snapshot) => ({
        horizon: `${snapshot.horizon_days} يوم`,
        inflows: Number(snapshot.expected_inflows),
        outflows: Number(snapshot.expected_outflows),
      })),
    [snapshots]
  );

  const snapshot30 = snapshots.find((snapshot) => snapshot.horizon_days === 30);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3}>توقع السيولة 30/60/90</Title>
        <Text c="dimmed">
          توقع بسيط يعتمد على الفواتير المستحقة والمصاريف المتكررة والرواتب القادمة.
        </Text>
      </Stack>

      {isLoading && <Text c="dimmed">جاري تجهيز التوقعات...</Text>}
      {isError && (
        <Text c="red">تعذر تحميل التوقعات حالياً. حاول مرة أخرى لاحقاً.</Text>
      )}

      {!isLoading && !isError && (
        <>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            {snapshots.map((snapshot) => {
              const netValue = Number(snapshot.net_expected);
              const netColor = netValue >= 0 ? "teal" : "red";
              return (
                <Card key={snapshot.horizon_days} withBorder radius="md" p="lg">
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Title order={5}>{snapshot.horizon_days} يوم</Title>
                      <Badge color={netColor} variant="light">
                        صافي متوقع
                      </Badge>
                    </Group>
                    <Text size="xl" fw={600} c={netColor}>
                      {formatCurrency(snapshot.net_expected)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      تدفقات داخلة {formatCurrency(snapshot.expected_inflows)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      تدفقات خارجة {formatCurrency(snapshot.expected_outflows)}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={5}>التدفقات المتوقعة</Title>
                <Text size="sm" c="dimmed">
                  مقارنة التدفقات الداخلة والخارجة لكل فترة
                </Text>
              </Group>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="horizon" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(String(value))} />
                    <Legend />
                    <Bar name="الداخل" dataKey="inflows" stackId="a" fill="#2f9e44" />
                    <Bar name="الخارج" dataKey="outflows" stackId="a" fill="#f03e3e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={5}>أكبر العملاء المتوقع تحصيلهم (30 يوم)</Title>
                {snapshot30?.details.inflows_by_bucket.top_customers.length ? (
                  <Table striped withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>العميل</Table.Th>
                        <Table.Th>قيمة متوقعة</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {snapshot30.details.inflows_by_bucket.top_customers.map((item) => (
                        <Table.Tr key={item.customer}>
                          <Table.Td>{item.customer}</Table.Td>
                          <Table.Td>{formatCurrency(item.amount)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed">لا توجد فواتير مستحقة خلال 30 يوم.</Text>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={5}>أكبر المصروفات المتوقعة (30 يوم)</Title>
                {snapshot30?.details.outflows_by_bucket.top_categories.length ? (
                  <Table striped withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>الفئة</Table.Th>
                        <Table.Th>قيمة متوقعة</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {snapshot30.details.outflows_by_bucket.top_categories.map((item) => (
                        <Table.Tr key={item.category}>
                          <Table.Td>{item.category}</Table.Td>
                          <Table.Td>{formatCurrency(item.amount)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed">لا توجد مصروفات متكررة مسجلة.</Text>
                )}
              </Stack>
            </Card>
          </SimpleGrid>

          <Card withBorder radius="md" p="lg">
            <Stack gap="xs">
              <Title order={5}>افتراضات التوقع</Title>
              <Divider />
              {snapshot30 ? (
                <Stack gap={4}>
                  <Text size="sm">
                    معدل التحصيل التاريخي: {formatNumber(snapshot30.details.assumptions.collection_rate)}
                  </Text>
                  <Text size="sm">
                    متوسط المصروفات الشهرية (آخر 3 أشهر):{" "}
                    {formatCurrency(snapshot30.details.assumptions.recurring_expense_est)}
                  </Text>
                  <Text size="sm">
                    تقدير الرواتب القادمة: {formatCurrency(snapshot30.details.assumptions.payroll_est)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    تاريخ الرواتب المتوقع: {snapshot30.details.assumptions.payroll_date || "غير متاح"}
                  </Text>
                </Stack>
              ) : (
                <Text c="dimmed">لا توجد افتراضات متاحة.</Text>
              )}
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}