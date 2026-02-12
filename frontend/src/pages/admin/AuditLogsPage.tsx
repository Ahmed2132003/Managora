import { useMemo, useState } from "react";
import { isForbiddenError } from "../../shared/api/errors";
import { useAuditLogs } from "../../shared/audit/hooks";
import { useCan } from "../../shared/auth/useCan";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./AuditLogsPage.css";

type Language = "en" | "ar";
type ActionType = "" | "create" | "update" | "delete";

const shellCopy: Record<Language, { title: string; subtitle: string; helper: string; tags: string[] }> = {
  en: {
    title: "Audit logs",
    subtitle: "Track every important action across your system in one place.",
    helper: "Use filters to quickly inspect who changed what and when.",
    tags: ["Security", "Compliance"],
  },
  ar: {
    title: "سجلات التدقيق",
    subtitle: "تابع كل الإجراءات المهمة في النظام من مكان واحد.",
    helper: "استخدم الفلاتر للوصول بسرعة إلى من قام بالتعديل ومتى.",
    tags: ["الأمان", "الامتثال"],
  },
};

const pageCopy = {
  en: {
    summary: "Total logs",
    filtersTitle: "Filters",
    filtersSubtitle: "Narrow results by action type, entity, or keyword.",
    tableTitle: "Audit trail",
    tableSubtitle: "Chronological view of user and system activity.",
    fields: {
      action: "Action",
      entity: "Entity",
      search: "Search",
      allActions: "All actions",
      entityPlaceholder: "e.g. employee",
      searchPlaceholder: "User, action, entity, or ID",
    },
    actions: {
      all: "All",
      create: "Create",
      update: "Update",
      delete: "Delete",
    },
    table: {
      time: "Time",
      actor: "Actor",
      action: "Action",
      entity: "Entity",
      ip: "IP",
      loading: "Loading audit logs...",
      empty: "No audit logs found.",
      unknown: "Unknown",
    },
    pagination: "Page",
  },
  ar: {
    summary: "إجمالي السجلات",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "حدد النتائج حسب نوع الإجراء أو الكيان أو كلمة البحث.",
    tableTitle: "سجل التدقيق",
    tableSubtitle: "عرض زمني لنشاط المستخدمين والنظام.",
    fields: {
      action: "الإجراء",
      entity: "الكيان",
      search: "بحث",
      allActions: "كل الإجراءات",
      entityPlaceholder: "مثال: موظف",
      searchPlaceholder: "المستخدم أو الإجراء أو الكيان أو المعرّف",
    },
    actions: {
      all: "الكل",
      create: "إنشاء",
      update: "تعديل",
      delete: "حذف",
    },
    table: {
      time: "الوقت",
      actor: "المنفذ",
      action: "الإجراء",
      entity: "الكيان",
      ip: "عنوان IP",
      loading: "جارٍ تحميل سجلات التدقيق...",
      empty: "لا توجد سجلات تدقيق.",
      unknown: "غير معروف",
    },
    pagination: "الصفحة",
  },
} as const;

export function AuditLogsPage() {
  const canView = useCan("audit.view");
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState<ActionType>("");
  const [entity, setEntity] = useState("");
  const [query, setQuery] = useState("");

  const limit = 20;
  const offset = (page - 1) * limit;
  const filters = useMemo(
    () => ({ action_type: actionType, entity, q: query }),
    [actionType, entity, query],
  );
  const auditQuery = useAuditLogs(limit, offset, filters);

  if (!canView || isForbiddenError(auditQuery.error)) {
    return <AccessDenied />;
  }

  const total = auditQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardShell copy={shellCopy} className="audit-logs-page">
      {({ language }) => {
        const copy = pageCopy[language as Language];

        return (
          <>
            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.filtersTitle}</h2>
                  <p>{copy.filtersSubtitle}</p>
                </div>
                <span className="pill">
                  {copy.summary}: {total}
                </span>
              </div>

              <div className="filters-grid audit-logs-page__filters-grid">
                <label className="field">
                  <span>{copy.fields.action}</span>
                  <select
                    value={actionType}
                    onChange={(event) => {
                      setPage(1);
                      setActionType(event.target.value as ActionType);
                    }}
                  >
                    <option value="">{copy.fields.allActions}</option>
                    <option value="create">{copy.actions.create}</option>
                    <option value="update">{copy.actions.update}</option>
                    <option value="delete">{copy.actions.delete}</option>
                  </select>
                </label>

                <label className="field">
                  <span>{copy.fields.entity}</span>
                  <input
                    type="text"
                    value={entity}
                    placeholder={copy.fields.entityPlaceholder}
                    onChange={(event) => {
                      setPage(1);
                      setEntity(event.target.value);
                    }}
                  />
                </label>

                <label className="field">
                  <span>{copy.fields.search}</span>
                  <input
                    type="text"
                    value={query}
                    placeholder={copy.fields.searchPlaceholder}
                    onChange={(event) => {
                      setPage(1);
                      setQuery(event.target.value);
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.tableTitle}</h2>
                  <p>{copy.tableSubtitle}</p>
                </div>
              </div>

              <div className="table-wrapper">
                {auditQuery.isLoading ? (
                  <p className="helper-text">{copy.table.loading}</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{copy.table.time}</th>
                        <th>{copy.table.actor}</th>
                        <th>{copy.table.action}</th>
                        <th>{copy.table.entity}</th>
                        <th>{copy.table.ip}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(auditQuery.data?.results ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <span className="helper-text">{copy.table.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        (auditQuery.data?.results ?? []).map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString()}</td>
                            <td>{log.actor_username || copy.table.unknown}</td>
                            <td>
                              <span className="status-pill">{log.action}</span>
                            </td>
                            <td>
                              {log.entity} #{log.entity_id}
                            </td>
                            <td>{log.ip_address || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {totalPages > 1 && (
              <section className="panel panel--compact">
                <div className="audit-logs-page__pagination">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                  >
                    ←
                  </button>
                  <span className="helper-text">
                    {copy.pagination} {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                  >
                    →
                  </button>
                </div>
              </section>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}