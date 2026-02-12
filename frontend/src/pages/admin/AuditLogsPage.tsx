import { useState } from "react";
import {
  Card,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { isForbiddenError } from "../../shared/api/errors";
import { useAuditLogs } from "../../shared/audit/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";

type Language = "en" | "ar";

type AuditContent = {
  pageTitle: string;
  pageSubtitle: string;
  helper: string;
  totalLabel: string;
  loading: string;
  empty: string;
  table: {
    time: string;
    actor: string;
    action: string;
    entity: string;
    ip: string;
    noValue: string;
  };
};

const shellCopy = {
  en: {
    title: "Audit Logs",
    subtitle: "Track admin actions and system events across all modules.",
    helper: "Review changes in real time with secure activity history.",
  },
  ar: {
    title: "سجل التدقيق",
    subtitle: "متابعة إجراءات الإدارة وأحداث النظام في جميع الوحدات.",
    helper: "راجع التغييرات لحظيًا مع سجل نشاط آمن.",
  },
} as const;

const contentMap: Record<Language, AuditContent> = {
  en: {
    pageTitle: "System activity history",
    pageSubtitle: "Centralized timeline for traceability and compliance.",
    helper: "Use pagination to browse older events.",
    totalLabel: "Total records",
    loading: "Loading audit logs...",
    empty: "No audit records found.",
    table: {
      time: "Time",
      actor: "Actor",
      action: "Action",
      entity: "Entity",
      ip: "IP",
      noValue: "-",
    },
  },
  ar: {
    pageTitle: "سجل نشاط النظام",
    pageSubtitle: "خط زمني مركزي للتتبع والامتثال.",
    helper: "استخدم ترقيم الصفحات للرجوع إلى الأحداث الأقدم.",
    totalLabel: "إجمالي السجلات",
    loading: "جارٍ تحميل سجلات التدقيق...",
    empty: "لا توجد سجلات تدقيق.",
    table: {
      time: "الوقت",
      actor: "المستخدم",
      action: "الإجراء",
      entity: "الكيان",
      ip: "عنوان IP",
      noValue: "-",
    },
  },
};

export function AuditLogsPage() {
  const canView = useCan("audit.view");
  const [page, setPage] = useState(1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const auditQuery = useAuditLogs(limit, offset);

  if (!canView || isForbiddenError(auditQuery.error)) {
    return <AccessDenied />;
  }

  const total = auditQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardShell copy={shellCopy}>
      {({ language, isArabic }) => {
        const content = contentMap[language];
        const rows = auditQuery.data?.results ?? [];

        const formattedRows = rows.map((log) => ({
          ...log,
          createdAt: new Date(log.created_at).toLocaleString(
            language === "ar" ? "ar-EG" : "en-US"
          ),
        }));

        return (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <div>
                <Title order={3}>{content.pageTitle}</Title>
                <Text c="dimmed" size="sm">
                  {content.pageSubtitle}
                </Text>
              </div>
              <Stack gap={2} align={isArabic ? "flex-end" : "flex-start"}>
                <Text fw={700} size="sm">
                  {content.totalLabel}: {total}
                </Text>
                <Text c="dimmed" size="xs">
                  {content.helper}
                </Text>
              </Stack>
            </Group>

            <Card withBorder radius="md" p="md">
              {auditQuery.isLoading ? (
                <Group gap="sm">
                  <Loader size="sm" />
                  <Text c="dimmed">{content.loading}</Text>
                </Group>
              ) : rows.length === 0 ? (
                <Text c="dimmed">{content.empty}</Text>
              ) : (
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder miw={880}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{content.table.time}</Table.Th>
                        <Table.Th>{content.table.actor}</Table.Th>
                        <Table.Th>{content.table.action}</Table.Th>
                        <Table.Th>{content.table.entity}</Table.Th>
                        <Table.Th>{content.table.ip}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {formattedRows.map((log) => (
                        <Table.Tr key={log.id}>
                          <Table.Td>{log.createdAt}</Table.Td>
                          <Table.Td>
                            {log.actor_username || content.table.noValue}
                          </Table.Td>
                          <Table.Td>{log.action}</Table.Td>
                          <Table.Td>
                            {log.entity} #{log.entity_id}
                          </Table.Td>
                          <Table.Td>
                            {log.ip_address || content.table.noValue}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Card>

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination value={page} onChange={setPage} total={totalPages} />
              </Group>
            )}
          </Stack>
        );
      }}
    </DashboardShell>
  );
}