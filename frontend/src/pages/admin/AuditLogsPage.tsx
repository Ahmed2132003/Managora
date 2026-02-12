import { useMemo, useState } from "react";
import { Card, Group, Pagination, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useAuditLogs } from "../../shared/audit/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";

export function AuditLogsPage() {
  const canView = useCan("audit.view");
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState<"" | "create" | "update" | "delete">("");
  const [entity, setEntity] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const limit = 20;
  const offset = (page - 1) * limit;
  const filters = useMemo(
    () => ({ action_type: actionType, entity, q: query }),
    [actionType, entity, query],
  );
  const auditQuery = useAuditLogs(limit, offset, filters);

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
        <Group grow mb="md">
          <Select
            label="Action"
            placeholder="All actions"
            value={actionType}
            onChange={(value) => {
              setPage(1);
              setActionType(((value ?? "") as "" | "create" | "update" | "delete"));
            }}
            data={[
              { value: "", label: "All" },
              { value: "create", label: "Create" },
              { value: "update", label: "Update" },
              { value: "delete", label: "Delete" },
            ]}
          />
          <TextInput
            label="Entity"
            placeholder="e.g. employee"
            value={entity}
            onChange={(event) => {
              setPage(1);
              setEntity(event.currentTarget.value);
            }}
          />
          <TextInput
            label="Search"
            placeholder="User, action, or ID"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.currentTarget.value);
            }}
          />
        </Group>
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