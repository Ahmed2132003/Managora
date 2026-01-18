import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { isForbiddenError } from "../../shared/api/errors.ts";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type Department,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";

const departmentSchema = z.object({
  name: z.string().min(1, "اسم القسم مطلوب"),
  is_active: z.boolean(),
});

type DepartmentFormValues = z.input<typeof departmentSchema>;

const defaultValues: DepartmentFormValues = {
  name: "",
  is_active: true,
};

export function DepartmentsPage() {
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const departmentsQuery = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues,
  });
  const isActiveValue = useWatch({ control: form.control, name: "is_active" });

  useEffect(() => {
    if (editing) {
      form.reset({ name: editing.name, is_active: editing.is_active });
    } else {
      form.reset(defaultValues);
    }
  }, [editing, form]);

  if (isForbiddenError(departmentsQuery.error)) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: DepartmentFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: "Department updated",
          message: "تم تحديث القسم",
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: "Department created",
          message: "تم إنشاء القسم",
        });
      }
      setOpened(false);
      setEditing(null);
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Save failed",
        message: String(error),
        color: "red",
      });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({
        title: "Department deleted",
        message: "تم حذف القسم",
      });
      departmentsQuery.refetch();
    } catch (error) {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={3}>Departments</Title>
        <Button onClick={() => setOpened(true)}>Add Department</Button>
      </Group>

      <Card withBorder radius="md" p="md">
        {departmentsQuery.isLoading ? (
          <Text c="dimmed">Loading departments...</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(departmentsQuery.data ?? []).map((department) => (
                <Table.Tr key={department.id}>
                  <Table.Td>{department.name}</Table.Td>
                  <Table.Td>
                    <Badge color={department.is_active ? "green" : "gray"}>
                      {department.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setEditing(department);
                          setOpened(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(department.id)}
                        loading={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setEditing(null);
        }}
        title={editing ? "Edit Department" : "New Department"}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              required
              {...form.register("name")}
              error={form.formState.errors.name?.message}
            />
            <Switch
              label="Active"
              checked={Boolean(isActiveValue)}
              onChange={(event) => form.setValue("is_active", event.currentTarget.checked)}              
            />
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}