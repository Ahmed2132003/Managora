import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type ForecastTopCustomer = {
  customer: string;
  amount: string;
};

export type ForecastTopCategory = {
  category: string;
  amount: string;
};

export type CashForecastSnapshot = {
  as_of_date: string;
  horizon_days: number;
  expected_inflows: string;
  expected_outflows: string;
  net_expected: string;
  details: {
    inflows_by_bucket: {
      invoices_due: string;
      expected_collected: string;
      top_customers: ForecastTopCustomer[];
    };
    outflows_by_bucket: {
      payroll: string;
      recurring_expenses: string;
      top_categories: ForecastTopCategory[];
    };
    assumptions: {
      collection_rate: string;
      recurring_expense_est: string;
      payroll_est: string;
      payroll_date?: string | null;
    };
  };
};

export function useCashForecast(asOf?: string) {
  return useQuery({
    queryKey: ["cash-forecast", asOf],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asOf) {
        params.set("as_of", asOf);
      }
      const url = params.toString()
        ? `${endpoints.analytics.cashForecast}?${params.toString()}`
        : endpoints.analytics.cashForecast;
      const response = await http.get<CashForecastSnapshot[]>(url);
      return response.data;
    },
  });
}