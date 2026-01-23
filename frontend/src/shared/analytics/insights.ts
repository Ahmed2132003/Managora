import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type AnalyticsSummary = {
  revenue_total: string | null;
  expenses_total: string | null;
  net_profit_est: string | null;
  absence_rate_avg: string | null;
  lateness_rate_avg: string | null;
  cash_balance_latest: string | null;
};

export type KpiPoint = {
  date: string;
  value: string | null;
};

export type KpiSeries = {
  key: string;
  points: KpiPoint[];
};

export type AnalyticsBreakdownItem = {
  dimension_id: string;
  amount: string | null;
};

export type AnalyticsBreakdown = {
  kpi: string;
  dimension: string;
  date: string;
  items: AnalyticsBreakdownItem[];
};

export function useAnalyticsSummary(range?: string) {
  return useQuery({
    queryKey: ["analyticsSummary", range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range) {
        params.set("range", range);
      }
      const url = params.toString()
        ? `${endpoints.analytics.summary}?${params.toString()}`
        : endpoints.analytics.summary;
      const response = await http.get<AnalyticsSummary>(url);
      return response.data;
    },
  });
}

export function useAnalyticsKpis(keys: string[], start?: string, end?: string) {
  return useQuery({
    queryKey: ["analyticsKpis", keys, start, end],
    enabled: Boolean(keys.length && start && end),
    queryFn: async () => {
      const params = new URLSearchParams({
        keys: keys.join(","),
        start: start ?? "",
        end: end ?? "",
      });
      const url = `${endpoints.analytics.kpis}?${params.toString()}`;
      const response = await http.get<KpiSeries[]>(url);
      return response.data;
    },
  });
}

export function useAnalyticsBreakdown(
  kpi?: string,
  dimension?: string,
  date?: string,
  limit?: number
) {
  return useQuery({
    queryKey: ["analyticsBreakdown", kpi, dimension, date, limit],
    enabled: Boolean(kpi && dimension && date),
    queryFn: async () => {
      const params = new URLSearchParams({
        kpi: kpi ?? "",
        dimension: dimension ?? "",
        date: date ?? "",
      });
      if (limit) {
        params.set("limit", String(limit));
      }
      const url = `${endpoints.analytics.breakdown}?${params.toString()}`;
      const response = await http.get<AnalyticsBreakdown>(url);
      return response.data;
    },
  });
}