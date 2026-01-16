import { Outlet, Link } from "react-router-dom";
import { AppShell, Group, Title, Button, Container } from "@mantine/core";

export function AppLayout() {
  return (
    <AppShell
      header={{ height: 64 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="md">
            <Title order={4}>Company OS</Title>
            <Button component={Link} to="/dashboard" variant="subtle">
              Dashboard
            </Button>
          </Group>

          {/* في مرحلة H هنحط user menu + logout */}
          <Button component={Link} to="/login" variant="light">
            Login
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
