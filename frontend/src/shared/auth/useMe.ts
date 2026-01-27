import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type MeResponse = {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_superuser: boolean;
  };  
  company: {
    id: number;
    name: string;
  };
  roles: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  permissions: string[];
  employee?: {
    id: number;
    employee_code: string;
    full_name: string;
  } | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await http.get<MeResponse>(endpoints.me);
      return response.data;
    },
  });
}