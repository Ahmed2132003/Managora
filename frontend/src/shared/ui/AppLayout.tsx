import { Outlet } from "react-router-dom";
import { AppShell } from "@mantine/core";

export function AppLayout() {
  return (
    <AppShell padding={0}>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
