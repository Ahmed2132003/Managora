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
import { useMe } from "../../shared/auth/useMe";
import { useCustomers } from "../../shared/customers/hooks";
import { useDeleteInvoice, useInvoice, useIssueInvoice } from "../../shared/invoices/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const statusColors: Record<string, string> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "yellow",
  paid: "green",
  void: "red",
};

const isInvoiceOverdue = (invoice: { due_date: string; remaining_balance: string; status: string }) => {
  if (invoice.status === "paid" || invoice.status === "void") {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  return invoice.due_date < today && Number(invoice.remaining_balance) > 0;
};

export function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invoiceQuery = useInvoice(id);
  const customersQuery = useCustomers({});
  const meQuery = useMe();
  const issueInvoice = useIssueInvoice();
  const deleteInvoice = useDeleteInvoice();

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
  const overdue = isInvoiceOverdue(invoice);
  const hasLines = invoice.lines.length > 0;
  const user = meQuery.data?.user;
  const currentUserName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username;
  const userRoles = meQuery.data?.roles ?? [];
  const isManager = userRoles.some((role) => role.name.toLowerCase() === "manager");
  const isAccountant = userRoles.some((role) => role.name.toLowerCase() === "accountant");
  const companyName = meQuery.data?.company.name ?? "-";

  const canEditDelete = isManager || isAccountant;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceQuery.data) {
        throw new Error("Invoice not loaded.");
      }
      return deleteInvoice.mutateAsync(invoiceQuery.data.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate("/invoices");
    },
  });

  return (
    <Stack gap="lg">      
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={3}>Invoice {invoice.invoice_number}</Title>
          <Text c="dimmed">{customerName ?? "Unknown customer"}</Text>
          <Text c="dimmed" size="sm">
            Company: {companyName}
          </Text>
          <Text c="dimmed" size="sm">
            Company Manager: {isManager ? currentUserName : "-"}
          </Text>
          {isAccountant && (
            <Text c="dimmed" size="sm">
              Accountant: {currentUserName}
            </Text>
          )}
        </Stack>        
        <Group>
          <Button component={Link} to="/invoices" variant="default">
            Back to Invoices
          </Button>
          {canEditDelete && (
            <>
              <Button variant="default" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                Edit
              </Button>
              <Button
                color="red"
                variant="light"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (!window.confirm("Delete this invoice?")) {
                    return;
                  }
                  deleteMutation.mutate();
                }}
              >
                Delete
              </Button>
            </>
          )}
          {invoice.status === "draft" && (
            <Button
              onClick={() => {
                if (!hasLines) {
                  return;
                }
                if (!window.confirm("Issue this invoice now?")) {
                  return;
                }
                issueMutation.mutate();
              }}
              loading={issueMutation.isPending}
              disabled={!hasLines}
            >
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
          <Group gap="xs">
            <Badge color={statusColors[invoice.status] || "gray"}>
              {invoice.status.replace("_", " ")}
            </Badge>
            {overdue && (
              <Badge color="red" variant="light">
                overdue
              </Badge>
            )}
          </Group>
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
            {invoice.lines.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed">No line items yet.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              invoice.lines.map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>{line.description}</Table.Td>
                  <Table.Td>{line.quantity}</Table.Td>
                  <Table.Td>{line.unit_price}</Table.Td>
                  <Table.Td>{line.line_total}</Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        <Divider my="md" />

        <Group justify="flex-end">
          <Stack gap={4}>
            <Text>Subtotal: {invoice.subtotal}</Text>
            <Text>Tax Rate: {invoice.tax_rate ?? "0.00"}%</Text>
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

      {deleteMutation.error && (
        <Text c="red">{(deleteMutation.error as Error).message}</Text>
      )}

      <Button variant="subtle" onClick={() => navigate(-1)}>
        Go Back
      </Button>
    </Stack>
  );
}