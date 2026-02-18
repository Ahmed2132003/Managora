import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

type SeoConfig = {
  title: string;
  description: string;
  keywords: string;
};

const DOMAIN = "https://managora.online";
const APP_NAME = "Managora";
const DEFAULT_DESCRIPTION =
  "Managora is an all-in-one cloud ERP for HR, payroll, attendance, accounting, invoicing, analytics, and operations management.";
const DEFAULT_KEYWORDS =
  "Managora, ERP, HR software, payroll software, attendance tracking, accounting software, invoicing, business analytics";

const routeSeo: Array<{ pattern: RegExp; config: SeoConfig }> = [
  { pattern: /^\/dashboard$/, config: { title: "Dashboard", description: "Monitor business performance, workforce metrics, and financial health from one executive dashboard.", keywords: "dashboard, business insights, KPI dashboard, ERP analytics" } },
  { pattern: /^\/hr\//, config: { title: "HR Management", description: "Manage employees, departments, job titles, attendance, leaves, and HR workflows in one secure system.", keywords: "HR management, employees, leave management, attendance management" } },
  { pattern: /^\/payroll/, config: { title: "Payroll Management", description: "Run payroll cycles, review employee payouts, and track payroll compliance with confidence.", keywords: "payroll, salary processing, payslips, payroll periods" } },
  { pattern: /^\/accounting\//, config: { title: "Accounting", description: "Handle journal entries, ledgers, reports, and accounting operations with real-time data visibility.", keywords: "accounting, journal entries, general ledger, trial balance, balance sheet" } },
  { pattern: /^\/collections$/, config: { title: "Collections", description: "Track collections and receivables to improve cash flow and follow-up efficiency.", keywords: "collections, receivables, cash flow" } },
  { pattern: /^\/customers/, config: { title: "Customer Management", description: "Manage customer records and relationships in a centralized and scalable CRM experience.", keywords: "customers, CRM, customer records" } },
  { pattern: /^\/invoices/, config: { title: "Invoice Management", description: "Create, edit, and monitor invoices quickly with structured workflows and complete auditability.", keywords: "invoices, billing, invoice tracking" } },
  { pattern: /^\/catalog|^\/sales$/, config: { title: "Catalog & Sales", description: "Organize products and monitor sales performance with connected business data.", keywords: "catalog, sales management, product management" } },
  { pattern: /^\/analytics\//, config: { title: "Business Analytics", description: "Explore forecasting, executive dashboards, and alerting tools to make data-driven decisions.", keywords: "business analytics, forecasting, executive dashboard, alerts" } },
  { pattern: /^\/setup\//, config: { title: "Setup & Templates", description: "Configure your organization setup, templates, and rollout progress for a smooth ERP launch.", keywords: "ERP setup, templates, onboarding" } },
  { pattern: /^\/messages$/, config: { title: "Internal Messaging", description: "Coordinate teams and streamline internal communication from within your ERP workspace.", keywords: "team messaging, internal communication" } },
  { pattern: /^\/users$/, config: { title: "User Management", description: "Control user access, roles, and permissions for secure company-wide collaboration.", keywords: "user management, roles, permissions" } },
];

function upsertMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let meta = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    if (property) {
      meta.setAttribute("property", name);
    } else {
      meta.setAttribute("name", name);
    }
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export function SeoManager() {
  const location = useLocation();

  const seo = useMemo(() => {
    const matched = routeSeo.find((entry) => entry.pattern.test(location.pathname));
    if (matched) {
      return matched.config;
    }

    return {
      title: "ERP Platform",
      description: DEFAULT_DESCRIPTION,
      keywords: DEFAULT_KEYWORDS,
    };
  }, [location.pathname]);

  useEffect(() => {
    const pageUrl = `${DOMAIN}${location.pathname}`;
    const title = `${seo.title} | ${APP_NAME}`;

    document.title = title;
    upsertMeta("description", seo.description);
    upsertMeta("keywords", seo.keywords);
    upsertMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta("author", APP_NAME);
    upsertMeta("og:type", "website", true);
    upsertMeta("og:title", title, true);
    upsertMeta("og:description", seo.description, true);
    upsertMeta("og:url", pageUrl, true);
    upsertMeta("og:site_name", APP_NAME, true);
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", seo.description);
    upsertCanonical(pageUrl);
  }, [location.pathname, seo]);

  return null;
}