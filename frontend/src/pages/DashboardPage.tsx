import { Card, Stack, Title, Text, Group, Button } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { http } from "../shared/api/http";
import { endpoints } from "../shared/api/endpoints";
import { clearTokens } from "../shared/auth/tokens";
import { useNavigate } from "react-router-dom";

type MeResponse = {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  company: {
    id: number;
    name: string;
  };
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await http.get<MeResponse>(endpoints.me);
      return response.data;
    },
  });

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <Card withBorder radius="md" p="lg" mt="md">
      <Stack gap="xs">
        <Title order={3}>Dashboard</Title>
        {isLoading && <Text c="dimmed">جاري تحميل بيانات الحساب...</Text>}
        {isError && (
          <Text c="red">
            حصل خطأ أثناء تحميل البيانات. حاول تسجيل الدخول مرة أخرى.
          </Text>
        )}
        {data && (
          <Stack gap="xs">
            <Text>أهلاً {data.user.first_name || data.user.username}.</Text>
            <Text c="dimmed">الشركة: {data.company.name}</Text>
          </Stack>
        )}
        <Group mt="md">
          <Button variant="light" onClick={handleLogout}>
            Logout
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}