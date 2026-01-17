import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "../shared/api/endpoints";
import { http } from "../shared/api/http";
import { useCan } from "../shared/auth/useCan";

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
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [editForm, setEditForm] = useState({
    id: 0,
    username: "",
    email: "",
    password: "",
    is_active: true,
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await http.get<Role[]>(endpoints.roles);
      return response.data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users", { search, roleFilter, activeFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search.trim()) {
        params.search = search.trim();
      }
      if (roleFilter) {
        params.role = roleFilter;
      }
      if (activeFilter) {
        params.is_active = activeFilter;
      }

      const response = await http.get<User[]>(endpoints.users, { params });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await http.post(endpoints.users, {
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        is_active: createForm.is_active,
      });
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "User created",
        message: "تم إنشاء المستخدم بنجاح.",
      });
      setCreateOpened(false);
      setCreateForm({ username: "", email: "", password: "", is_active: true });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: "Create failed",
        message: String(error),
        color: "red",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | boolean> = {
        username: editForm.username,
        email: editForm.email,
        is_active: editForm.is_active,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const response = await http.patch(`${endpoints.users}${editForm.id}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: "User updated",
        message: "تم تحديث المستخدم بنجاح.",
      });
      setEditOpened(false);
      setEditForm({ id: 0, username: "", email: "", password: "", is_active: true });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: "Update failed",
        message: String(error),
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await http.delete(`${endpoints.users}${userId}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: "User deleted",
        message: "تم حذف المستخدم.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: "Delete failed",
        message: String(error),
        color: "red",
      });
    },
  });

  const roleOptions = useMemo(() => {
    const roles = rolesQuery.data ?? [];
    return roles.map((role) => ({ value: String(role.id), label: role.name }));
  }, [rolesQuery.data]);

  function openEdit(user: User) {
    setEditForm({
      id: user.id,
      username: user.username,
      email: user.email ?? "",
      password: "",
      is_active: user.is_active,
    });
    setEditOpened(true);
  }

  function handleDelete(user: User) {
    if (!window.confirm(`حذف المستخدم ${user.username}?`)) {
      return;
    }
    deleteMutation.mutate(user.id);
  }

  const users = usersQuery.data ?? [];

  return (
    <Stack gap="lg" mt="md">
      <Group justify="space-between">
        <Title order={3}>Users</Title>
        {canCreate && (
          <Button onClick={() => setCreateOpened(true)}>Create user</Button>
        )}
      </Group>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Group grow align="flex-end">
            <TextInput
              label="Search"
              placeholder="username أو email"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
            <Select
              label="Role"
              placeholder="كل الأدوار"
              data={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              clearable
            />
            <Select
              label="Active"
              placeholder="الكل"
              data={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={activeFilter}
              onChange={setActiveFilter}
              clearable
            />
          </Group>

          {usersQuery.isLoading && <Text c="dimmed">جارٍ تحميل المستخدمين...</Text>}
          {usersQuery.isError && (
            <Text c="red">حصل خطأ أثناء تحميل المستخدمين.</Text>
          )}

          {!usersQuery.isLoading && users.length === 0 && (
            <Text c="dimmed">لا يوجد مستخدمون حتى الآن.</Text>
          )}

          {users.length > 0 && (
            <Table striped highlightOnHover>
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
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>{user.username}</Table.Td>
                    <Table.Td>{user.email || "-"}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {user.roles.length === 0 && (
                          <Text size="sm" c="dimmed">
                            -
                          </Text>
                        )}
                        {user.roles.map((role) => (
                          <Badge key={role.id} variant="light">
                            {role.name}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={user.is_active ? "green" : "red"} variant="light">
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {new Date(user.date_joined).toLocaleDateString("en-GB")}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => openEdit(user)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => handleDelete(user)}
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

      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title="Create user"
        centered
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <Stack gap="md">
            <TextInput
              label="Username"
              value={createForm.username}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, username: event.currentTarget.value }))
              }
              required
            />
            <TextInput
              label="Email"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, email: event.currentTarget.value }))
              }
            />
            <PasswordInput
              label="Password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, password: event.currentTarget.value }))
              }
              required
            />
            <Switch
              label="Active"
              checked={createForm.is_active}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, is_active: event.currentTarget.checked }))
              }
            />
            <Group justify="flex-end">
              <Button type="submit" loading={createMutation.isPending}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit user"
        centered
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
        >
          <Stack gap="md">
            <TextInput
              label="Username"
              value={editForm.username}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, username: event.currentTarget.value }))
              }
              required
            />
            <TextInput
              label="Email"
              value={editForm.email}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, email: event.currentTarget.value }))
              }
            />
            <PasswordInput
              label="New password (optional)"
              value={editForm.password}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, password: event.currentTarget.value }))
              }
            />
            <Switch
              label="Active"
              checked={editForm.is_active}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, is_active: event.currentTarget.checked }))
              }
            />
            <Group justify="flex-end">
              <Button type="submit" loading={updateMutation.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}