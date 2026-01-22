import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCustomers } from "../../shared/customers/hooks";
import { useCreateInvoice, useIssueInvoice } from "../../shared/invoices/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

const createEmptyLine = () => ({
  description: "",
  quantity: 1,
  unit_price: 0,
});

const toDateString = (value: Date) => value.toISOString().slice(0, 10);

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const customersQuery = useCustomers({});
  const createInvoice = useCreateInvoice();
  const issueInvoice = useIssueInvoice();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [taxAmount, setTaxAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([createEmptyLine()]);

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? []).map((customer) => ({
        value: String(customer.id),
        label: `${customer.code} - ${customer.name}`,
      })),
    [customersQuery.data]
  );

  const selectedCustomer = useMemo(() => {
    return (customersQuery.data ?? []).find((customer) => String(customer.id) === customerId);
  }, [customersQuery.data, customerId]);

  const lineTotals = useMemo(
    () => lines.map((line) => Number(line.quantity) * Number(line.unit_price)),
    [lines]
  );

  const subtotal = useMemo(
    () => lineTotals.reduce((sum, value) => sum + value, 0),
    [lineTotals]
  );

  const taxValue = taxAmount === "" ? 0 : Number(taxAmount);
  const totalAmount = subtotal + taxValue;
  const hasLines = lines.length > 0;
  const canIssue = Boolean(invoiceNumber && customerId && issueDate && hasLines);

  const dueDatePreview = useMemo(() => {
    if (!issueDate || !selectedCustomer) {
      return "";
    }
    const baseDate = new Date(`${issueDate}T00:00:00`);
    if (Number.isNaN(baseDate.getTime())) {
      return "";
    }
    baseDate.setDate(baseDate.getDate() + selectedCustomer.payment_terms_days);
    return toDateString(baseDate);
  }, [issueDate, selectedCustomer]);

  const updateLine = (index: number, updates: Partial<(typeof lines)[number]>) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, ...updates } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine()]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitMutation = useMutation({
    mutationFn: async (action: "draft" | "issue") => {
      if (!invoiceNumber || !customerId || !issueDate) {
        throw new Error("Please complete required fields.");
      }
      if (lines.length === 0) {
        throw new Error("Please add at least one line item.");
      }

      const payload = {
        invoice_number: invoiceNumber,
        customer: Number(customerId),
        issue_date: issueDate,
        tax_amount: taxAmount === "" ? undefined : String(taxAmount),
        notes,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: String(line.quantity),
          unit_price: String(line.unit_price),
        })),
      };

      const invoice = await createInvoice.mutateAsync(payload);
      if (action === "issue") {
        return await issueInvoice.mutateAsync(invoice.id);
      }
      return invoice;
    },
    onSuccess: async (invoice) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${invoice.id}`);
    },
  });

  if (isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>New Invoice</Title>
        <Button variant="default" onClick={() => navigate("/invoices")}>Back to Invoices</Button>
      </Group>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Group grow align="end">
            <TextInput
              label="Invoice Number"
              placeholder="INV-0001"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.currentTarget.value)}
              required
            />
            <Select
              label="Customer"
              placeholder="Select customer"
              data={customerOptions}
              value={customerId}
              onChange={setCustomerId}
              required
            />
            <TextInput
              label="Issue Date"
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Due Date (preview)"
              value={dueDatePreview}
              readOnly
            />
          </Group>

          <Divider label="Line Items" />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Description</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Unit Price</Table.Th>
                <Table.Th>Line Total</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <TextInput
                      placeholder="Service"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, { description: event.currentTarget.value })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.quantity}
                      min={0}
                      onChange={(value) =>
                        updateLine(index, { quantity: Number(value) || 0 })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={line.unit_price}
                      min={0}
                      onChange={(value) =>
                        updateLine(index, { unit_price: Number(value) || 0 })
                      }
                    />
                  </Table.Td>
                  <Table.Td>{lineTotals[index].toFixed(2)}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      Remove
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Button variant="light" onClick={addLine}>
            Add Line
          </Button>

          <Group grow align="end">
            <NumberInput
              label="Tax"
              value={taxAmount}
              min={0}
              onChange={setTaxAmount}
            />
            <TextInput label="Subtotal" value={subtotal.toFixed(2)} readOnly />
            <TextInput label="Total" value={totalAmount.toFixed(2)} readOnly />
          </Group>

          <Textarea
            label="Notes"
            placeholder="Additional notes"
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />

          {submitMutation.error && (
            <Text c="red">{(submitMutation.error as Error).message}</Text>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => submitMutation.mutate("draft")}
              loading={submitMutation.isPending}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => {
                if (!window.confirm("Issue this invoice now?")) {
                  return;
                }
                submitMutation.mutate("issue");
              }}
              loading={submitMutation.isPending}
              disabled={!canIssue}
            >
              Issue Invoice
            </Button>
          </Group>          
        </Stack>
      </Card>
    </Stack>
  );
}