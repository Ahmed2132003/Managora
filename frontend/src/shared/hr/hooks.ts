import { useMutation, useQuery } from "@tanstack/react-query";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";

export type AttendanceEmployee = {
  id: number;
  employee_code: string;
  full_name: string;
  department: { id: number; name: string } | null;
};

export type AttendanceRecord = {
  id: number;
  employee: AttendanceEmployee;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: string | null;
  check_in_lng: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  method: "gps" | "qr" | "manual";
  status: "present" | "late" | "absent" | "early_leave" | "incomplete";
  late_minutes: number;
  early_leave_minutes: number;
  notes: string | null;
};

export type AttendanceActionPayload = {
  employee_id: number;
  shift_id?: number;
  worksite_id?: number | null;
  method: "gps" | "qr" | "manual";
  lat?: number | null;
  lng?: number | null;
  qr_token?: string;
};

export type AttendanceQrToken = {
  token: string;
  expires_at: string;
  worksite_id: number;
  shift_id: number;
};

export type AttendanceFilters = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string | null;
  employeeId?: string | null;
  status?: string | null;
  search?: string;
};

export type Department = {
  id: number;
  name: string;
  is_active: boolean;
};

export type JobTitle = {
  id: number;
  name: string;
  is_active: boolean;
};

export type EmployeeStatus = "active" | "inactive" | "terminated";

export type EmployeeSummary = {
  id: number;
  employee_code: string;
  full_name: string;
  status: EmployeeStatus;
  hire_date: string;
  department: { id: number; name: string } | null;
  job_title: { id: number; name: string } | null;
  manager: { id: number; full_name: string } | null;
};

export type EmployeeDetail = EmployeeSummary & {
  national_id: string | null;
  user: number | null;
};

export type EmployeeDocument = {
  id: number;
  employee: number;
  doc_type: string;
  title: string;
  file: string;
  uploaded_by: number | null;
  created_at: string;
};

export type EmployeeFilters = {
  departmentId?: string;
  jobTitleId?: string;
  status?: EmployeeStatus;
};

export type UseEmployeesParams = {
  filters?: EmployeeFilters;
  search?: string;
  page?: number;
};

export type EmployeePayload = {
  employee_code: string;
  full_name: string;
  national_id?: string | null;
  hire_date: string;
  status: EmployeeStatus;
  department?: number | null;
  job_title?: number | null;
  manager?: number | null;
};

export type DepartmentPayload = {
  name: string;
  is_active: boolean;
};

export type JobTitlePayload = {
  name: string;
  is_active: boolean;
};

export type UploadDocumentPayload = {
  employeeId: number;
  doc_type: string;
  title: string;
  file: File;
};

export function useCheckInMutation() {
  return useMutation({
    mutationFn: async (payload: AttendanceActionPayload) => {
      const response = await http.post<AttendanceRecord>(
        endpoints.hr.attendanceCheckIn,
        payload
      );
      return response.data;
    },
  });
}

export function useCheckOutMutation() {
  return useMutation({
    mutationFn: async (payload: AttendanceActionPayload) => {
      const response = await http.post<AttendanceRecord>(
        endpoints.hr.attendanceCheckOut,
        payload
      );
      return response.data;
    },
  });
}

export function useMyAttendanceQuery(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["attendance", "my", params],
    queryFn: async () => {
      const response = await http.get<AttendanceRecord[]>(endpoints.hr.attendanceMy, {
        params: {
          date_from: params?.dateFrom,
          date_to: params?.dateTo,
        },
      });
      return response.data;
    },
  });
}

export function useAttendanceRecordsQuery(filters: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance", "records", filters],
    queryFn: async () => {
      const response = await http.get<AttendanceRecord[]>(
        endpoints.hr.attendanceRecords,
        {
          params: {
            date_from: filters.dateFrom,
            date_to: filters.dateTo,
            department_id: filters.departmentId ?? undefined,
            employee_id: filters.employeeId ?? undefined,
            status: filters.status ?? undefined,
            search: filters.search ?? undefined,
          },
        }
      );
      return response.data;
    },
  });
}

export function useAttendanceQrGenerateMutation() {
  return useMutation({
    mutationFn: async (payload: {
      worksite_id: number;
      shift_id: number;
      expires_in_minutes?: number;
    }) => {
      const response = await http.post<AttendanceQrToken>(
        endpoints.hr.attendanceQrGenerate,
        payload
      );
      return response.data;
    },
  });
}
export function useEmployees({ filters, search, page }: UseEmployeesParams) {
  return useQuery({
    queryKey: ["hr", "employees", { filters, search, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (filters?.status) params.status = filters.status;
      if (filters?.departmentId) params.department = filters.departmentId;
      if (filters?.jobTitleId) params.job_title = filters.jobTitleId;
      if (page) params.page = page;
      const response = await http.get<EmployeeSummary[]>(endpoints.hr.employees, {
        params,
      });
      return response.data;
    },
  });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ["hr", "employee", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Employee id is required.");
      }
      const response = await http.get<EmployeeDetail>(endpoints.hr.employee(id));
      return response.data;
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["hr", "departments"],
    queryFn: async () => {
      const response = await http.get<Department[]>(endpoints.hr.departments);
      return response.data;
    },
  });
}

export function useJobTitles() {
  return useQuery({
    queryKey: ["hr", "jobTitles"],
    queryFn: async () => {
      const response = await http.get<JobTitle[]>(endpoints.hr.jobTitles);
      return response.data;
    },
  });
}

export function useEmployeeDocuments(employeeId: number | null) {
  return useQuery({
    queryKey: ["hr", "employeeDocuments", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        throw new Error("Employee id is required.");
      }
      const response = await http.get<EmployeeDocument[]>(
        endpoints.hr.employeeDocuments(employeeId)
      );
      return response.data;
    },
  });
}

export function useCreateEmployee() {
  return useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const response = await http.post<EmployeeDetail>(endpoints.hr.employees, payload);
      return response.data;
    },
  });
}

export function useUpdateEmployee() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EmployeePayload }) => {
      const response = await http.patch<EmployeeDetail>(
        endpoints.hr.employee(id),
        payload
      );
      return response.data;
    },
  });
}

export function useCreateDepartment() {
  return useMutation({
    mutationFn: async (payload: DepartmentPayload) => {
      const response = await http.post<Department>(endpoints.hr.departments, payload);
      return response.data;
    },
  });
}

export function useUpdateDepartment() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DepartmentPayload }) => {
      const response = await http.patch<Department>(endpoints.hr.department(id), payload);
      return response.data;
    },
  });
}

export function useDeleteDepartment() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.department(id));
    },
  });
}

export function useCreateJobTitle() {
  return useMutation({
    mutationFn: async (payload: JobTitlePayload) => {
      const response = await http.post<JobTitle>(endpoints.hr.jobTitles, payload);
      return response.data;
    },
  });
}

export function useUpdateJobTitle() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: JobTitlePayload }) => {
      const response = await http.patch<JobTitle>(endpoints.hr.jobTitle(id), payload);
      return response.data;
    },
  });
}

export function useDeleteJobTitle() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.jobTitle(id));
    },
  });
}

export function useUploadEmployeeDocument() {
  return useMutation({
    mutationFn: async (payload: UploadDocumentPayload) => {
      const formData = new FormData();
      formData.append("doc_type", payload.doc_type);
      formData.append("title", payload.title);
      formData.append("file", payload.file);
      const response = await http.post<EmployeeDocument>(
        endpoints.hr.employeeDocuments(payload.employeeId),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
  });
}

export function useDeleteEmployeeDocument() {
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(endpoints.hr.documentDelete(id));
    },
  });
}