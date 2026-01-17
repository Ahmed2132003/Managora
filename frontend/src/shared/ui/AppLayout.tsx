import { Outlet, Link, useNavigate } from "react-router-dom";
import { AppShell, Group, Title, Button, Container } from "@mantine/core";
import { clearTokens } from "../auth/tokens";
import { useCan } from "../auth/useCan";

export function AppLayout() {
  const navigate = useNavigate();
  const canViewUsers = useCan("users.view");

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

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
            {canViewUsers && (
              <Button component={Link} to="/users" variant="subtle">
                Users
              </Button>
            )}
          </Group>
          <Button onClick={handleLogout} variant="light">
            Logout
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
