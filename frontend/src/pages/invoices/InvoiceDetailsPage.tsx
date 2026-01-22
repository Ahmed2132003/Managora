import { useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCustomers } from "../../shared/customers/hooks";
import { useInvoice, useIssueInvoice } from "../../shared/invoices/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const statusColors: Record<string, string> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "yellow",
  paid: "green",
  void: "red",
};

export function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceQuery = useInvoice(id);
  const customersQuery = useCustomers({});
  const issueInvoice = useIssueInvoice();

  const customerName = useMemo(() => {
    const customerId = invoiceQuery.data?.customer;
    return (customersQuery.data ?? []).find((customer) => customer.id === customerId)?.name;
  }, [customersQuery.data, invoiceQuery.data?.customer]);

  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceQuery.data) {
        throw new Error("Invoice not loaded.");
      }
      return issueInvoice.mutateAsync(invoiceQuery.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  if (isForbiddenError(invoiceQuery.error) || isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  if (invoiceQuery.isLoading || !invoiceQuery.data) {
    return <Text c="dimmed">Loading invoice...</Text>;
  }

  const invoice = invoiceQuery.data;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={3}>Invoice {invoice.invoice_number}</Title>
          <Text c="dimmed">{customerName ?? "Unknown customer"}</Text>
        </Stack>
        <Group>
          <Button component={Link} to="/invoices" variant="default">
            Back to Invoices
          </Button>
          {invoice.status === "draft" && (
            <Button onClick={() => issueMutation.mutate()} loading={issueMutation.isPending}>
              Issue Invoice
            </Button>
          )}
        </Group>
      </Group>

      <Card withBorder radius="md" p="md">
        <Group justify="space-between">
          <Stack gap={4}>
            <Text>Issue Date: {invoice.issue_date}</Text>
            <Text>Due Date: {invoice.due_date}</Text>
          </Stack>
          <Badge color={statusColors[invoice.status] || "gray"}>
            {invoice.status.replace("_", " ")}
          </Badge>
        </Group>

        <Divider my="md" />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Description</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Unit Price</Table.Th>
              <Table.Th>Line Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invoice.lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>{line.description}</Table.Td>
                <Table.Td>{line.quantity}</Table.Td>
                <Table.Td>{line.unit_price}</Table.Td>
                <Table.Td>{line.line_total}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Divider my="md" />

        <Group justify="flex-end">
          <Stack gap={4}>
            <Text>Subtotal: {invoice.subtotal}</Text>
            <Text>Tax: {invoice.tax_amount ?? "0.00"}</Text>
            <Text fw={600}>Total: {invoice.total_amount}</Text>
          </Stack>
        </Group>

        {invoice.notes && (
          <Text mt="md" c="dimmed">
            Notes: {invoice.notes}
          </Text>
        )}
      </Card>

      {issueMutation.error && (
        <Text c="red">{(issueMutation.error as Error).message}</Text>
      )}

      <Button variant="subtle" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Stack>
  );
}