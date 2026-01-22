import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useAlerts, useAgingReport } from "../../shared/accounting/hooks";
import { useInvoices } from "../../shared/invoices/hooks";

const bucketColors: Record<string, string> = {
  "0_30": "green",
  "31_60": "yellow",
  "61_90": "orange",
  "90_plus": "red",
};

function daysOverdue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function AgingReportPage() {
  const agingQuery = useAgingReport();
  const alertsQuery = useAlerts();
  const invoicesQuery = useInvoices();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const selectedCustomerName = useMemo(() => {
    return (
      agingQuery.data?.find((row) => row.customer.id === selectedCustomerId)?.customer
        .name ?? ""
    );
  }, [agingQuery.data, selectedCustomerId]);

  const overdueInvoices = useMemo(() => {
    if (!selectedCustomerId) {
      return [];
    }
    const today = new Date().toISOString().slice(0, 10);
    return (invoicesQuery.data ?? []).filter(
      (invoice) =>
        invoice.customer === selectedCustomerId &&
        invoice.remaining_balance !== "0.00" &&
        invoice.due_date < today
    );
  }, [invoicesQuery.data, selectedCustomerId]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Aging Dashboard</Title>
      </Group>

      <Card withBorder radius="md" p="md">
        {agingQuery.isLoading ? (
          <Text c="dimmed">Loading aging report...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Total Due</Table.Th>
                <Table.Th>0–30</Table.Th>
                <Table.Th>31–60</Table.Th>
                <Table.Th>61–90</Table.Th>
                <Table.Th>90+</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(agingQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed">No overdue invoices.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (agingQuery.data ?? []).map((row) => (
                  <Table.Tr key={row.customer.id}>
                    <Table.Td>
                      <Text
                        component="button"
                        onClick={() => setSelectedCustomerId(row.customer.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        {row.customer.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.total_due}</Table.Td>
                    {(["0_30", "31_60", "61_90", "90_plus"] as const).map((key) => (
                      <Table.Td key={key}>
                        <Badge color={bucketColors[key]} variant="light">
                          {row.buckets[key]}
                        </Badge>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card withBorder radius="md" p="md">
        <Title order={4} mb="sm">
          Alerts Center
        </Title>
        {alertsQuery.isLoading ? (
          <Text c="dimmed">Loading alerts...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Severity</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(alertsQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed">No alerts yet.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (alertsQuery.data ?? []).map((alert) => (
                  <Table.Tr key={alert.id}>
                    <Table.Td>
                      <Badge color={alert.severity === "high" ? "red" : "yellow"}>
                        {alert.severity}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{alert.type.replace("_", " ")}</Table.Td>
                    <Table.Td>{alert.message}</Table.Td>
                    <Table.Td>{new Date(alert.created_at).toLocaleDateString()}</Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        title={`Overdue invoices ${selectedCustomerName ? `- ${selectedCustomerName}` : ""}`}
        size="lg"
      >
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice</Table.Th>
              <Table.Th>Due date</Table.Th>
              <Table.Th>Days overdue</Table.Th>
              <Table.Th>Remaining</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {overdueInvoices.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed">No overdue invoices for this customer.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              overdueInvoices.map((invoice) => (
                <Table.Tr key={invoice.id}>
                  <Table.Td>{invoice.invoice_number}</Table.Td>
                  <Table.Td>{invoice.due_date}</Table.Td>
                  <Table.Td>{daysOverdue(invoice.due_date)}</Table.Td>
                  <Table.Td>{invoice.remaining_balance}</Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Modal>
    </Stack>
  );
}