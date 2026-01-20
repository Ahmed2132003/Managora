import { Outlet, Link, useNavigate } from "react-router-dom";
import { AppShell, Group, Title, Button, Container } from "@mantine/core";
import { clearTokens } from "../auth/tokens";
import { useCan } from "../auth/useCan";

export function AppLayout() {
  const navigate = useNavigate();
  const canViewUsers = useCan("users.view");
  const canViewEmployees = useCan("hr.employees.view");
  const canViewDepartments = useCan("hr.departments.view");
  const canViewJobTitles = useCan("hr.job_titles.view");
  const canViewAttendance = useCan("attendance.*");
  const canViewApprovals = useCan("approvals.*");
  const canViewLeaves = useCan("leaves.*");
  const canViewApprovalsInbox = canViewApprovals || canViewLeaves;

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
            <Button component={Link} to="/attendance/self" variant="subtle">
              My Attendance
            </Button>
            <Button component={Link} to="/leaves/balance" variant="subtle">
              Leave Balance
            </Button>
            <Button component={Link} to="/leaves/request" variant="subtle">
              Request Leave
            </Button>
            <Button component={Link} to="/leaves/my" variant="subtle">
              My Requests
            </Button>
            {canViewEmployees && (
              <Button component={Link} to="/hr/employees" variant="subtle">
                Employees
              </Button>
            )}
            {canViewAttendance && (
              <Button component={Link} to="/hr/attendance" variant="subtle">
                HR Attendance
              </Button>
            )}
            {canViewApprovalsInbox && (
              <Button component={Link} to="/hr/leaves/inbox" variant="subtle">␊
                Leave Inbox
              </Button>
            )}            
            {canViewAttendance && (
              <Button component={Link} to="/hr/policies" variant="subtle">
                Policies
              </Button>
            )}
            {canViewAttendance && (
              <Button component={Link} to="/hr/actions" variant="subtle">
                HR Actions
              </Button>
            )}
            {canViewDepartments && (
              <Button component={Link} to="/hr/departments" variant="subtle">
                Departments
              </Button>
            )}                                  
            {canViewJobTitles && (
              <Button component={Link} to="/hr/job-titles" variant="subtle">
                Job Titles
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
