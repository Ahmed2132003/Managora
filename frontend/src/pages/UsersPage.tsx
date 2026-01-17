import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  MultiSelect,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  PasswordInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Controller,
  useForm,
  type ControllerRenderProps,
} from "react-hook-form";
import { z } from "zod";

import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { useCan } from "../shared/auth/useCan";

/* ================= Types ================= */

type Role = {
  id: number;
  name: string;
  slug: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  roles: Role[];
  date_joined: string;
};

/* ================= Schemas ================= */

const createSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  is_active: z.boolean(),
  role_ids: z.array(z.string()).optional().default([]),
});

const editSchema = z.object({
  id: z.number().int(),
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  email: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, {
      message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    }),
  is_active: z.boolean(),
  role_ids: z.array(z.string()).optional().default([]),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

const defaultCreateValues: CreateFormValues = {
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_ids: [],
};

const defaultEditValues: EditFormValues = {
  id: 0,
  username: "",
  email: "",
  password: "",
  is_active: true,
  role_ids: [],
};

/* ================= Page ================= */

export function UsersPage() {
  const queryClient = useQueryClient();

  const canCreate = useCan("users.create");
  const canEdit = useCan("users.edit");
  const canDelete = useCan("users.delete");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [createOpened, setCreateOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaultEditValues,
  });

  /* ================= Queries ================= */

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await http.get<Role[]>(endpoints.roles);
      return res.data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users", { search, roleFilter, activeFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.is_active = activeFilter;

      const res = await http.get<User[]>(endpoints.users, { params });
      return res.data;
    },
  });

  /* ================= Mutations ================= */

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const res = await http.post(endpoints.users, {
        username: values.username,
        email: values.email ?? "",
        password: values.password,
        is_active: values.is_active,
      });

      const roleIds = (values.role_ids ?? []).map(Number);
      if (roleIds.length > 0) {
        await http.post(`${endpoints.users}${res.data.id}/roles/`, {
          role_ids: roleIds,
        });
      }

      return res.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "User created",
        message: "تم إنشاء المستخدم بنجاح",
      });
      setCreateOpened(false);
      createForm.reset(defaultCreateValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues) => {
      const payload: Record<string, string | boolean> = {
        username: values.username,
        email: values.email ?? "",
        is_active: values.is_active,
      };

      if (values.password) payload.password = values.password;

      await http.patch(`${endpoints.users}${values.id}/`, payload);
      await http.post(`${endpoints.users}${values.id}/roles/`, {
        role_ids: (values.role_ids ?? []).map(Number),
      });
    },
    onSuccess: () => {
      notifications.show({
        title: "User updated",
        message: "تم تحديث المستخدم",
      });
      setEditOpened(false);
      editForm.reset(defaultEditValues);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`${endpoints.users}${id}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: "User deleted",
        message: "تم حذف المستخدم",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  /* ================= Helpers ================= */

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? []).map((r) => ({
        value: String(r.id),
        label: r.name,
      })),
    [rolesQuery.data]
  );

  function openEdit(user: User) {
    editForm.reset({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      password: "",
      is_active: user.is_active,
      role_ids: (user.roles ?? []).map((r) => String(r.id)),
    });
    setEditOpened(true);
  }

  function handleDelete(user: User) {
    if (!window.confirm(`حذف المستخدم ${user.username}?`)) return;
    deleteMutation.mutate(user.id);
  }

  const users = usersQuery.data ?? [];

  /* ================= UI ================= */

  return (
    <Stack gap="lg" mt="md">
      <Group justify="space-between">
        <Title order={3}>Users</Title>
        {canCreate && (
          <Button onClick={() => setCreateOpened(true)}>Create user</Button>
        )}
      </Group>

      <Card withBorder>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Select
              label="Role"
              data={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              clearable
            />
            <Select
              label="Active"
              data={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={activeFilter}
              onChange={setActiveFilter}
              clearable
            />
          </Group>

          {users.length > 0 && (
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Roles</Table.Th>
                  <Table.Th>Active</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.username}</Table.Td>
                    <Table.Td>{u.email || "-"}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {u.roles.map((r) => (
                          <Badge key={r.id}>{r.name}</Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={u.is_active ? "green" : "red"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {new Date(u.date_joined).toLocaleDateString("en-GB")}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {canEdit && (
                          <Button size="xs" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="xs"
                            color="red"
                            onClick={() => handleDelete(u)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>

      {/* Create Modal */}
      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title="Create user"
      >
        <form
          onSubmit={createForm.handleSubmit((values: CreateFormValues) =>
            createMutation.mutate(values)
          )}
        >
          <Stack>
            <TextInput label="Username" {...createForm.register("username")} />
            <TextInput label="Email" {...createForm.register("email")} />
            <PasswordInput label="Password" {...createForm.register("password")} />

            <Controller
              control={createForm.control}
              name="role_ids"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreateFormValues, "role_ids">;
              }) => <MultiSelect label="Roles" data={roleOptions} {...field} />}
            />

            <Controller
              control={createForm.control}
              name="is_active"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreateFormValues, "is_active">;
              }) => (
                <Switch
                  label="Active"
                  checked={field.value}
                  onChange={(e) =>
                    field.onChange(e.currentTarget.checked)
                  }
                />
              )}
            />

            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit user"
      >
        <form
          onSubmit={editForm.handleSubmit((values: EditFormValues) =>
            updateMutation.mutate(values)
          )}
        >
          <Stack>
            <TextInput label="Username" {...editForm.register("username")} />
            <TextInput label="Email" {...editForm.register("email")} />
            <PasswordInput
              label="New password"
              {...editForm.register("password")}
            />

            <Controller
              control={editForm.control}
              name="role_ids"
              render={({
                field,
              }: {
                field: ControllerRenderProps<EditFormValues, "role_ids">;
              }) => <MultiSelect label="Roles" data={roleOptions} {...field} />}
            />

            <Controller
              control={editForm.control}
              name="is_active"
              render={({
                field,
              }: {
                field: ControllerRenderProps<EditFormValues, "is_active">;
              }) => (
                <Switch
                  label="Active"
                  checked={field.value}
                  onChange={(e) =>
                    field.onChange(e.currentTarget.checked)
                  }
                />
              )}
            />

            <Button type="submit" loading={updateMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
