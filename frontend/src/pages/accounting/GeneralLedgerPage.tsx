import { useMemo, useState } from "react";
import {
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Select,
  Button,
} from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useAccounts, useGeneralLedger } from "../../shared/accounting/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { downloadCsv, formatAmount } from "../../shared/accounting/reporting.ts";

export function GeneralLedgerPage() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const canExport = useCan("export.accounting");

  const accountsQuery = useAccounts();
  const selectedAccountId = accountId ? Number(accountId) : undefined;
  const ledgerQuery = useGeneralLedger(
    selectedAccountId,
    dateFrom || undefined,
    dateTo || undefined
  );

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: String(account.id),
        label: `${account.code} - ${account.name}`,
      })),
    [accountsQuery.data]
  );

  if (isForbiddenError(ledgerQuery.error)) {
    return <AccessDenied />;
  }

  function handleExport() {
    if (!ledgerQuery.data) {
      return;
    }
    const headers = [
      "Date",
      "Description",
      "Debit",
      "Credit",
      "Running Balance",
      "Memo",
      "Reference Type",
      "Reference ID",
      "Cost Center",
    ];
    const rows = ledgerQuery.data.lines.map((line) => [
      line.date,
      line.description || "-",
      line.debit,
      line.credit,
      line.running_balance,
      line.memo || "-",
      line.reference_type,
      line.reference_id ?? "-",
      line.cost_center ? `${line.cost_center.code} - ${line.cost_center.name}` : "-",
    ]);
    downloadCsv(
      `general-ledger-${ledgerQuery.data.account.code}-${dateFrom || "start"}-${dateTo || "end"}.csv`,
      headers,
      rows
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>General Ledger</Title>
        {canExport && (
          <Button
            variant="light"
            onClick={handleExport}
            disabled={!ledgerQuery.data?.lines.length}
          >
            Export CSV
          </Button>
        )}
      </Group>
      
      <Card withBorder radius="md" p="md">
        <Group align="end" gap="md" wrap="wrap">
          <Select
            label="Account"
            placeholder="Select account"
            data={accountOptions}
            value={accountId}
            onChange={setAccountId}
            searchable
            clearable
          />
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
        {ledgerQuery.isLoading ? (
          <Text c="dimmed">Loading ledger lines...</Text>
        ) : ledgerQuery.data ? (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Debit</Table.Th>
                <Table.Th>Credit</Table.Th>
                <Table.Th>Running Balance</Table.Th>
                <Table.Th>Reference</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ledgerQuery.data.lines.map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>{line.date}</Table.Td>
                  <Table.Td>{line.description || "-"}</Table.Td>
                  <Table.Td>{formatAmount(line.debit)}</Table.Td>
                  <Table.Td>{formatAmount(line.credit)}</Table.Td>
                  <Table.Td>{formatAmount(line.running_balance)}</Table.Td>
                  <Table.Td>
                    {line.reference_type}
                    {line.reference_id ? ` (${line.reference_id})` : ""}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">Select an account and date range to view the ledger.</Text>
        )}
      </Card>
    </Stack>
  );
}