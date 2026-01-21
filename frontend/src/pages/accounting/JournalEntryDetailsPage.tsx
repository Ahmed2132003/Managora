import { useParams, Link } from "react-router-dom";
import {
  Card,
  Group,
  Stack,
  Table,
  Text,
  Title,
  Button,
  Divider,
} from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useJournalEntry } from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

export function JournalEntryDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const entryQuery = useJournalEntry(id);

  if (isForbiddenError(entryQuery.error)) {
    return <AccessDenied />;
  }

  if (entryQuery.isLoading || !entryQuery.data) {
    return <Text c="dimmed">Loading journal entry...</Text>;
  }

  const entry = entryQuery.data;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Journal Entry #{entry.id}</Title>
        <Button component={Link} to="/accounting/journal-entries" variant="light">
          Back to list
        </Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Stack gap="xs">
          <Text>
            <strong>Date:</strong> {entry.date}
          </Text>
          <Text>
            <strong>Reference:</strong> {entry.reference_type}
          </Text>
          <Text>
            <strong>Status:</strong> {entry.status}
          </Text>
          <Text>
            <strong>Memo:</strong> {entry.memo || "-"}
          </Text>
        </Stack>
      </Card>

      <Divider />

      <Card withBorder radius="md" p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Account</Table.Th>
              <Table.Th>Cost Center</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Debit</Table.Th>
              <Table.Th>Credit</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entry.lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>
                  {line.account.code} - {line.account.name}
                </Table.Td>
                <Table.Td>
                  {line.cost_center
                    ? `${line.cost_center.code} - ${line.cost_center.name}`
                    : "-"}
                </Table.Td>
                <Table.Td>{line.description || "-"}</Table.Td>
                <Table.Td>{line.debit}</Table.Td>
                <Table.Td>{line.credit}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}