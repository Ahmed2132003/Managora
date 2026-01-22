import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type Customer = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  credit_limit: string | null;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string;
};

export type CustomerFilters = {
  name?: string;
  code?: string;
  is_active?: string;
};

export type CustomerPayload = {
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  credit_limit?: string | null;
  payment_terms_days: number;
  is_active: boolean;
};

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.name) {
        params.append("name", filters.name);
      }
      if (filters.code) {
        params.append("code", filters.code);
      }
      if (filters.is_active) {
        params.append("is_active", filters.is_active);
      }
      const url = `${endpoints.customers}?${params.toString()}`;
      const response = await http.get<Customer[]>(url);
      return response.data;
    },
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<Customer>(endpoints.customer(Number(id)));
      return response.data;
    },
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: async (payload: CustomerPayload) => {
      const response = await http.post<Customer>(endpoints.customers, payload);
      return response.data;
    },
  });
}

export function useUpdateCustomer() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CustomerPayload }) => {
      const response = await http.patch<Customer>(endpoints.customer(id), payload);
      return response.data;
    },
  });
}

export function useDeactivateCustomer() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.customer(id));
    },
  });
}