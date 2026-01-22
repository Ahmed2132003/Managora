import { useMemo, useState } from "react";
import { Button, Card, Group, Select, Stack, Table, Text, TextInput, Title, Badge } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { isForbiddenError } from "../../shared/api/errors";
import { useCan } from "../../shared/auth/useCan";
import { useCustomers } from "../../shared/customers/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";

export function CustomersPage() {
  const navigate = useNavigate();
  const canCreate = useCan("customers.create");
  const canEdit = useCan("customers.edit");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      is_active: activeFilter || undefined,
    }),
    [name, code, activeFilter]
  );

  const customersQuery = useCustomers(filters);

  if (isForbiddenError(customersQuery.error)) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Customers</Title>
        {canCreate && (
          <Button onClick={() => navigate("/customers/new")}>New Customer</Button>
        )}
      </Group>

      <Card withBorder radius="md" p="md">
        <Group align="end" gap="md" wrap="wrap">
          <TextInput
            label="Name"
            placeholder="Customer name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <TextInput
            label="Code"
            placeholder="CUST-0001"
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
          />
          <Select
            label="Status"
            placeholder="All"
            data={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
            value={activeFilter}
            onChange={setActiveFilter}
            clearable
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p="md">
        {customersQuery.isLoading ? (
          <Text c="dimmed">Loading customers...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Credit Limit</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(customersQuery.data ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed">No customers found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                (customersQuery.data ?? []).map((customer) => (
                  <Table.Tr key={customer.id}>
                    <Table.Td>{customer.code}</Table.Td>
                    <Table.Td>{customer.name}</Table.Td>
                    <Table.Td>{customer.phone || "-"}</Table.Td>
                    <Table.Td>{customer.credit_limit ?? "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={customer.is_active ? "green" : "gray"}>
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => navigate(`/customers/${customer.id}/edit`)}
                          >
                            Edit
                          </Button>
                        )}
                      </Group>
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