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
const DEFAULT_OG_IMAGE = `${DOMAIN}/managora-logo.png`;

const routeSeo: Array<{ pattern: RegExp; config: SeoConfig }> = [
  {
    pattern: /^\/dashboard$/,
    config: {
      title: "Executive Dashboard",
      description:
        "Track real-time KPIs for operations, workforce, and finance from a single executive dashboard.",
      keywords: "ERP dashboard, executive KPIs, operations analytics, business performance",
    },
  },
  {
    pattern: /^\/users$/,
    config: {
      title: "User & Access Management",
      description:
        "Manage users, roles, and permission policies securely to control organization-wide access.",
      keywords: "user management, RBAC, roles and permissions, access control",
    },
  },
  {
    pattern: /^\/attendance\/self$/,
    config: {
      title: "Self Attendance",
      description:
        "Clock in, clock out, and review your own attendance records with accurate timestamp tracking.",
      keywords: "self attendance, clock in, employee attendance, time tracking",
    },
  },
  {
    pattern: /^\/employee\/self-service$/,
    config: {
      title: "Employee Self Service",
      description:
        "Enable employees to access personal HR and payroll information through a streamlined self-service portal.",
      keywords: "employee self service, ESS portal, HR self service, payroll self service",
    },
  },
  {
    pattern: /^\/messages$/,
    config: {
      title: "Internal Team Messaging",
      description:
        "Collaborate faster with structured internal messages, conversation history, and team communication tools.",
      keywords: "internal messaging, team chat, employee communication, collaboration",
    },
  },
  {
    pattern: /^\/leaves\/balance$/,
    config: {
      title: "Leave Balances",
      description: "View leave balances, accrued entitlements, and remaining time-off quotas in one place.",
      keywords: "leave balance, PTO balance, vacation balance, HR leave management",
    },
  },
  {
    pattern: /^\/leaves\/request$/,
    config: {
      title: "Leave Request",
      description: "Submit leave requests quickly with policy-aware validation and transparent approval workflows.",
      keywords: "leave request, time off request, PTO request, absence management",
    },
  },
  {
    pattern: /^\/leaves\/my$/,
    config: {
      title: "My Leave Requests",
      description: "Track the status of your submitted leave requests with full approval timeline visibility.",
      keywords: "my leave requests, leave status, PTO approvals, employee leave tracking",
    },
  },
  {
    pattern: /^\/hr\//,
    config: {
      title: "HR Management",
      description:
        "Manage employees, departments, policies, attendance, and HR workflows with enterprise-level control.",
      keywords: "HR management system, employee management, department management, HR workflows",
    },
  },
  {
    pattern: /^\/payroll(\/|$)/,
    config: {
      title: "Payroll Management",
      description:
        "Run payroll periods, validate payouts, and monitor payroll compliance with auditable records.",
      keywords: "payroll software, salary processing, payroll periods, payroll compliance",
    },
  },
  {
    pattern: /^\/accounting\/setup$/,
    config: {
      title: "Accounting Setup Wizard",
      description:
        "Configure chart of accounts and accounting preferences for a reliable financial operations foundation.",
      keywords: "accounting setup, chart of accounts, finance configuration, ERP accounting",
    },
  },
  {
    pattern: /^\/accounting\/journal-entries(\/|$)/,
    config: {
      title: "Journal Entries",
      description:
        "Create, review, and post journal entries with complete traceability and accounting controls.",
      keywords: "journal entries, bookkeeping, accounting records, financial journals",
    },
  },
  {
    pattern: /^\/accounting\/expenses$/,
    config: {
      title: "Expense Management",
      description:
        "Record and analyze company expenses with approval-ready workflows and clear ledger integration.",
      keywords: "expense management, expense tracking, accounts payable, business expenses",
    },
  },
  {
    pattern: /^\/collections$/,
    config: {
      title: "Collections & Receivables",
      description:
        "Monitor collections and outstanding receivables to improve cash flow and reduce payment delays.",
      keywords: "collections, accounts receivable, receivables tracking, cash flow",
    },
  },
  {
    pattern: /^\/accounting\/reports\/trial-balance$/,
    config: {
      title: "Trial Balance Report",
      description: "Review debits and credits with a structured trial balance report for accounting validation.",
      keywords: "trial balance report, debit credit balance, accounting reports",
    },
  },
  {
    pattern: /^\/accounting\/reports\/general-ledger$/,
    config: {
      title: "General Ledger Report",
      description: "Inspect detailed ledger movements and account activity across all financial transactions.",
      keywords: "general ledger, ledger report, financial transactions, accounting analytics",
    },
  },
  {
    pattern: /^\/accounting\/reports\/pnl$/,
    config: {
      title: "Profit & Loss Report",
      description: "Analyze profitability with revenue and expense trends using an actionable P&L report.",
      keywords: "profit and loss, income statement, profitability analysis, finance report",
    },
  },
  {
    pattern: /^\/accounting\/reports\/balance-sheet$/,
    config: {
      title: "Balance Sheet Report",
      description: "Track assets, liabilities, and equity with a comprehensive and decision-ready balance sheet.",
      keywords: "balance sheet, assets liabilities equity, financial position report",
    },
  },
  {
    pattern: /^\/accounting\/reports\/ar-aging$/,
    config: {
      title: "A/R Aging Report",
      description: "Prioritize collections using an aging breakdown of receivables by overdue periods.",
      keywords: "AR aging report, receivables aging, overdue invoices, collections reporting",
    },
  },
  {
    pattern: /^\/customers(\/|$)/,
    config: {
      title: "Customer Management",
      description:
        "Manage customer profiles, account details, and commercial history in one centralized CRM workspace.",
      keywords: "customer management, CRM, client records, customer data",
    },
  },
  {
    pattern: /^\/invoices(\/|$)/,
    config: {
      title: "Invoice Management",
      description:
        "Generate, edit, and track invoices end-to-end with visibility into billing and payment status.",
      keywords: "invoice management, billing software, invoice tracking, accounts receivable",
    },
  },
  {
    pattern: /^\/(catalog|sales)$/,
    config: {
      title: "Catalog & Sales Operations",
      description:
        "Organize product catalogs and monitor sales activity through connected, real-time ERP data.",
      keywords: "product catalog, sales operations, sales tracking, ERP sales",
    },
  },
  {
    pattern: /^\/analytics\//,
    config: {
      title: "Business Analytics",
      description:
        "Leverage forecasting, executive dashboards, and alerts to make confident data-driven decisions.",
      keywords: "business analytics, forecasting, KPI monitoring, executive insights",
    },
  },
  {
    pattern: /^\/admin(\/|$)/,
    config: {
      title: "Administration",
      description: "Access administrative controls, governance tools, and audit logs for platform oversight.",
      keywords: "admin panel, audit logs, governance, ERP administration",
    },
  },
  {
    pattern: /^\/setup(\/|$)/,
    config: {
      title: "Setup & Onboarding",
      description: "Configure templates, rollout steps, and implementation progress for smooth ERP onboarding.",
      keywords: "ERP setup, onboarding, implementation templates, setup progress",
    },
  },
  {
    pattern: /^\/login$/,
    config: {
      title: "Secure Login",
      description: "Sign in securely to access your Managora workspace, operations dashboard, and business data.",
      keywords: "login, secure ERP login, account access, Managora sign in",
    },
  },
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
    upsertMeta("og:image", DEFAULT_OG_IMAGE, true);

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", seo.description);
    upsertMeta("twitter:image", DEFAULT_OG_IMAGE);

    upsertCanonical(pageUrl);
  }, [location.pathname, seo]);

  return null;
}