import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Select,
  NumberInput,
  FileInput,
  Textarea,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useAccounts,
  useApproveExpense,
  useCostCenters,
  useCreateExpense,
  useExpenses,
  useUploadExpenseAttachment,
} from "../../shared/accounting/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

export function ExpensesPage() {
  const queryClient = useQueryClient();

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendor, setVendor] = useState("");
  const [amountMin, setAmountMin] = useState<string | number>("");
  const [amountMax, setAmountMax] = useState<string | number>("");

  // Modal / Form
  const [createOpen, setCreateOpen] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState<number | string>("");
  const [expenseAccount, setExpenseAccount] = useState<string | null>(null);
  const [paidFromAccount, setPaidFromAccount] = useState<string | null>(null);
  const [costCenter, setCostCenter] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [formVendor, setFormVendor] = useState("");

  // ✅ FIX: FileInput expects File[] | undefined
  const [attachments, setAttachments] = useState<File[] | undefined>(undefined);

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      vendor: vendor || undefined,
      amountMin: amountMin ? String(amountMin) : undefined,
      amountMax: amountMax ? String(amountMax) : undefined,
    }),
    [dateFrom, dateTo, vendor, amountMin, amountMax]
  );

  const expensesQuery = useExpenses(filters);
  const accountsQuery = useAccounts();
  const costCentersQuery = useCostCenters();

  const createExpense = useCreateExpense();
  const uploadAttachment = useUploadExpenseAttachment();
  const approveExpense = useApproveExpense();

  const resetForm = () => {
    setFormDate("");
    setFormAmount("");
    setExpenseAccount(null);
    setPaidFromAccount(null);
    setCostCenter(null);
    setNotes("");
    setFormVendor("");
    setAttachments(undefined);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!formDate || !formAmount || !expenseAccount || !paidFromAccount) {
        throw new Error("Please fill required fields.");
      }

      const expense = await createExpense.mutateAsync({
        date: formDate,
        amount: String(formAmount),
        expense_account: Number(expenseAccount),
        paid_from_account: Number(paidFromAccount),
        cost_center: costCenter ? Number(costCenter) : null,
        notes,
        vendor_name: formVendor,
        status: "draft",
      });

      if (attachments && attachments.length > 0) {
        await Promise.all(
          attachments.map((file) =>
            uploadAttachment.mutateAsync({ id: expense.id, file })
          )
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
      setCreateOpen(false);
    },
  });

  if (
    isForbiddenError(expensesQuery.error) ||
    isForbiddenError(accountsQuery.error) ||
    isForbiddenError(costCentersQuery.error)
  ) {
    return <AccessDenied />;
  }

  const accountOptions = (accountsQuery.data ?? []).map((account) => ({
    value: String(account.id),
    label: `${account.code} - ${account.name}`,
  }));

  const costCenterOptions = (costCentersQuery.data ?? []).map((center) => ({
    value: String(center.id),
    label: `${center.code} - ${center.name}`,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Expenses</Title>
        <Button onClick={() => setCreateOpen(true)}>New Expense</Button>
      </Group>

      {/* Filters */}
      <Card withBorder radius="md" p="md">
        <Group align="end" gap="md" wrap="wrap">
          <TextInput
            label="Date from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.currentTarget.value)}
          />
          <TextInput
            label="Date to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.currentTarget.value)}
          />
          <TextInput
            label="Vendor"
            placeholder="Vendor name"
            value={vendor}
            onChange={(e) => setVendor(e.currentTarget.value)}
          />
          <NumberInput
            label="Amount min"
            value={amountMin}
            onChange={setAmountMin}
            min={0}
          />
          <NumberInput
            label="Amount max"
            value={amountMax}
            onChange={setAmountMax}
            min={0}
          />
        </Group>
      </Card>

      {/* Table */}
      <Card withBorder radius="md" p="md">
        {expensesQuery.isLoading ? (
          <Text c="dimmed">Loading expenses...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Vendor</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(expensesQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed">No expenses found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (expensesQuery.data ?? []).map((expense) => (
                  <Table.Tr key={expense.id}>
                    <Table.Td>{expense.date}</Table.Td>
                    <Table.Td>{expense.vendor_name || "-"}</Table.Td>
                    <Table.Td>{expense.amount}</Table.Td>
                    <Table.Td>{expense.status}</Table.Td>
                    <Table.Td>{expense.notes || "-"}</Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        disabled={expense.status === "approved"}
                        loading={approveExpense.isPending}
                        onClick={() =>
                          approveExpense.mutate(expense.id, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: ["expenses"],
                              });
                            },
                          })
                        }
                      >
                        Approve
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Expense"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Amount"
            value={formAmount}
            onChange={setFormAmount}
            min={0}
            required
          />
          <TextInput
            label="Vendor"
            value={formVendor}
            onChange={(e) => setFormVendor(e.currentTarget.value)}
          />
          <Select
            label="Expense account"
            data={accountOptions}
            value={expenseAccount}
            onChange={setExpenseAccount}
            searchable
            required
          />
          <Select
            label="Paid from account"
            data={accountOptions}
            value={paidFromAccount}
            onChange={setPaidFromAccount}
            searchable
            required
          />
          <Select
            label="Cost center"
            data={costCenterOptions}
            value={costCenter}
            onChange={setCostCenter}
            clearable
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <FileInput
            label="Attachments"
            placeholder="Upload files"
            multiple
            value={attachments}
            onChange={setAttachments}
          />

          {submitMutation.isError && (
            <Text c="red" size="sm">
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : "Failed to create expense."}
            </Text>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                resetForm();
                setCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              loading={submitMutation.isPending}
            >
              Save Draft
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
