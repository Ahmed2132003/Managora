import axios from "axios";

type AxiosLikeError = {
  message?: string;
  response?: { status?: number; data?: unknown };
};

export function isForbiddenError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function formatApiError(error: unknown): string {
  const e = error as AxiosLikeError;
  const data = e?.response?.data;

  if (data == null) return e?.message ?? String(error);

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;

    const parts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) parts.push(`${key}: ${value.join(", ")}`);
      else if (typeof value === "string") parts.push(`${key}: ${value}`);
      else if (value != null) parts.push(`${key}: ${JSON.stringify(value)}`);
    }
    if (parts.length) return parts.join(" | ");

    try {
      return JSON.stringify(data);
    } catch {
      return "Request failed (unreadable error payload).";
    }
  }

  return String(data);
}