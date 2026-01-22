import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,  
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccounts, useCreatePayment } from "../../shared/accounting/hooks";
import { useCustomers } from "../../shared/customers/hooks";
import { useInvoices } from "../../shared/invoices/hooks";

export function CollectionsPage() {
  const queryClient = useQueryClient();
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers({});
  const accountsQuery = useAccounts();
  const createPayment = useCreatePayment();

  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [cashAccountId, setCashAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const customerLookup = useMemo(() => {
    return new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer]));
  }, [customersQuery.data]);

  const openInvoices = useMemo(() => {
    return (invoicesQuery.data ?? []).filter(
      (invoice) =>
        Number(invoice.remaining_balance) > 0 && invoice.status !== "void"
    );
  }, [invoicesQuery.data]);

  const invoiceOptions = openInvoices.map((invoice) => ({
    value: String(invoice.id),
    label: `${invoice.invoice_number} - ${
      customerLookup.get(invoice.customer)?.name ?? `Customer #${invoice.customer}`
    }`,
  }));
  const accountOptions = (accountsQuery.data ?? []).map((account) => ({
    value: String(account.id),
    label: `${account.code} - ${account.name}`,
  }));

  const resetForm = () => {
    setInvoiceId(null);
    setPaymentDate("");
    setAmount("");
    setMethod("cash");
    setCashAccountId(null);
    setNotes("");
  };

  const submitPayment = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !paymentDate || !amount || !cashAccountId) {
        throw new Error("Please fill required fields.");
      }
      const invoice = (invoicesQuery.data ?? []).find(
        (item) => item.id === Number(invoiceId)
      );
      if (!invoice) {
        throw new Error("Invoice not found.");
      }
      await createPayment.mutateAsync({
        customer: invoice.customer,
        invoice: Number(invoiceId),
        payment_date: paymentDate,
        amount: String(amount),
        method,
        cash_account: Number(cashAccountId),
        notes: notes || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      resetForm();
      setModalOpen(false);
    },
  });

  const handleOpenModal = (selectedInvoiceId?: number) => {
    setInvoiceId(selectedInvoiceId ? String(selectedInvoiceId) : null);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setModalOpen(true);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Collections</Title>
        <Button onClick={() => handleOpenModal()}>Record Payment</Button>
      </Group>

      <Card withBorder radius="md" p="md">
        {invoicesQuery.isLoading ? (
          <Text c="dimmed">Loading invoices...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Invoice total</Table.Th>
                <Table.Th>Paid</Table.Th>
                <Table.Th>Remaining</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {openInvoices.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed">No open invoices found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                openInvoices.map((invoice) => (
                  <Table.Tr key={invoice.id}>
                    <Table.Td>{invoice.invoice_number}</Table.Td>
                    <Table.Td>                      
                      {customerLookup.get(invoice.customer)?.name ??
                        `Customer #${invoice.customer}`}
                    </Table.Td>
                    <Table.Td>{invoice.total_amount}</Table.Td>
                    <Table.Td>{invoice.total_paid}</Table.Td>
                    <Table.Td>{invoice.remaining_balance}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge color={invoice.status === "paid" ? "green" : "blue"}>
                          {invoice.status.replace("_", " ")}
                        </Badge>
                        {invoice.due_date < new Date().toISOString().slice(0, 10) && (
                          <Badge color="red" variant="light">
                            overdue
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"                        
                        onClick={() => handleOpenModal(invoice.id)}
                      >
                        Record Payment
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Record Payment"
        size="lg"
      >
        <Stack>
          <Select
            label="Invoice"
            placeholder="Select invoice"
            data={invoiceOptions}
            value={invoiceId}
            onChange={setInvoiceId}
            searchable
            required
          />
          <TextInput
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.currentTarget.value)}
            required
          />
          <NumberInput
            label="Amount"
            value={amount}
            onChange={setAmount}
            min={0}
            required
          />
          <Select
            label="Method"
            data={[
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank" },
            ]}
            value={method}
            onChange={(value) => setMethod((value as "cash" | "bank") ?? "cash")}
            required
          />
          <Select
            label="Cash/Bank account"
            placeholder="Select account"
            data={accountOptions}
            value={cashAccountId}
            onChange={setCashAccountId}
            searchable
            required
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => {
                if (!window.confirm("Record this payment?")) {
                  return;
                }
                submitPayment.mutate();
              }}
              loading={submitPayment.isPending}
            >
              Save
            </Button>            
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}