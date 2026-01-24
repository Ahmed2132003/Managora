import { Component, type PropsWithChildren } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";

function ErrorFallback() {
  return (
    <Center h="100vh">
      <Stack align="center" gap="sm">
        <Title order={2}>حدث خطأ غير متوقع</Title>
        <Text c="dimmed">حاول إعادة تحميل الصفحة أو تواصل مع الدعم.</Text>
        <Button onClick={() => window.location.reload()}>إعادة تحميل</Button>
      </Stack>
    </Center>
  );
}

class LocalErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: PropsWithChildren) {
  return <LocalErrorBoundary>{children}</LocalErrorBoundary>;
}