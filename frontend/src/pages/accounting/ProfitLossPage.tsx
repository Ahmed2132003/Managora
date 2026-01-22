import { useState } from "react";
import {
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  SimpleGrid,
  Badge,
  Button,
} from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useProfitLoss } from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";

export function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const pnlQuery = useProfitLoss(dateFrom || undefined, dateTo || undefined);

  if (isForbiddenError(pnlQuery.error)) {
    return <AccessDenied />;
  }

  function handleExport() {
    if (!pnlQuery.data) {
      return;
    }
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit", "Net"];
    const rows = [
      ...pnlQuery.data.income_accounts,
      ...pnlQuery.data.expense_accounts,
    ].map((row) => [
      row.code,
      row.name,
      row.type,
      row.debit,
      row.credit,
      row.net,
    ]);
    downloadCsv(
      `pnl-${dateFrom || "start"}-${dateTo || "end"}.csv`,
      headers,
      rows
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Profit &amp; Loss</Title>
        <Button
          variant="light"
          onClick={handleExport}
          disabled={!pnlQuery.data}
        >
          Export CSV
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group align="end" gap="md" wrap="wrap">
          <TextInput
            label="Date from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.currentTarget.value)}
          />
          <TextInput
            label="Date to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.currentTarget.value)}
          />
        </Group>
      </Card>

      {pnlQuery.isLoading ? (
        <Text c="dimmed">Loading P&amp;L...</Text>
      ) : pnlQuery.data ? (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Card withBorder radius="md" p="md">
              <Text c="dimmed">Income</Text>
              <Title order={4}>{formatAmount(pnlQuery.data.income_total)}</Title>
            </Card>
            <Card withBorder radius="md" p="md">
              <Text c="dimmed">Expenses</Text>
              <Title order={4}>{formatAmount(pnlQuery.data.expense_total)}</Title>
            </Card>
            <Card withBorder radius="md" p="md">
              <Text c="dimmed">Net Profit</Text>
              <Title order={4}>{formatAmount(pnlQuery.data.net_profit)}</Title>
            </Card>
          </SimpleGrid>

          <Card withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Breakdown</Title>
              <Badge variant="light">Income &amp; Expenses</Badge>
            </Group>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Account</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Debit</Table.Th>
                  <Table.Th>Credit</Table.Th>
                  <Table.Th>Net</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...pnlQuery.data.income_accounts, ...pnlQuery.data.expense_accounts].map(
                  (row) => (
                    <Table.Tr key={row.account_id}>
                      <Table.Td>{row.code}</Table.Td>
                      <Table.Td>{row.name}</Table.Td>
                      <Table.Td>{row.type}</Table.Td>
                      <Table.Td>{formatAmount(row.debit)}</Table.Td>
                      <Table.Td>{formatAmount(row.credit)}</Table.Td>
                      <Table.Td>{formatAmount(row.net)}</Table.Td>
                    </Table.Tr>
                  )
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Stack>
      ) : (
        <Text c="dimmed">Select a date range to view the P&amp;L.</Text>
      )}
    </Stack>
  );
}