import { Outlet } from "react-router-dom";
import { Container, Stack, Text, Title } from "@mantine/core";

export function SetupWizardPage() {
  return (
    <Container size="lg">
      <Stack gap="sm" my="lg">
        <Title order={2}>معالج إعداد الشركة الجديدة</Title>
        <Text c="dimmed">
          اختر القالب المناسب وشاهد التقدّم حتى تصبح الشركة جاهزة للعمل.
        </Text>
        <Outlet />
      </Stack>
    </Container>
  );
}