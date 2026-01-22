import { useMemo } from "react";
import { Badge, Button, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useCustomers } from "../../shared/customers/hooks";
import { useInvoices } from "../../shared/invoices/hooks";
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

export function InvoicesPage() {
  const navigate = useNavigate();
  const canManage = useCan("invoices.*");
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers({});

  const customerMap = useMemo(() => {
    return new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer]));
  }, [customersQuery.data]);

  if (isForbiddenError(invoicesQuery.error) || isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Invoices</Title>
        {canManage && (
          <Button onClick={() => navigate("/invoices/new")}>New Invoice</Button>
        )}
      </Group>

      <Card withBorder radius="md" p="md">
        {invoicesQuery.isLoading ? (
          <Text c="dimmed">Loading invoices...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice #</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Issue Date</Table.Th>
                <Table.Th>Due Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(invoicesQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed">No invoices found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (invoicesQuery.data ?? []).map((invoice) => (
                  <Table.Tr key={invoice.id}>
                    <Table.Td>{invoice.invoice_number}</Table.Td>
                    <Table.Td>{customerMap.get(invoice.customer)?.name ?? "-"}</Table.Td>
                    <Table.Td>{invoice.issue_date}</Table.Td>
                    <Table.Td>{invoice.due_date}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge color={statusColors[invoice.status] || "gray"}>
                          {invoice.status.replace("_", " ")}
                        </Badge>
                        {isInvoiceOverdue(invoice) && (
                          <Badge color="red" variant="light">
                            overdue
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>                    
                    <Table.Td>{invoice.total_amount}</Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        View
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}