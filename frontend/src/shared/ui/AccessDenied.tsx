import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";

export function AccessDenied() {
  const navigate = useNavigate();

  return (
    <Card withBorder radius="md" p="xl" mt="xl">
      <Stack gap="md" align="center">
        <Title order={2}>Access Denied</Title>
        <Text c="dimmed" ta="center">
          ليس لديك صلاحية للوصول لهذه الصفحة. من فضلك تواصل مع مسؤول النظام.
        </Text>
        <Button variant="light" onClick={() => navigate("/dashboard")}>
          الرجوع للوحة التحكم
        </Button>
      </Stack>
    </Card>
  );
}