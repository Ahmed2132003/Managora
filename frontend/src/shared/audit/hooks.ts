import { useQuery } from "@tanstack/react-query";
import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export type AuditLogItem = {
  id: number;
  actor_username: string | null;
  action: string;
  entity: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};

export type AuditLogResponse = {
  count: number;
  results: AuditLogItem[];
};

export function useAuditLogs(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["audit-logs", limit, offset],
    queryFn: async () => {
      const response = await http.get<AuditLogResponse>(endpoints.auditLogs, {
        params: { limit, offset },
      });
      return response.data;
    },
  });
}