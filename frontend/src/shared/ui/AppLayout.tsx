import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  AppShell,
  Stack,
  Title,
  Button,
  Container,
  ScrollArea,
  Text,
  Divider,
  Box,
} from "@mantine/core";
import { useCan } from "../auth/useCan";
import { clearTokens } from "../auth/tokens";
import { useMe } from "../auth/useMe";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Users", to: "/users" },
  { label: "My Attendance", to: "/attendance/self" },
  { label: "Leave Balance", to: "/leaves/balance" },
  { label: "Request Leave", to: "/leaves/request" },
  { label: "My Requests", to: "/leaves/my" },
  { label: "Employees", to: "/hr/employees" },
  { label: "HR Attendance", to: "/hr/attendance" },
  { label: "Payroll", to: "/payroll" },
  { label: "Leave Inbox", to: "/hr/leaves/inbox" },
  { label: "Policies", to: "/hr/policies" },
  { label: "HR Actions", to: "/hr/actions" },
  { label: "Departments", to: "/hr/departments" },
  { label: "Job Titles", to: "/hr/job-titles" },
  { label: "Accounting Setup", to: "/accounting/setup" },
  { label: "Journal Entries", to: "/accounting/journal-entries" },
  { label: "Expenses", to: "/accounting/expenses" },
  { label: "Customers", to: "/customers" },
  { label: "Invoices", to: "/invoices" },
  { label: "Collections", to: "/collections" },
  { label: "Trial Balance", to: "/accounting/reports/trial-balance" },
  { label: "General Ledger", to: "/accounting/reports/general-ledger" },
  { label: "P&L", to: "/accounting/reports/pnl" },
  { label: "Balance Sheet", to: "/accounting/reports/balance-sheet" },
  { label: "AR Aging", to: "/accounting/reports/ar-aging" },
  { label: "CEO Dashboard", to: "/analytics/ceo" },
  { label: "Finance Dashboard", to: "/analytics/finance" },
  { label: "HR Dashboard", to: "/analytics/hr" },
  { label: "Alerts Center", to: "/analytics/alerts" },
  { label: "Cash Forecast", to: "/analytics/forecast" },
  { label: "Copilot", to: "/copilot" },
];

export function AppLayout() {
  const navigate = useNavigate();
  const canViewAudit = useCan("audit.view");
  const { data } = useMe();
  const userName = data?.user.first_name || data?.user.username || "admin_user";

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell navbar={{ width: 280 }} padding="md">
      <AppShell.Navbar p="md">
        <Stack h="100%" gap="md">
          <Stack gap={4}>
            <Title order={4}>Company OS</Title>
            <Text size="sm" c="dimmed">
              أهلًا بعودتك
            </Text>
            <Text fw={600}>{userName}</Text>
          </Stack>
          <Divider />
          <Box style={{ flex: 1 }}>
            <ScrollArea type="auto" style={{ height: "100%" }}>
              <Stack gap="xs">
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    variant="subtle"
                    justify="flex-start"
                    fullWidth
                  >
                    {item.label}
                  </Button>
                ))}
                {canViewAudit && (
                  <Button
                    component={Link}
                    to="/admin/audit-logs"
                    variant="subtle"
                    justify="flex-start"
                    fullWidth
                  >
                    Audit Logs
                  </Button>
                )}
              </Stack>
            </ScrollArea>
          </Box>
          <Button onClick={handleLogout} variant="light" fullWidth>
            Logout
          </Button>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}