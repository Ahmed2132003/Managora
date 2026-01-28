import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useMe } from "../../shared/auth/useMe";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";

type Language = "en" | "ar";

type AdminItem = {
  label: string;
  description: string;
  path: string;
};

type AdminSection = {
  title: string;
  description: string;
  items: AdminItem[];
};

const shellCopy = {
  en: {
    title: "Admin Panel",
    subtitle: "A Django-inspired control center to manage the entire system.",
    helper: "Use the sections below to jump directly to operational modules.",
  },
  ar: {
    title: "لوحة الإدارة",
    subtitle: "واجهة إدارة على نهج Django لإدارة النظام بالكامل.",
    helper: "اختر القسم المناسب للوصول السريع لإدارة الوحدات المختلفة.",
  },
} as const;

const sectionsByLanguage: Record<Language, AdminSection[]> = {
  en: [
    {
      title: "Core Management",
      description: "Users, permissions, and audit trails.",
      items: [
        {
          label: "Users",
          description: "Manage accounts and access roles.",
          path: "/users",
        },
        {
          label: "Audit Logs",
          description: "Review admin actions and system activity.",
          path: "/admin/audit-logs",
        },
        {
          label: "Setup Progress",
          description: "Track onboarding progress and system readiness.",
          path: "/setup/progress",
        },
      ],
    },
    {
      title: "HR Operations",
      description: "Employees, attendance, and payroll workflows.",
      items: [
        {
          label: "Employees",
          description: "Employee directory and profiles.",
          path: "/hr/employees",
        },
        {
          label: "Departments",
          description: "Organization structure and teams.",
          path: "/hr/departments",
        },
        {
          label: "Leave Inbox",
          description: "Approve and manage leave requests.",
          path: "/hr/leaves/inbox",
        },
      ],
    },
    {
      title: "Accounting & Finance",
      description: "Financial setup, entries, and reports.",
      items: [
        {
          label: "Accounting Setup",
          description: "Configure chart of accounts and policies.",
          path: "/accounting/setup",
        },
        {
          label: "Journal Entries",
          description: "Post, review, and reconcile transactions.",
          path: "/accounting/journal-entries",
        },
        {
          label: "Financial Reports",
          description: "P&L, balance sheet, and ledgers.",
          path: "/accounting/reports/pnl",
        },
      ],
    },
    {
      title: "Analytics & Alerts",
      description: "Dashboards, alerts, and KPIs.",
      items: [
        {
          label: "Alerts Center",
          description: "Monitor KPI thresholds and incidents.",
          path: "/analytics/alerts",
        },
        {
          label: "Executive Dashboards",
          description: "CEO, finance, and HR views.",
          path: "/analytics/ceo",
        },
        {
          label: "Cash Forecast",
          description: "Plan liquidity and forecast cash flow.",
          path: "/analytics/cash-forecast",
        },
      ],
    },
  ],
  ar: [
    {
      title: "الإدارة الأساسية",
      description: "المستخدمون والصلاحيات وسجل التدقيق.",
      items: [
        {
          label: "المستخدمون",
          description: "إدارة الحسابات والأدوار.",
          path: "/users",
        },
        {
          label: "سجل التدقيق",
          description: "متابعة نشاطات الإدارة والإجراءات.",
          path: "/admin/audit-logs",
        },
        {
          label: "تقدم الإعداد",
          description: "مراجعة جاهزية النظام أثناء الإعداد.",
          path: "/setup/progress",
        },
      ],
    },
    {
      title: "عمليات الموارد البشرية",
      description: "الموظفون والحضور والرواتب.",
      items: [
        {
          label: "الموظفون",
          description: "بيانات الموظفين والملفات الشخصية.",
          path: "/hr/employees",
        },
        {
          label: "الأقسام",
          description: "هيكل الشركة والفرق.",
          path: "/hr/departments",
        },
        {
          label: "وارد الإجازات",
          description: "مراجعة طلبات الإجازة واعتمادها.",
          path: "/hr/leaves/inbox",
        },
      ],
    },
    {
      title: "المحاسبة والمالية",
      description: "إعدادات المحاسبة والقيود والتقارير.",
      items: [
        {
          label: "إعداد المحاسبة",
          description: "تهيئة شجرة الحسابات والسياسات.",
          path: "/accounting/setup",
        },
        {
          label: "قيود اليومية",
          description: "تسجيل ومراجعة القيود المالية.",
          path: "/accounting/journal-entries",
        },
        {
          label: "التقارير المالية",
          description: "الأرباح والخسائر والميزانية.",
          path: "/accounting/reports/pnl",
        },
      ],
    },
    {
      title: "التحليلات والتنبيهات",
      description: "لوحات القياس والتنبيهات والمؤشرات.",
      items: [
        {
          label: "مركز التنبيهات",
          description: "متابعة التنبيهات ومؤشرات الأداء.",
          path: "/analytics/alerts",
        },
        {
          label: "لوحات الإدارة العليا",
          description: "لوحات CEO والمالية والموارد البشرية.",
          path: "/analytics/ceo",
        },
        {
          label: "توقعات النقد",
          description: "تحليل التدفق النقدي المتوقع.",
          path: "/analytics/cash-forecast",
        },
      ],
    },
  ],
};

export function AdminPanelPage() {
  const navigate = useNavigate();
  const { data } = useMe();
  const isSuperuser = Boolean(data?.user.is_superuser);

  const actionsLabel = useMemo(
    () => ({ en: "Open", ar: "إدارة" }),
    []
  );

  if (!isSuperuser) {
    return <AccessDenied />;
  }

  return (
    <DashboardShell copy={shellCopy}>
      {({ language, isArabic }) => {
        const sections = sectionsByLanguage[language];
        const ctaLabel = actionsLabel[language];

        return (
          <Stack gap="xl">
            <Group justify="space-between" align="center">
              <div>
                <Title order={3}>{shellCopy[language].title}</Title>
                <Text c="dimmed">{shellCopy[language].subtitle}</Text>
              </div>
              <Text c="dimmed" size="sm">
                {shellCopy[language].helper}
              </Text>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {sections.map((section) => (
                <Card key={section.title} withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>{section.title}</Title>
                      <Text c="dimmed" size="sm">
                        {section.description}
                      </Text>
                    </div>

                    <Stack gap="sm">
                      {section.items.map((item) => (
                        <Card key={item.path} withBorder radius="sm" p="sm">
                          <Group justify="space-between" align="flex-start">
                            <div>
                              <Text fw={600}>{item.label}</Text>
                              <Text c="dimmed" size="sm">
                                {item.description}
                              </Text>
                            </div>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => navigate(item.path)}
                            >
                              {ctaLabel}
                            </Button>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>

            <Text c="dimmed" size="sm" ta={isArabic ? "right" : "left"}>
              {isArabic
                ? "هذه اللوحة تحاكي أسلوب Django Admin لكنها مبنية داخل الواجهة الحالية."
                : "This panel mirrors the Django Admin experience while staying inside the main UI."}
            </Text>
          </Stack>
        );
      }}
    </DashboardShell>
  );
}