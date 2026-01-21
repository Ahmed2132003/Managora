import { useQuery } from "@tanstack/react-query";
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