import { useState } from "react";
import { Card, Group, Pagination, Stack, Table, Text, Title } from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useAuditLogs } from "../../shared/audit/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";

export function AuditLogsPage() {
  const canView = useCan("audit.view");
  const [page, setPage] = useState(1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const auditQuery = useAuditLogs(limit, offset);

  if (!canView || isForbiddenError(auditQuery.error)) {
    return <AccessDenied />;
  }

  const total = auditQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Audit Logs</Title>
        <Text c="dimmed">Total: {total}</Text>
      </Group>

      <Card withBorder radius="md" p="md">
        {auditQuery.isLoading ? (
          <Text c="dimmed">Loading audit logs...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Entity</Table.Th>
                <Table.Th>IP</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(auditQuery.data?.results ?? []).map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{new Date(log.created_at).toLocaleString()}</Table.Td>
                  <Table.Td>{log.actor_username || "-"}</Table.Td>
                  <Table.Td>{log.action}</Table.Td>
                  <Table.Td>
                    {log.entity} #{log.entity_id}
                  </Table.Td>
                  <Table.Td>{log.ip_address || "-"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}
    </Stack>
  );
}