import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Skeleton,
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
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
  type JobTitle,
} from "../../shared/hr/hooks.ts";
import { AccessDenied } from "../../shared/ui/AccessDenied.tsx";

const jobTitleSchema = z.object({
  name: z.string().min(1, "المسمى مطلوب"),
  is_active: z.boolean(),
});

type JobTitleFormValues = z.input<typeof jobTitleSchema>;

const defaultValues: JobTitleFormValues = {
  name: "",
  is_active: true,
};

export function JobTitlesPage() {
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<JobTitle | null>(null);

  const jobTitlesQuery = useJobTitles();
  const createMutation = useCreateJobTitle();
  const updateMutation = useUpdateJobTitle();
  const deleteMutation = useDeleteJobTitle();

  const form = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
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

  if (isForbiddenError(jobTitlesQuery.error)) {
    return <AccessDenied />;
  }

  async function handleSubmit(values: JobTitleFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: values,
        });
        notifications.show({
          title: "Job title updated",
          message: "تم تحديث المسمى الوظيفي",
        });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({
          title: "Job title created",
          message: "تم إنشاء المسمى الوظيفي",
        });
      }
      setOpened(false);
      setEditing(null);
      jobTitlesQuery.refetch();
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
        title: "Job title deleted",
        message: "تم حذف المسمى الوظيفي",
      });
      jobTitlesQuery.refetch();
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
        <Title order={3}>Job Titles</Title>
        <Button onClick={() => setOpened(true)}>Add Job Title</Button>
      </Group>

      <Card withBorder radius="md" p="md">
        {jobTitlesQuery.isLoading ? (
          <Stack gap="sm">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={32} radius="sm" />
            ))}
          </Stack>
        ) : (
          (jobTitlesQuery.data ?? []).length === 0 ? (
            <Text c="dimmed">لا توجد مسميات بعد. أضف مسمى وظيفي جديد.</Text>
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
                {(jobTitlesQuery.data ?? []).map((jobTitle) => (
                  <Table.Tr key={jobTitle.id}>
                    <Table.Td>{jobTitle.name}</Table.Td>
                    <Table.Td>
                      <Badge color={jobTitle.is_active ? "green" : "gray"}>
                        {jobTitle.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => {
                            setEditing(jobTitle);
                            setOpened(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(jobTitle.id)}
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
          )
        )}
      </Card>
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setEditing(null);
        }}
        title={editing ? "Edit Job Title" : "New Job Title"}
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