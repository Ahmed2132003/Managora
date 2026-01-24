import { useMemo, useState } from "react";
import { clearTokens } from "../shared/auth/tokens";
import { useNavigate } from "react-router-dom";
import { useMe } from "../shared/auth/useMe.ts";
import "./DashboardPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type StatCard = {
  label: string;
  value: string;
  change: string;
};

type Activity = {
  title: string;
  time: string;
  tag: string;
};

type Content = {
  brand: string;
  welcome: string;
  subtitle: string;
  searchPlaceholder: string;
  languageLabel: string;
  themeLabel: string;
  logoutLabel: string;
  sidebar: string[];
  stats: StatCard[];
  activityTitle: string;
  activities: Activity[];
  insightsTitle: string;
  insightsSubtitle: string;
  forecastTitle: string;
  forecastSubtitle: string;
  assistantTitle: string;
  assistantQuestion: string;
  assistantAnswer: string;
  footer: string;
  userFallback: string;
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    welcome: "Welcome back",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    searchPlaceholder: "Search dashboards, teams, workflows...",
    languageLabel: "Language",
    themeLabel: "Theme",
    logoutLabel: "Logout",
    sidebar: [
      "Dashboard",
      "HR",
      "Attendance",
      "Payroll",
      "Accounting",
      "Sales",
      "Alerts",
      "Copilot",
    ],
    stats: [
      { label: "Revenue", value: "$27,457", change: "+12%" },
      { label: "Cashflow Forecast", value: "30%", change: "7 Days" },
      { label: "KPI Factory", value: "$30,600", change: "+15%" },
      { label: "Expenses", value: "$12,600", change: "-3%" },
    ],
    activityTitle: "Smart Alerts",
    activities: [
      { title: "Net Profit", time: "+7%", tag: "AI" },
      { title: "Sales Growth", time: "+4.7%", tag: "Ops" },
      { title: "Employee Turnover", time: "-1.2%", tag: "HR" },
    ],
    insightsTitle: "Insight Pulse",
    insightsSubtitle: "Realtime efficiency sweep across systems",
    forecastTitle: "Cashflow Forecast",
    forecastSubtitle: "Momentum increases in Q3",
    assistantTitle: "Copilot",
    assistantQuestion: "Why are this month’s profits lower?",
    assistantAnswer:
      "Expenses increased by 25% this month, especially in travel and transport.",
    footer: "This system is produced by Creativity Code.",
    userFallback: "Explorer",
  },
  ar: {
    brand: "ماناجورا",
    welcome: "أهلًا بعودتك",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    searchPlaceholder: "ابحث عن اللوحات أو الفرق أو التدفقات...",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    logoutLabel: "تسجيل الخروج",
    sidebar: [
      "لوحة التحكم",
      "الموارد البشرية",
      "الحضور",
      "الرواتب",
      "المحاسبة",
      "المبيعات",
      "التنبيهات",
      "المساعد",
    ],
    stats: [
      { label: "الإيرادات", value: "$27,457", change: "+١٢٪" },
      { label: "توقع التدفق النقدي", value: "٣٠٪", change: "٧ أيام" },
      { label: "مؤشرات الأداء", value: "$30,600", change: "+١٥٪" },
      { label: "المصروفات", value: "$12,600", change: "-٣٪" },
    ],
    activityTitle: "تنبيهات ذكية",
    activities: [
      { title: "صافي الربح", time: "+٧٪", tag: "ذكاء" },
      { title: "نمو المبيعات", time: "+٤٫٧٪", tag: "تشغيل" },
      { title: "دوران الموظفين", time: "-١٫٢٪", tag: "موارد" },
    ],
    insightsTitle: "نبض الرؤية",
    insightsSubtitle: "مسح فوري للكفاءة عبر الأنظمة",
    forecastTitle: "توقع التدفق النقدي",
    forecastSubtitle: "زخم متصاعد في الربع الثالث",
    assistantTitle: "المساعد الذكي",
    assistantQuestion: "لماذا انخفضت الأرباح هذا الشهر؟",
    assistantAnswer:
      "زادت المصروفات بنسبة ٢٥٪ هذا الشهر، خصوصًا في السفر والنقل.",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    userFallback: "ضيف",
  },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useMe();
  const [language, setLanguage] = useState<Language>("ar");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const content = useMemo(() => contentMap[language], [language]);
  const userName =
    data?.user.first_name || data?.user.username || content.userFallback;
  const isArabic = language === "ar";

  function handleLogout() {
    clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="dashboard-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="dashboard-page__glow" aria-hidden="true" />
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <img src="/managora-logo.svg" alt="Managora logo" />
          <div>
            <span className="dashboard-brand__title">{content.brand}</span>
            <span className="dashboard-brand__subtitle">
              {content.subtitle}
            </span>
          </div>
        </div>
        <div className="dashboard-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder={content.searchPlaceholder}
            aria-label={content.searchPlaceholder}
          />
        </div>
        <div className="dashboard-controls">
          <button
            type="button"
            className="chip"
            onClick={() =>
              setLanguage((prev) => (prev === "en" ? "ar" : "en"))
            }
          >
            {content.languageLabel}: {isArabic ? "EN" : "AR"}
          </button>
          <button
            type="button"
            className="chip chip--ghost"
            onClick={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
          >
            {content.themeLabel}: {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            type="button"
            className="chip chip--outline"
            onClick={handleLogout}
          >
            {content.logoutLabel}
          </button>
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-card">
            <p>{content.welcome}</p>
            <strong>{userName}</strong>
            {isLoading && (
              <span className="sidebar-note">...loading profile</span>
            )}
            {isError && (
              <span className="sidebar-note sidebar-note--error">
                {isArabic
                  ? "تعذر تحميل بيانات الحساب."
                  : "Unable to load account data."}
              </span>
            )}
          </div>
          <nav className="sidebar-nav">
            {content.sidebar.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`nav-item ${index === 0 ? "nav-item--active" : ""}`}
              >
                <span className="nav-icon" aria-hidden="true">
                  ●
                </span>
                {item}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button type="button" className="pill-button" onClick={handleLogout}>
              {content.logoutLabel}
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>
                {content.welcome}, {userName}
              </h1>
              <p>{content.subtitle}</p>
              <div className="hero-tags">
                <span className="pill">Live</span>
                <span className="pill pill--accent">AI Ready</span>
              </div>
            </div>
            <div className="hero-panel__stats">
              {content.stats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card__top">
                    <span>{stat.label}</span>
                    <span className="stat-card__change">{stat.change}</span>
                  </div>
                  <strong>{stat.value}</strong>
                  <div className="stat-card__spark" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="grid-panels">
            <div className="panel panel--insights">
              <div className="panel__header">
                <div>
                  <h2>{content.insightsTitle}</h2>
                  <p>{content.insightsSubtitle}</p>
                </div>
                <span className="pill pill--accent">Sync</span>
              </div>
              <div className="bar-chart">
                {Array.from({ length: 8 }).map((_, index) => (
                  <span
                    key={`bar-${index}`}
                    style={{ height: `${40 + index * 6}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="panel panel--forecast">
              <div className="panel__header">
                <div>
                  <h2>{content.forecastTitle}</h2>
                  <p>{content.forecastSubtitle}</p>
                </div>
                <span className="pill">30%</span>
              </div>
              <div className="forecast-grid">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                  <div key={day} className="forecast-card">
                    <span>{day}</span>
                    <strong>{20 + index * 7}%</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel--activity">
              <div className="panel__header">
                <div>
                  <h2>{content.activityTitle}</h2>
                  <p>{isArabic ? "مراقبة فورية للمؤشرات" : "Live KPI monitoring"}</p>
                </div>
              </div>
              <div className="activity-list">
                {content.activities.map((item) => (
                  <div key={item.title} className="activity-item">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.time}</span>
                    </div>
                    <span className="tag">{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel panel--assistant">
              <div className="panel__header">
                <div>
                  <h2>{content.assistantTitle}</h2>
                  <p>{isArabic ? "ردود ذكية فورًا" : "Instant smart replies"}</p>
                </div>
              </div>
              <div className="assistant-chat">
                <div className="assistant-message assistant-message--question">
                  {content.assistantQuestion}
                </div>
                <div className="assistant-message assistant-message--answer">
                  {content.assistantAnswer}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">{content.footer}</footer>
    </div>
  );
}