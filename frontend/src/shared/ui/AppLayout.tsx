import { Outlet } from "react-router-dom";
import { AppShell } from "@mantine/core";
import { MobileSidebarToggle } from "./MobileSidebarToggle.tsx";
import { SeoManager } from "./SeoManager.tsx";

export function AppLayout() {
  return (
    <AppShell padding={0}>
      <AppShell.Main>
        <SeoManager />
        <MobileSidebarToggle />
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}