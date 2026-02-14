import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "../../shared/auth/useMe";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";
import { formatApiError } from "../../shared/api/errors";

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

type CompanyOption = {
  id: number;
  name: string;
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
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["subscription-companies"],
    queryFn: async () => {
      const response = await http.get<CompanyOption[]>(endpoints.companies);
      return response.data;
    },
    enabled: isSuperuser,
  });

  const actionsLabel = useMemo(() => ({ en: "Open", ar: "إدارة" }), []);

  if (!isSuperuser) {
    return <AccessDenied />;
  }

  const generateCode = async () => {
    if (!selectedCompany) {
      return;
    }
    try {
      const response = await http.post(endpoints.subscriptions.generateCode, {
        company_id: Number(selectedCompany),
      });
      setGeneratedCode(response.data?.code ?? "");
      notifications.show({
        title: "Payment code generated",
        message: "Code copied is ready and valid for 24 hours.",
        color: "teal",
      });
    } catch (error: unknown) {
      notifications.show({
        title: "Failed to generate code",
        message: formatApiError(error),
        color: "red",
      });
    }
  };

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

            <Card withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={4}>{isArabic ? "توليد كود دفع لشركة" : "Generate payment code for company"}</Title>
                <Group align="flex-end">
                  <Select
                    label={isArabic ? "الشركة" : "Company"}
                    placeholder={isArabic ? "اختر الشركة" : "Select company"}
                    value={selectedCompany}
                    onChange={setSelectedCompany}
                    data={companies.map((company) => ({ value: String(company.id), label: company.name }))}
                    searchable
                    w={320}
                  />
                  <Button onClick={generateCode} disabled={!selectedCompany}>
                    {isArabic ? "توليد الكود" : "Generate code"}
                  </Button>
                </Group>
                <TextInput
                  label={isArabic ? "كود الدفع" : "Payment code"}
                  value={generatedCode}
                  readOnly
                  rightSection={
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      disabled={!generatedCode}
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedCode);
                        notifications.show({
                          title: isArabic ? "تم النسخ" : "Copied",
                          message: isArabic ? "تم نسخ كود الدفع." : "Payment code copied.",
                        });
                      }}
                    >
                      {isArabic ? "نسخ" : "Copy"}
                    </Button>
                  }
                />
                <Text c="dimmed" size="sm">
                  {isArabic
                    ? "مدة صلاحية كود الدفع: 24 ساعة."
                    : "Payment code is valid for 24 hours only."}
                </Text>
              </Stack>
            </Card>

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