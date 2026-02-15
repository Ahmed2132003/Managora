export type SidebarLink = {
  path: string;
  label: string;
  icon: string;
};

type NavContent = {
  users: string;
  attendanceSelf: string;
  leaveBalance: string;
  leaveRequest: string;
  leaveMyRequests: string;
  employees: string;
  departments: string;
  jobTitles: string;
  hrAttendance: string;
  leaveInbox: string;
  policies: string;
  hrActions: string;
  payroll: string;
  employeeSelfService?: string;
};

export function buildHrSidebarLinks(nav: NavContent, isArabic: boolean): SidebarLink[] {
  return [
    { path: "/users", label: nav.users, icon: "👥" },
    { path: "/attendance/self", label: nav.attendanceSelf, icon: "🕒" },
    { path: "/leaves/balance", label: nav.leaveBalance, icon: "📅" },
    { path: "/leaves/request", label: nav.leaveRequest, icon: "📝" },
    { path: "/leaves/my", label: nav.leaveMyRequests, icon: "📌" },
    { path: "/hr/employees", label: nav.employees, icon: "🧑‍💼" },
    { path: "/hr/departments", label: nav.departments, icon: "🏢" },
    { path: "/hr/job-titles", label: nav.jobTitles, icon: "🧩" },
    { path: "/hr/attendance", label: nav.hrAttendance, icon: "📍" },
    { path: "/hr/leaves/inbox", label: nav.leaveInbox, icon: "📥" },
    { path: "/hr/policies", label: nav.policies, icon: "📚" },
    { path: "/hr/actions", label: nav.hrActions, icon: "✅" },
    { path: "/payroll", label: nav.payroll, icon: "💸" },
    {
      path: "/employee/self-service",
      label: nav.employeeSelfService ?? (isArabic ? "الخدمات الذاتية للموظف" : "Employee Self Service"),
      icon: "🧑‍💻",
    },
    { path: "/messages", label: isArabic ? "الرسائل" : "Messages", icon: "✉️" },
  ];
}