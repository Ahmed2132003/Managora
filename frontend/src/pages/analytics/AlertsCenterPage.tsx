import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useAckAlert,
  useAlert,
  useAlerts,
  useResolveAlert,
} from "../../shared/analytics/hooks";
import type { AlertSeverity, AlertStatus } from "../../shared/analytics/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const severityColor: Record<AlertSeverity, string> = {
  low: "green",
  medium: "yellow",
  high: "red",
};

const statusColor: Record<AlertStatus, string> = {
  open: "red",
  acknowledged: "yellow",
  resolved: "green",
};

export function AlertsCenterPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AlertStatus | "">("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const filters = useMemo(
    () => ({
      status: status || undefined,
      range: "30d",
    }),
    [status]
  );

  const alertsQuery = useAlerts(filters);
  const alertDetailQuery = useAlert(selectedId);
  const ackAlert = useAckAlert();
  const resolveAlert = useResolveAlert();

  if (isForbiddenError(alertsQuery.error)) {
    return <AccessDenied />;
  }

  const closeModal = () => {
    setSelectedId(null);
    setNote("");
  };

  const handleAck = async (id: number) => {
    await ackAlert.mutateAsync({ id, note });
    await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    await queryClient.invalidateQueries({ queryKey: ["alert", id] });
    setNote("");
  };

  const handleResolve = async (id: number) => {
    await resolveAlert.mutateAsync(id);
    await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    await queryClient.invalidateQueries({ queryKey: ["alert", id] });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Alerts Center</Title>
        <Select
          label="Status"
          value={status}
          onChange={(value) => setStatus((value as AlertStatus) ?? "")}
          data={[
            { value: "", label: "All" },
            { value: "open", label: "Open" },
            { value: "acknowledged", label: "Acknowledged" },
            { value: "resolved", label: "Resolved" },
          ]}
        />
      </Group>

      <Card withBorder radius="md" p="md">
        {alertsQuery.isLoading ? (
          <Text c="dimmed">Loading alerts...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(alertsQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed">No alerts found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (alertsQuery.data ?? []).map((alert) => (
                  <Table.Tr key={alert.id}>
                    <Table.Td>{alert.event_date}</Table.Td>
                    <Table.Td>
                      <Badge color={severityColor[alert.severity]}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{alert.title}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColor[alert.status]}>
                        {alert.status.replace("_", " ")}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setSelectedId(alert.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => handleAck(alert.id)}
                          disabled={alert.status === "resolved"}
                        >
                          Ack
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => handleResolve(alert.id)}
                          disabled={alert.status === "resolved"}
                        >
                          Resolve
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={selectedId !== null}
        onClose={closeModal}
        title="Alert Details"
        size="lg"
      >
        {alertDetailQuery.isLoading ? (
          <Text c="dimmed">Loading details...</Text>
        ) : alertDetailQuery.data ? (
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>{alertDetailQuery.data.title}</Title>
              <Badge color={severityColor[alertDetailQuery.data.severity]}>
                {alertDetailQuery.data.severity.toUpperCase()}
              </Badge>
            </Group>
            <Text>{alertDetailQuery.data.message}</Text>

            <Card withBorder radius="md" p="md">
              <Stack gap="xs">
                <Title order={5}>Evidence</Title>
                <Text>
                  Today: {alertDetailQuery.data.evidence.today_value}
                </Text>
                <Text>
                  Baseline avg: {alertDetailQuery.data.evidence.baseline_avg}
                </Text>
                <Text>
                  Delta: {alertDetailQuery.data.evidence.delta_percent ?? "N/A"}%
                </Text>
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Stack gap="xs">
                <Title order={5}>Why?</Title>
                {(alertDetailQuery.data.evidence.contributors ?? []).length === 0 ? (
                  <Text c="dimmed">No contributors available.</Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Dimension</Table.Th>
                        <Table.Th>Contributor</Table.Th>
                        <Table.Th>Amount</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(alertDetailQuery.data.evidence.contributors ?? []).map(
                        (item, index) => (
                          <Table.Tr key={`${item.dimension}-${index}`}>
                            <Table.Td>{item.dimension}</Table.Td>
                            <Table.Td>{item.dimension_id}</Table.Td>
                            <Table.Td>{item.amount}</Table.Td>
                          </Table.Tr>
                        )
                      )}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Stack gap="xs">
                <Title order={5}>Recommended Actions</Title>
                {(alertDetailQuery.data.recommended_actions ?? []).length === 0 ? (
                  <Text c="dimmed">No recommendations available.</Text>
                ) : (
                  <Stack gap="xs">
                    {alertDetailQuery.data.recommended_actions.map((action, index) => (
                      <Text key={index}>• {action}</Text>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Stack gap="xs">
                <Title order={5}>Acknowledge</Title>
                <Textarea
                  label="Note"
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                />
                <Group justify="flex-end">
                  <Button
                    variant="light"
                    onClick={() => selectedId && handleAck(selectedId)}
                    disabled={alertDetailQuery.data.status === "resolved"}
                  >
                    Ack Alert
                  </Button>
                  <Button
                    onClick={() => selectedId && handleResolve(selectedId)}
                    disabled={alertDetailQuery.data.status === "resolved"}
                  >
                    Resolve Alert
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Stack>
        ) : (
          <Text c="dimmed">No details available.</Text>
        )}
      </Modal>
    </Stack>
  );
}