import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type JournalLine = {
  id: number;
  account: {
    id: number;
    code: string;
    name: string;
    type: string;
  };
  cost_center: {
    id: number;
    code: string;
    name: string;
  } | null;
  description: string;
  debit: string;
  credit: string;
};

export type JournalEntry = {
  id: number;
  date: string;
  reference_type: string;
  reference_id: string | null;
  memo: string;
  status: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  lines: JournalLine[];
};

export type JournalEntryFilters = {
  dateFrom?: string;
  dateTo?: string;
  referenceType?: string;
  search?: string;
};

export type Account = {
  id: number;
  code: string;
  name: string;
  type: string;
};

export type CostCenter = {
  id: number;
  code: string;
  name: string;
};

export function useJournalEntries(filters: JournalEntryFilters) {    
  return useQuery({
    queryKey: ["journal-entries", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) {
        params.append("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("date_to", filters.dateTo);
      }
      if (filters.referenceType) {
        params.append("reference_type", filters.referenceType);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }
      const url = `${endpoints.accounting.journalEntries}?${params.toString()}`;
      const response = await http.get<JournalEntry[]>(url);
      return response.data;
    },
  });
}
export function useJournalEntry(id?: string) {    
  return useQuery({
    queryKey: ["journal-entry", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await http.get<JournalEntry>(
        endpoints.accounting.journalEntry(Number(id))
      );
      return response.data;
    },
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await http.get<Account[]>(endpoints.accounting.accounts);
      return response.data;
    },
  });
}

export function useCostCenters() {
  return useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const response = await http.get<CostCenter[]>(endpoints.accounting.costCenters);
      return response.data;
    },
  });
}

export type Expense = {
  id: number;
  date: string;
  vendor_name: string;
  category: string;
  amount: string;
  currency: string;
  payment_method: string;
  paid_from_account: number;
  expense_account: number;
  cost_center: number | null;
  notes: string;
  status: "draft" | "approved";
  created_by: number | null;
  created_at: string;
  updated_at: string;
  attachments: Array<{
    id: number;
    file: string;
    uploaded_by: number | null;
    created_at: string;
  }>;
};

export type ExpenseFilters = {
  dateFrom?: string;
  dateTo?: string;
  vendor?: string;
  amountMin?: string;
  amountMax?: string;
};

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) {
        params.append("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("date_to", filters.dateTo);
      }
      if (filters.vendor) {
        params.append("vendor", filters.vendor);
      }
      if (filters.amountMin) {
        params.append("amount_min", filters.amountMin);
      }
      if (filters.amountMax) {
        params.append("amount_max", filters.amountMax);
      }
      const url = `${endpoints.accounting.expenses}?${params.toString()}`;
      const response = await http.get<Expense[]>(url);
      return response.data;
    },
  });
}

export type ExpensePayload = {
  date: string;
  amount: string;
  expense_account: number;
  paid_from_account: number;
  cost_center?: number | null;
  vendor_name?: string;
  category?: string;
  currency?: string;
  payment_method?: string;
  notes?: string;
  status?: "draft" | "approved";
};

export function useCreateExpense() {
  return useMutation({
    mutationFn: async (payload: ExpensePayload) => {
      const response = await http.post<Expense>(endpoints.accounting.expenses, payload);
      return response.data;
    },
  });
}

export function useApproveExpense() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await http.post<Expense>(endpoints.accounting.expenseApprove(id));
      return response.data;
    },
  });
}

export function useUploadExpenseAttachment() {
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await http.post(
        endpoints.accounting.expenseAttachments(id),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data as Expense["attachments"][number];
    },
  });
}