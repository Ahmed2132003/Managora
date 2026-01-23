import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertSeverity = "low" | "medium" | "high";

export type AlertSummary = {
  id: number;
  event_date: string;
  title: string;
  status: AlertStatus;
  severity: AlertSeverity;
  rule_key: string;
};

export type AlertEvidence = {
  today_value: string;
  baseline_avg: string;
  delta_percent: string | null;
  contributors?: Array<{
    dimension: string;
    dimension_id: string;
    amount: string;
  }>;
};

export type AlertDetail = AlertSummary & {
  message: string;
  rule_name: string;
  evidence: AlertEvidence;
  recommended_actions: string[];
  created_at: string;
};

export type AlertsFilters = {
  status?: AlertStatus;
  range?: string;
};

export function useAlerts(filters: AlertsFilters) {
  return useQuery({
    queryKey: ["analyticsAlerts", filters],    
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) {
        params.append("status", filters.status);
      }
      if (filters.range) {
        params.append("range", filters.range);
      }
      const url = `${endpoints.analytics.alerts}?${params.toString()}`;
      const response = await http.get<AlertSummary[]>(url);
      return response.data;
    },
  });
}

export function useAlert(id?: number | null) {
  return useQuery({
    queryKey: ["alert", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<AlertDetail>(endpoints.analytics.alert(Number(id)));
      return response.data;
    },
  });
}

export function useAckAlert() {
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      const response = await http.post<AlertDetail>(
        endpoints.analytics.alertAck(id),
        { note: note ?? "" }
      );
      return response.data;
    },
  });
}

export function useResolveAlert() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post<AlertDetail>(
        endpoints.analytics.alertResolve(id),
        {}
      );
      return response.data;
    },
  });
}