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

export type AuditLogFilters = {
  action_type?: "create" | "update" | "delete" | "";
  entity?: string;
  q?: string;
};

export function useAuditLogs(limit = 50, offset = 0, filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", limit, offset, filters],
    queryFn: async () => {
      const response = await http.get<AuditLogResponse>(endpoints.auditLogs, {
        params: {
          limit,
          offset,
          ...(filters.action_type ? { action_type: filters.action_type } : {}),
          ...(filters.entity ? { entity: filters.entity } : {}),
          ...(filters.q ? { q: filters.q } : {}),
        },
      });
      return response.data;
    },
  });
}