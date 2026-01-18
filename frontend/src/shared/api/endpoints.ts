export const endpoints = {
  auth: {
    login: "/api/auth/login/",
    refresh: "/api/auth/refresh/",
  },
  me: "/api/me/",
  users: "/api/users/",
  roles: "/api/roles/",
  hr: {
    departments: "/api/departments/",
    jobTitles: "/api/job-titles/",
    employees: "/api/employees/",
    employee: (id: number) => `/api/employees/${id}/`,
    employeeDocuments: (employeeId: number) => `/api/employees/${employeeId}/documents/`,
    documentDownload: (id: number) => `/api/documents/${id}/download/`,
    documentDelete: (id: number) => `/api/documents/${id}/`,
    department: (id: number) => `/api/departments/${id}/`,
    jobTitle: (id: number) => `/api/job-titles/${id}/`,
  },
};