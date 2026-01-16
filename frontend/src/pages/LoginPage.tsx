import { useState } from "react";
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

import { http } from "../shared/api/http";
import { endpoints } from "../shared/api/endpoints";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      await http.post(endpoints.auth.login, { username, password });

      notifications.show({
        title: "Login API OK",
        message: "Endpoint responds correctly (tokens not stored yet).",
      });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? JSON.stringify(err.response?.data ?? err.message)
        : "Unknown error";

      notifications.show({
        title: "Login failed",
        message,
        color: "red",
      });
    }
  }

  return (
    <Card withBorder radius="md" p="lg" maw={420} mx="auto" mt="xl">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Title order={3}>Login</Title>
          <Text c="dimmed" size="sm">
            Phase G: Routing + HTTP client. (Auth storage comes in Phase H)
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

          <Button type="submit">Test Login API</Button>
        </Stack>
      </form>
    </Card>
  );
}
