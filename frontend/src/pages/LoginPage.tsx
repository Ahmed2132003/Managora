import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";

import { http } from "../shared/api/http";
import { endpoints } from "../shared/api/endpoints";
import { hasAccessToken, setTokens } from "../shared/auth/tokens";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasAccessToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await http.post(endpoints.auth.login, { username, password });
      const access = response.data?.access;
      const refresh = response.data?.refresh;

      if (!access || !refresh) {
        throw new Error("Missing tokens from login response.");
      }

      setTokens({ access, refresh });

      notifications.show({
        title: "Login موفق",
        message: "تم تسجيل الدخول بنجاح.",
      });

      const nextPath =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/dashboard";
      navigate(nextPath, { replace: true });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data ?? err.message)
        : "Unknown error";
      notifications.show({
        title: "Login failed",
        message,
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card withBorder radius="md" p="lg" maw={420} mx="auto" mt="xl">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Title order={3}>Login</Title>
          <Text c="dimmed" size="sm">
            أدخل بياناتك للوصول للوحة التحكم.
          </Text>
          <TextInput
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            required
            autoComplete="username"
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" loading={isSubmitting}>
            Login
          </Button>
        </Stack>
      </form>
    </Card>
  );
}