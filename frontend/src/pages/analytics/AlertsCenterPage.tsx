import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isForbiddenError } from "../../shared/api/errors";
import {
  useAckAlert,
  useAlert,
  useAlerts,
  useResolveAlert,
} from "../../shared/analytics/hooks";
import type { AlertSeverity, AlertStatus } from "../../shared/analytics/hooks";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { DashboardShell } from "../DashboardShell";
import "./AlertsCenterPage.css";

const severityColor: Record<AlertSeverity, string> = {
  low: "green",
  medium: "yellow",
  high: "red",
};

const statusColor: Record<AlertStatus, string> = {
  open: "red",
  acknowledged: "yellow",
  resolved: "green",
};

export function AlertsCenterPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AlertStatus | "">("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const filters = useMemo(
    () => ({
      status: status || undefined,
      range: "30d",
    }),
    [status]
  );

  const alertsQuery = useAlerts(filters);
  const alertDetailQuery = useAlert(selectedId);
  const ackAlert = useAckAlert();
  const resolveAlert = useResolveAlert();

  const headerCopy = {
    en: {
      title: "Alerts center",
      subtitle: "Monitor the most important risk and compliance signals.",
      helper: "Review, acknowledge, and resolve alerts in one workspace.",
      tags: ["Analytics", "Risk"],
    },
    ar: {
      title: "مركز التنبيهات",
      subtitle: "راقب أهم مؤشرات المخاطر والامتثال.",
      helper: "راجع التنبيهات واعترف بها أو قم بحلها من نفس المكان.",
      tags: ["التحليلات", "المخاطر"],
    },
  };

  const pageCopy = useMemo(
    () => ({
      en: {
        filtersTitle: "Alert status",
        filtersSubtitle: "Keep focus with quick status filters.",
        tableTitle: "Alert feed",
        tableSubtitle: "Track severity, timing, and next actions.",
        status: {
          label: "Status",
          all: "All",
          open: "Open",
          acknowledged: "Acknowledged",
          resolved: "Resolved",
        },
        table: {
          date: "Date",
          severity: "Severity",
          title: "Title",
          status: "Status",
          actions: "Actions",
          empty: "No alerts found.",
          loading: "Loading alerts...",
        },
        actions: {
          view: "View",
          ack: "Ack",
          resolve: "Resolve",
        },
        severity: {
          low: "Low",
          medium: "Medium",
          high: "High",
        },
        modal: {
          title: "Alert details",
          evidence: "Evidence",
          why: "Why?",
          recommended: "Recommended actions",
          acknowledge: "Acknowledge",
          note: "Note",
          noContributors: "No contributors available.",
          noRecommendations: "No recommendations available.",
          noDetails: "No details available.",
          today: "Today",
          baseline: "Baseline avg",
          delta: "Delta",
          ackAction: "Ack Alert",
          resolveAction: "Resolve Alert",
          loading: "Loading details...",
          close: "Close",
          table: {
            dimension: "Dimension",
            contributor: "Contributor",
            amount: "Amount",
          },
        },
      },
      ar: {
        filtersTitle: "حالة التنبيه",
        filtersSubtitle: "حافظ على التركيز باستخدام فلاتر الحالة.",
        tableTitle: "قائمة التنبيهات",
        tableSubtitle: "تابع الشدة والتوقيت والخطوات التالية.",
        status: {
          label: "الحالة",
          all: "الكل",
          open: "مفتوح",
          acknowledged: "تمت المراجعة",
          resolved: "تم الحل",
        },
        table: {
          date: "التاريخ",
          severity: "الحدة",
          title: "العنوان",
          status: "الحالة",
          actions: "الإجراءات",
          empty: "لا توجد تنبيهات.",
          loading: "جارٍ تحميل التنبيهات...",
        },
        actions: {
          view: "عرض",
          ack: "تأكيد",
          resolve: "حل",
        },
        severity: {
          low: "منخفض",
          medium: "متوسط",
          high: "مرتفع",
        },
        modal: {
          title: "تفاصيل التنبيه",
          evidence: "الأدلة",
          why: "لماذا؟",
          recommended: "إجراءات مقترحة",
          acknowledge: "تأكيد الاستلام",
          note: "ملاحظة",
          noContributors: "لا توجد مساهمات متاحة.",
          noRecommendations: "لا توجد توصيات متاحة.",
          noDetails: "لا توجد تفاصيل متاحة.",
          today: "اليوم",
          baseline: "متوسط الأساس",
          delta: "الفارق",
          ackAction: "تأكيد التنبيه",
          resolveAction: "حل التنبيه",
          loading: "جارٍ تحميل التفاصيل...",
          close: "إغلاق",
          table: {
            dimension: "البعد",
            contributor: "المساهم",
            amount: "القيمة",
          },
        },
      },
    }),
    []
  );

  if (isForbiddenError(alertsQuery.error)) {
    return (
      <DashboardShell copy={headerCopy} className="alerts-center-page">
        {() => <AccessDenied />}
      </DashboardShell>
    );
  }

  const closeModal = () => {
    setSelectedId(null);
    setNote("");
  };

  const handleAck = async (id: number) => {
    await ackAlert.mutateAsync({ id, note });
    await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    await queryClient.invalidateQueries({ queryKey: ["alert", id] });
    setNote("");
  };

  const handleResolve = async (id: number) => {
    await resolveAlert.mutateAsync(id);
    await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    await queryClient.invalidateQueries({ queryKey: ["alert", id] });
  };

  return (
    <DashboardShell copy={headerCopy} className="alerts-center-page">
      {({ language }) => {
        const copy = pageCopy[language];

        return (
          <>
            <section className="panel">
              <div className="panel__header">
                <div>
                  <h2>{copy.filtersTitle}</h2>
                  <p>{copy.filtersSubtitle}</p>
                </div>
              </div>
              <div className="filters-grid">
                <label className="field">
                  <span>{copy.status.label}</span>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus((event.target.value as AlertStatus) ?? "")
                    }
                  >
                    <option value="">{copy.status.all}</option>
                    <option value="open">{copy.status.open}</option>
                    <option value="acknowledged">{copy.status.acknowledged}</option>
                    <option value="resolved">{copy.status.resolved}</option>
                  </select>
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
                {alertsQuery.isLoading ? (
                  <p className="helper-text">{copy.table.loading}</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{copy.table.date}</th>
                        <th>{copy.table.severity}</th>
                        <th>{copy.table.title}</th>
                        <th>{copy.table.status}</th>
                        <th>{copy.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(alertsQuery.data ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <span className="helper-text">{copy.table.empty}</span>
                          </td>
                        </tr>
                      ) : (
                        (alertsQuery.data ?? []).map((alert) => (
                          <tr key={alert.id}>
                            <td>{alert.event_date}</td>
                            <td>
                              <span
                                className={`status-pill status-pill--${severityColor[
                                  alert.severity
                                ]}`}
                              >
                                {copy.severity[alert.severity]}
                              </span>
                            </td>
                            <td>{alert.title}</td>
                            <td>
                              <span
                                className={`status-pill status-pill--${statusColor[
                                  alert.status
                                ]}`}
                              >
                                {copy.status[alert.status]}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-action"
                                  onClick={() => setSelectedId(alert.id)}
                                >
                                  {copy.actions.view}
                                </button>
                                <button
                                  type="button"
                                  className="table-action"
                                  onClick={() => handleAck(alert.id)}
                                  disabled={alert.status === "resolved"}
                                >
                                  {copy.actions.ack}
                                </button>
                                <button
                                  type="button"
                                  className="table-action table-action--danger"
                                  onClick={() => handleResolve(alert.id)}
                                  disabled={alert.status === "resolved"}
                                >
                                  {copy.actions.resolve}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {selectedId !== null && (
              <div className="dashboard-modal" role="dialog" aria-modal="true">
                <div
                  className="dashboard-modal__backdrop"
                  onClick={closeModal}
                  aria-hidden="true"
                />
                <div className="dashboard-modal__content">
                  <div className="dashboard-modal__header">
                    <div>
                      <h2>{copy.modal.title}</h2>
                      <p>{alertDetailQuery.data?.title ?? ""}</p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={closeModal}
                      aria-label={copy.modal.close}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="dashboard-modal__body">
                    {alertDetailQuery.isLoading ? (
                      <p className="helper-text">{copy.modal.loading}</p>
                    ) : alertDetailQuery.data ? (
                      <>
                        <div className="alert-detail">
                          <div>
                            <h3>{alertDetailQuery.data.title}</h3>
                            <p className="helper-text">{alertDetailQuery.data.message}</p>
                          </div>
                          <div className="alert-badges">
                            <span
                              className={`status-pill status-pill--${severityColor[
                                alertDetailQuery.data.severity
                              ]}`}
                            >
                              {copy.severity[alertDetailQuery.data.severity]}
                            </span>
                            <span
                              className={`status-pill status-pill--${statusColor[
                                alertDetailQuery.data.status
                              ]}`}
                            >
                              {copy.status[alertDetailQuery.data.status]}
                            </span>
                          </div>
                        </div>

                        <section className="panel panel--flush">
                          <div className="panel__header">
                            <div>
                              <h2>{copy.modal.evidence}</h2>
                            </div>
                          </div>
                          <div className="evidence-grid">
                            <div>
                              <span>{copy.modal.today}</span>
                              <strong>{alertDetailQuery.data.evidence.today_value}</strong>
                            </div>
                            <div>
                              <span>{copy.modal.baseline}</span>
                              <strong>{alertDetailQuery.data.evidence.baseline_avg}</strong>
                            </div>
                            <div>
                              <span>{copy.modal.delta}</span>
                              <strong>
                                {alertDetailQuery.data.evidence.delta_percent ?? (language === "ar" ? "غير متاح" : "N/A")}%
                              </strong>
                            </div>
                          </div>
                        </section>

                        <section className="panel panel--flush">
                          <div className="panel__header">
                            <div>
                              <h2>{copy.modal.why}</h2>
                            </div>
                          </div>
                          {(alertDetailQuery.data.evidence.contributors ?? [])
                            .length === 0 ? (
                            <p className="helper-text">{copy.modal.noContributors}</p>
                          ) : (
                            <div className="table-wrapper">
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>{copy.modal.table.dimension}</th>
                                    <th>{copy.modal.table.contributor}</th>
                                    <th>{copy.modal.table.amount}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(alertDetailQuery.data.evidence.contributors ?? []).map(
                                    (item, index) => (
                                      <tr key={`${item.dimension}-${index}`}>
                                        <td>{item.dimension}</td>
                                        <td>{item.dimension_id}</td>
                                        <td>{item.amount}</td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <section className="panel panel--flush">
                          <div className="panel__header">
                            <div>
                              <h2>{copy.modal.recommended}</h2>
                            </div>
                          </div>
                          {(alertDetailQuery.data.recommended_actions ?? []).length ===
                          0 ? (
                            <p className="helper-text">{copy.modal.noRecommendations}</p>
                          ) : (
                            <ul className="recommendations">
                              {alertDetailQuery.data.recommended_actions.map(
                                (action, index) => (
                                  <li key={index}>{action}</li>
                                )
                              )}
                            </ul>
                          )}
                        </section>

                        <section className="panel panel--flush">
                          <div className="panel__header">
                            <div>
                              <h2>{copy.modal.acknowledge}</h2>
                            </div>
                          </div>
                          <div className="form-grid">
                            <label className="field field--full">
                              <span>{copy.modal.note}</span>
                              <textarea
                                rows={3}
                                value={note}
                                onChange={(event) =>
                                  setNote(event.currentTarget.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="panel-actions panel-actions--right">
                            <button
                              type="button"
                              className={`action-button action-button--ghost${
                                alertDetailQuery.data.status === "resolved"
                                  ? " action-button--disabled"
                                  : ""
                              }`}
                              onClick={() => selectedId && handleAck(selectedId)}
                              disabled={alertDetailQuery.data.status === "resolved"}
                            >
                              {copy.modal.ackAction}
                            </button>
                            <button
                              type="button"
                              className={`action-button${
                                alertDetailQuery.data.status === "resolved"
                                  ? " action-button--disabled"
                                  : ""
                              }`}
                              onClick={() => selectedId && handleResolve(selectedId)}
                              disabled={alertDetailQuery.data.status === "resolved"}
                            >
                              {copy.modal.resolveAction}
                            </button>
                          </div>
                        </section>
                      </>
                    ) : (
                      <p className="helper-text">{copy.modal.noDetails}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}