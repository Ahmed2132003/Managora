import { Card, Stack, Title, Text } from "@mantine/core";

export function DashboardPage() {
  return (
    <Card withBorder radius="md" p="lg" mt="md">
      <Stack gap="xs">
        <Title order={3}>Dashboard</Title>
        <Text c="dimmed">
          Phase G: صفحة مؤقتة. في Phase H هنعمل /api/me/ بالـtoken + حماية routes.
        </Text>
      </Stack>
    </Card>
  );
}
