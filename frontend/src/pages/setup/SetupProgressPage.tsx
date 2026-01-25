import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";
import type { SetupWizardContext } from "./SetupWizardPage";
import "./SetupProgressPage.css";

type SetupState = {
  roles_applied?: boolean;
  policies_applied?: boolean;
  shifts_applied?: boolean;
  coa_applied?: boolean;
};

type ApplyResponse = {
  status: "succeeded" | "already_applied" | "failed";
  detail?: string;
  error?: string;
  setup_state?: SetupState;
};

type Content = {
  title: string;
  subtitle: string;
  statusMessages: {
    idle: string;
    alreadyApplied: string;
    succeeded: string;
    failed: string;
  };
  steps: {
    roles: string;
    shifts: string;
    policies: string;
    coa: string;
  };
  backLabel: string;
  dashboardLabel: string;
  loadingLabel: string;
};

const contentMap: Record<"en" | "ar", Content> = {
  en: {
    title: "Setup progress",
    subtitle: "We are applying the template and preparing your workspace.",
    statusMessages: {
      idle: "",
      alreadyApplied: "Template is already applied.",
      succeeded: "Company is ready ✅",
      failed: "We ran into an error while applying the template.",
    },
    steps: {
      roles: "Roles & permissions",
      shifts: "Worksites & shifts",
      policies: "Policies",
      coa: "Chart of accounts",
    },
    backLabel: "Back to templates",
    dashboardLabel: "Go to dashboard",
    loadingLabel: "Applying template...",
  },
  ar: {
    title: "التقدّم",
    subtitle: "نقوم الآن بتطبيق القالب وتجهيز مساحة العمل.",
    statusMessages: {
      idle: "",
      alreadyApplied: "القالب متطبّق بالفعل على الشركة.",
      succeeded: "تم تجهيز الشركة بنجاح ✅",
      failed: "حدث خطأ أثناء تطبيق القالب.",
    },
    steps: {
      roles: "الأدوار والصلاحيات",
      shifts: "المواقع والشِفتات",
      policies: "السياسات",
      coa: "دليل الحسابات",
    },
    backLabel: "رجوع للقوالب",
    dashboardLabel: "اذهب للوحة التحكم",
    loadingLabel: "جاري تطبيق القالب...",
  },
};

const steps = [
  { key: "roles_applied", labelKey: "roles" },
  { key: "shifts_applied", labelKey: "shifts" },
  { key: "policies_applied", labelKey: "policies" },
  { key: "coa_applied", labelKey: "coa" },
] as const;

export function SetupProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateCode = searchParams.get("template");
  const { language } = useOutletContext<SetupWizardContext>();
  const content = useMemo(() => contentMap[language], [language]);

  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ApplyResponse | null>(null);

  const state = response?.setup_state ?? {};

  const statusMessage = useMemo(() => {
    if (!response) {
      return content.statusMessages.idle;
    }
    if (response.status === "already_applied") {
      return content.statusMessages.alreadyApplied;
    }
    if (response.status === "succeeded") {
      return content.statusMessages.succeeded;
    }
    return content.statusMessages.failed;
  }, [content.statusMessages, response]);

  useEffect(() => {
    const applyTemplate = async () => {
      if (!templateCode) {
        setResponse({
          status: "failed",
          detail: "Template code is missing.",
          error: "Template code is missing.",
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await http.post(endpoints.setup.applyTemplate, {
          template_code: templateCode,
        });
        setResponse(result.data);
      } catch (err: unknown) {
        const detail = axios.isAxiosError(err)
          ? err.response?.data?.detail || err.message
          : String(err);
        const error = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
        setResponse({ status: "failed", detail, error });
      } finally {
        setLoading(false);
      }
    };

    applyTemplate();
  }, [templateCode]);

  return (
    <section className="panel setup-panel">
      <div className="panel__header">
        <div>
          <h2>{content.title}</h2>
          <p>{content.subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="setup-state setup-state--loading">
          <span className="setup-spinner" aria-hidden="true" />
          <span>{content.loadingLabel}</span>
        </div>
      ) : (
        <>
          <div className="setup-status">
            <span>{statusMessage}</span>
          </div>
          <div className="setup-progress-list">
            {steps.map((step) => {
              const completed = state?.[step.key];
              return (
                <div key={step.key} className="setup-progress-item">
                  <span>{content.steps[step.labelKey]}</span>
                  <span className={completed ? "setup-progress-done" : "setup-progress-pending"}>
                    {completed ? "✅" : "⏳"}
                  </span>
                </div>
              );
            })}
          </div>

          {response?.status === "failed" && (
            <div className="setup-state setup-state--error">
              <strong>{response.detail}</strong>
              {response.error && <span>{response.error}</span>}
            </div>
          )}

          <div className="setup-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => navigate("/setup/templates")}
            >
              {content.backLabel}
            </button>
            {(response?.status === "succeeded" || response?.status === "already_applied") && (
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/dashboard")}
              >
                {content.dashboardLabel}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}