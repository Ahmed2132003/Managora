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
import { Link } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useJournalEntries } from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const referenceOptions = [
  { value: "manual", label: "Manual" },
  { value: "payroll", label: "Payroll" },
  { value: "expense", label: "Expense" },
  { value: "adjustment", label: "Adjustment" },
];

export function JournalEntriesPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [referenceType, setReferenceType] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      referenceType: referenceType || undefined,
      search: search || undefined,
    }),
    [dateFrom, dateTo, referenceType, search]
  );

  const entriesQuery = useJournalEntries(filters);

  if (isForbiddenError(entriesQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Journal Entries</Title>
        <Button component={Link} to="/accounting/journal-entries/new" disabled>
          New Entry
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
          <Select
            label="Reference type"
            placeholder="All"
            data={referenceOptions}
            value={referenceType}
            onChange={setReferenceType}
            clearable
          />
          <TextInput
            label="Search"
            placeholder="Memo or reference id"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        {entriesQuery.isLoading ? (
          <Text c="dimmed">Loading journal entries...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Reference</Table.Th>
                <Table.Th>Memo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(entriesQuery.data ?? []).map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>{entry.date}</Table.Td>
                  <Table.Td>{entry.reference_type}</Table.Td>
                  <Table.Td>{entry.memo || "-"}</Table.Td>
                  <Table.Td>{entry.status}</Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      to={`/accounting/journal-entries/${entry.id}`}
                      size="xs"
                      variant="light"
                    >
                      View
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}