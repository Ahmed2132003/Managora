import { useEffect, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useLocation, useNavigate } from "react-router-dom";

import { http } from "../shared/api/http";
import { endpoints } from "../shared/api/endpoints";
import { formatApiError } from "../shared/api/errors";
import { hasAccessToken, setTokens } from "../shared/auth/tokens";
import "./LoginPage.css";

type Language = "en" | "ar";
type ThemeMode = "light" | "dark";

type Content = {
  brand: string;
  subtitle: string;
  languageLabel: string;
  themeLabel: string;
  footer: string;
  welcome: string;
  heroTitle: string;
  heroSubtitle: string;
  formTitle: string;
  formSubtitle: string;
  usernameLabel: string;
  passwordLabel: string;
  loginLabel: string;
  helperText: string;
};

const contentMap: Record<Language, Content> = {
  en: {
    brand: "managora",
    subtitle: "A smart dashboard that blends motion, clarity, and insight.",
    languageLabel: "Language",
    themeLabel: "Theme",
    footer: "This system is produced by Creativity Code.",
    welcome: "Welcome back",
    heroTitle: "Welcome to the world that will run your company.",
    heroSubtitle: "Welcome to Managora.",
    formTitle: "Attendance check-in",
    formSubtitle: "Use your work credentials to check in.",
    usernameLabel: "Username",
    passwordLabel: "Password",
    loginLabel: "Check in",
    helperText: "Need help? Contact your administrator.",
  },
  ar: {
    brand: "ماناجورا",
    subtitle: "لوحة ذكية تجمع الحركة والوضوح والرؤية التحليلية.",
    languageLabel: "اللغة",
    themeLabel: "المظهر",
    footer: "هذا السيستم من انتاج كريتفيتي كود",
    welcome: "أهلًا بعودتك",
    heroTitle: "اهلا في العالم الذي سيدير شركتك",
    heroSubtitle: "اهلا في مانجورا managora",
    formTitle: "تسجيل الحضور",
    formSubtitle: "استخدم بيانات العمل لتسجيل حضورك.",
    usernameLabel: "اسم المستخدم",
    passwordLabel: "كلمة المرور",
    loginLabel: "تسجيل حضور",
    helperText: "هل تحتاج للمساعدة؟ تواصل مع مسؤول النظام.",
  },
};

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-language")
        : null;
    return stored === "en" || stored === "ar" ? stored : "ar";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("managora-theme")
        : null;
    return stored === "light" || stored === "dark" ? stored : "light";
  });
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/dashboard";
  const content = useMemo(() => contentMap[language], [language]);
  const isArabic = language === "ar";

  useEffect(() => {
    if (hasAccessToken()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-language", language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("managora-theme", theme);
  }, [theme]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await http.post(endpoints.auth.login, { username, password });
      const access = response.data?.access;
      const refresh = response.data?.refresh;

      if (!access || !refresh) {
        throw new Error("Missing tokens from login response.");
      }

      setTokens({ access, refresh });

      notifications.show({
        title: isArabic ? "تم تسجيل الدخول" : "Login successful",
        message: isArabic ? "تم تسجيل الدخول بنجاح." : "You have signed in successfully.",        
      });

      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const message = formatApiError(err);
      notifications.show({
        title: isArabic ? "فشل تسجيل الدخول" : "Login failed",        
        message,
        color: "red",        
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="login-page"
      data-theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <div className="login-page__glow" aria-hidden="true" />
      <header className="login-topbar">
        <div className="login-brand">
          <img src="/managora-logo.png" alt="Managora logo" />
          <div>
            <span className="login-brand__title">{content.brand}</span>
            <span className="login-brand__subtitle">{content.subtitle}</span>
          </div>
        </div>
      </header>

      <div className="login-shell">
        <aside className="login-sidebar">
          <div className="sidebar-card">
            <p>{content.welcome}</p>
            <strong>{content.heroTitle}</strong>
            <span className="sidebar-note">{content.helperText}</span>
          </div>
          <nav className="sidebar-nav" aria-label="Preferences">            
            <button
              type="button"
              className="nav-item"
              onClick={() => setLanguage((prev) => (prev === "en" ? "ar" : "en"))}
            >
              <span className="nav-icon" aria-hidden="true">
                🌐
              </span>
              {content.languageLabel} • {isArabic ? "EN" : "AR"}
            </button>
            <button
              type="button"
              className="nav-item"
              onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            >
              <span className="nav-icon" aria-hidden="true">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
              {content.themeLabel} • {theme === "light" ? "Dark" : "Light"}
            </button>
          </nav>
        </aside>

        <main className="login-main">
          <section className="hero-panel">
            <div className="hero-panel__intro">
              <h1>{content.heroTitle}</h1>
              <p>{content.heroSubtitle}</p>
            </div>
            <img
              className="hero-panel__logo"
              src="/managora-logo.png"
              alt="Managora logo"
            />
            <div className="login-card">
              <div className="login-card__header">                
                <div>
                  <h2>{content.formTitle}</h2>
                  <p>{content.formSubtitle}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                <label className="field">
                  <span>{content.usernameLabel}</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.currentTarget.value)}
                    required
                    autoComplete="username"
                  />
                </label>
                <label className="field">
                  <span>{content.passwordLabel}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <button type="submit" className="action-button" disabled={isSubmitting}>
                  {isSubmitting ? content.loginLabel + "..." : content.loginLabel}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>

      <footer className="login-footer">{content.footer}</footer>
    </div>
  );
}