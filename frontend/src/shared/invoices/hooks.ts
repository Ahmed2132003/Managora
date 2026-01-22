import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type InvoiceLine = {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  customer: number;
  issue_date: string;
  due_date: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "void";
  subtotal: string;
  tax_amount: string | null;
  total_amount: string;
  notes: string;
  created_by: number | null;
  created_at: string;
  lines: InvoiceLine[];
};

export type InvoiceLinePayload = {
  description: string;
  quantity: string;
  unit_price: string;
};

export type InvoicePayload = {
  invoice_number: string;
  customer: number;
  issue_date: string;
  tax_amount?: string | null;
  notes?: string;
  lines: InvoiceLinePayload[];
};

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await http.get<Invoice[]>(endpoints.invoices);
      return response.data;
    },
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<Invoice>(endpoints.invoice(Number(id)));
      return response.data;
    },
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (payload: InvoicePayload) => {
      const response = await http.post<Invoice>(endpoints.invoices, payload);
      return response.data;
    },
  });
}

export function useUpdateInvoice() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: InvoicePayload }) => {
      const response = await http.patch<Invoice>(endpoints.invoice(id), payload);
      return response.data;
    },
  });
}

export function useIssueInvoice() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post<Invoice>(endpoints.invoiceIssue(id));
      return response.data;
    },
  });
}