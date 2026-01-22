import { useState } from "react";
import { Card, Group, Stack, Table, Text, TextInput, Title, Button } from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useTrialBalance } from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";

export function TrialBalancePage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const trialBalanceQuery = useTrialBalance(dateFrom || undefined, dateTo || undefined);

  if (isForbiddenError(trialBalanceQuery.error)) {
    return <AccessDenied />;
  }

  const rows = trialBalanceQuery.data ?? [];

  function handleExport() {
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit"];
    const dataRows = rows.map((row) => [
      row.code,
      row.name,
      row.type,
      row.debit,
      row.credit,
    ]);
    downloadCsv(
      `trial-balance-${dateFrom || "start"}-${dateTo || "end"}.csv`,
      headers,
      dataRows
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Trial Balance</Title>
        <Button
          variant="light"
          onClick={handleExport}
          disabled={!rows.length}
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

      <Card withBorder radius="md" p="md">
        {trialBalanceQuery.isLoading ? (
          <Text c="dimmed">Loading trial balance...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Account</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Debit</Table.Th>
                <Table.Th>Credit</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.account_id}>
                  <Table.Td>{row.code}</Table.Td>
                  <Table.Td>{row.name}</Table.Td>
                  <Table.Td>{row.type}</Table.Td>
                  <Table.Td>{formatAmount(row.debit)}</Table.Td>
                  <Table.Td>{formatAmount(row.credit)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}