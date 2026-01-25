import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";
import type { SetupWizardContext } from "./SetupWizardPage";
import "./SetupTemplatesPage.css";

type TemplateOverview = {
  roles?: { name: string }[];
  attendance?: {
    worksites?: { name: string }[];
    shifts?: { name: string; start_time: string; end_time: string }[];
  };
  policies?: {
    rules?: { type: string }[];
  };
  accounting?: {
    chart_of_accounts_template?: string;
    mappings?: Record<string, string>;
  };
};

type SetupTemplate = {
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  version: number;
  overview?: TemplateOverview;
};

type Content = {
  title: string;
  subtitle: string;
  cardTitle: string;
  actionLabel: string;
  selectedLabel: string;
  applyLabel: string;
  loadingLabel: string;
  errorTitle: string;
  sectionLabels: {
    roles: string;
    worksites: string;
    shifts: string;
    policies: string;
    chart: string;
  };
};

const contentMap: Record<"en" | "ar", Content> = {
  en: {
    title: "Choose your company template",
    subtitle: "Select the configuration that best matches your team structure.",
    cardTitle: "What will be created",
    actionLabel: "Select template",
    selectedLabel: "Selected",
    applyLabel: "Apply template",
    loadingLabel: "Loading templates...",
    errorTitle: "Unable to load templates",
    sectionLabels: {
      roles: "Roles",
      worksites: "Worksites",
      shifts: "Shifts",
      policies: "Policies",
      chart: "Chart of accounts",
    },
  },
  ar: {
    title: "اختيار نوع الشركة",
    subtitle: "اختر القالب الأنسب لفريقك وخطوات الإعداد.",
    cardTitle: "هيتعمل إيه؟",
    actionLabel: "اختيار القالب",
    selectedLabel: "تم الاختيار",
    applyLabel: "تطبيق القالب",
    loadingLabel: "جارٍ تحميل القوالب...",
    errorTitle: "تعذر تحميل القوالب",
    sectionLabels: {
      roles: "الأدوار",
      worksites: "المواقع",
      shifts: "الشِفتات",
      policies: "السياسات",
      chart: "دليل الحسابات",
    },
  },
};

export function SetupTemplatesPage() {
  const navigate = useNavigate();
  const { language } = useOutletContext<SetupWizardContext>();
  const content = useMemo(() => contentMap[language], [language]);

  const [templates, setTemplates] = useState<SetupTemplate[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get(endpoints.setup.templates);
        setTemplates(response.data ?? []);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  const selectedTemplate = templates.find((template) => template.code === selectedCode);

  return (
    <section className="panel setup-panel">
      <div className="panel__header">
        <div>
          <h2>{content.title}</h2>
          <p>{content.subtitle}</p>
        </div>
      </div>

      {loading && (
        <div className="setup-state setup-state--loading">
          <span className="setup-spinner" aria-hidden="true" />
          <span>{content.loadingLabel}</span>
        </div>
      )}

      {!loading && error && (
        <div className="setup-state setup-state--error">
          <strong>{content.errorTitle}</strong>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="setup-template-grid">
          {templates.map((template) => {
            const roles = template.overview?.roles ?? [];
            const worksites = template.overview?.attendance?.worksites ?? [];
            const shifts = template.overview?.attendance?.shifts ?? [];
            const policies = template.overview?.policies?.rules ?? [];
            const accountingTemplate =
              template.overview?.accounting?.chart_of_accounts_template;

            return (
              <article
                key={template.code}
                className={`setup-template-card${
                  selectedCode === template.code ? " is-selected" : ""
                }`}
              >
                <div className="setup-template-header">
                  <div>
                    <h3>{language === "ar" ? template.name_ar : template.name_en}</h3>
                    <span>{language === "ar" ? template.name_en : template.name_ar}</span>
                  </div>
                  <span className="setup-template-badge">v{template.version}</span>
                </div>
                <p className="setup-template-description">{template.description}</p>
                <div className="setup-template-divider" />
                <strong>{content.cardTitle}</strong>
                <ul className="setup-template-list">
                  <li>
                    {content.sectionLabels.roles}: {roles.map((role) => role.name).join(", ") || "-"}
                  </li>
                  <li>
                    {content.sectionLabels.worksites}: {worksites.map((site) => site.name).join(", ") || "-"}
                  </li>
                  <li>
                    {content.sectionLabels.shifts}: {shifts.map((shift) => shift.name).join(", ") || "-"}
                  </li>
                  <li>
                    {content.sectionLabels.policies}: {policies.map((rule) => rule.type).join(", ") || "-"}
                  </li>
                  <li>
                    {content.sectionLabels.chart}: {accountingTemplate || "-"}
                  </li>
                </ul>
                <div className="setup-template-actions">
                  <button
                    type="button"
                    className={
                      selectedCode === template.code ? "primary-button" : "ghost-button"
                    }
                    onClick={() => setSelectedCode(template.code)}
                  >
                    {selectedCode === template.code
                      ? content.selectedLabel
                      : content.actionLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <div className="setup-footer">
          <button
            type="button"
            className="primary-button"
            disabled={!selectedTemplate}
            onClick={() => {
              if (selectedTemplate) {
                navigate(`/setup/progress?template=${selectedTemplate.code}`);
              }
            }}
          >
            {content.applyLabel}
          </button>
        </div>
      )}
    </section>
  );
}