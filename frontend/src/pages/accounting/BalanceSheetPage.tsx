import { useState } from "react";
import { Card, Group, Stack, Table, Text, TextInput, Title, Button } from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { type BalanceSheetLine, useBalanceSheet } from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";

export function BalanceSheetPage() {
  const [asOf, setAsOf] = useState("");
  const balanceSheetQuery = useBalanceSheet(asOf || undefined);

  if (isForbiddenError(balanceSheetQuery.error)) {
    return <AccessDenied />;
  }

  function handleExport() {
    if (!balanceSheetQuery.data) {
      return;
    }
    const headers = ["Section", "Account Code", "Account Name", "Balance"];
    const rows = [
      ...balanceSheetQuery.data.assets.map((item) => [
        "Assets",
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.liabilities.map((item) => [
        "Liabilities",
        item.code,
        item.name,
        item.balance,
      ]),
      ...balanceSheetQuery.data.equity.map((item) => [
        "Equity",
        item.code,
        item.name,
        item.balance,
      ]),
    ];
    downloadCsv(`balance-sheet-${asOf || "as-of"}.csv`, headers, rows);
  }

  function renderSection(title: string, rows: BalanceSheetLine[]) {    
    return (
      <Card withBorder radius="md" p="md">
        <Title order={5} mb="sm">
          {title}
        </Title>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Account</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, index) => (
              <Table.Tr key={`${row.code}-${index}`}>
                <Table.Td>{row.code}</Table.Td>
                <Table.Td>{row.name}</Table.Td>
                <Table.Td>{formatAmount(row.balance)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Balance Sheet</Title>
        <Button
          variant="light"
          onClick={handleExport}
          disabled={!balanceSheetQuery.data}
        >
          Export CSV
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group align="end" gap="md" wrap="wrap">
          <TextInput
            label="As of"
            type="date"
            value={asOf}
            onChange={(event) => setAsOf(event.currentTarget.value)}
          />
        </Group>
      </Card>

      {balanceSheetQuery.isLoading ? (
        <Text c="dimmed">Loading balance sheet...</Text>
      ) : balanceSheetQuery.data ? (
        <Stack gap="md">
          {renderSection("Assets", balanceSheetQuery.data.assets)}
          {renderSection("Liabilities", balanceSheetQuery.data.liabilities)}
          {renderSection("Equity", balanceSheetQuery.data.equity)}
          <Card withBorder radius="md" p="md">
            <Group justify="space-between">
              <Text fw={600}>Totals</Text>
              <Text>
                Assets {formatAmount(balanceSheetQuery.data.totals.assets_total)} | Liabilities
                + Equity{" "}
                {formatAmount(balanceSheetQuery.data.totals.liabilities_equity_total)}
              </Text>
            </Group>
          </Card>
        </Stack>
      ) : (
        <Text c="dimmed">Select a date to view the balance sheet.</Text>
      )}
    </Stack>
  );
}