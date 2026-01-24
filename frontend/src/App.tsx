import { useMemo, useState } from 'react'
import './App.css'

type Language = 'en' | 'ar'

type Stat = {
  label: string
  value: string
  change: string
}

type Activity = {
  title: string
  time: string
  tag: string
}

type Action = {
  title: string
  description: string
}

type Content = {
  title: string
  subtitle: string
  welcome: string
  stats: Stat[]
  actions: Action[]
  activityTitle: string
  activity: Activity[]
  chartTitle: string
  chartSubtitle: string
  performanceTitle: string
  performanceSubtitle: string
  languageLabel: string
  themeLabel: string
  latestUpdate: string
  searchPlaceholder: string
}

const contentMap: Record<Language, Content> = {
  en: {
    title: 'Managora Intelligence Hub',
    subtitle: 'A modern dashboard that blends clarity, motion, and insight.',
    welcome: 'Welcome back, Sarah — your system is trending upward.',
    stats: [
      { label: 'Active Projects', value: '128', change: '+12%' },
      { label: 'Team Velocity', value: '94%', change: '+6%' },
      { label: 'Automation Score', value: '82', change: '+18' },
      { label: 'System Health', value: '99.4%', change: 'Stable' },
    ],
    actions: [
      { title: 'Launch Sprint', description: 'Kickoff a new agile cycle in minutes.' },
      { title: 'Generate Report', description: 'Craft a polished analytics report.' },
      { title: 'Assign Priorities', description: 'Align teams with smart ranking.' },
    ],
    activityTitle: 'Live Activity',
    activity: [
      { title: 'Workflow “Atlas” completed', time: '2 min ago', tag: 'AI' },
      { title: 'New client onboarded', time: '12 min ago', tag: 'CRM' },
      { title: 'Forecast updated successfully', time: '35 min ago', tag: 'Ops' },
    ],
    chartTitle: 'Insight Pulse',
    chartSubtitle: 'Energy levels across core systems',
    performanceTitle: 'Performance Radar',
    performanceSubtitle: 'Realtime efficiency sweep',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    latestUpdate: 'Latest update in 4 minutes',
    searchPlaceholder: 'Search dashboards, teams, workflows...',
  },
  ar: {
    title: 'منصة ماناجورا الذكية',
    subtitle: 'لوحة حديثة تجمع الوضوح والحركة والرؤية التحليلية.',
    welcome: 'أهلًا بعودتك، سارة — الأداء في تصاعد مستمر.',
    stats: [
      { label: 'المشروعات النشطة', value: '١٢٨', change: '+١٢٪' },
      { label: 'سرعة الفريق', value: '٩٤٪', change: '+٦٪' },
      { label: 'نقاط الأتمتة', value: '٨٢', change: '+١٨' },
      { label: 'صحة النظام', value: '٩٩٫٤٪', change: 'مستقر' },
    ],
    actions: [
      { title: 'إطلاق السبرنت', description: 'ابدأ دورة جديدة خلال دقائق.' },
      { title: 'إنشاء تقرير', description: 'صمم تقرير تحليلي جاهز للعرض.' },
      { title: 'تحديد الأولويات', description: 'رتّب المهام بذكاء وسرعة.' },
    ],
    activityTitle: 'النشاط المباشر',
    activity: [
      { title: 'اكتمال سير العمل “Atlas”', time: 'منذ دقيقتين', tag: 'ذكاء' },
      { title: 'ضم عميل جديد', time: 'منذ ١٢ دقيقة', tag: 'علاقات' },
      { title: 'تحديث التوقعات بنجاح', time: 'منذ ٣٥ دقيقة', tag: 'تشغيل' },
    ],
    chartTitle: 'نبض الرؤية',
    chartSubtitle: 'مستويات الطاقة عبر الأنظمة الأساسية',
    performanceTitle: 'رادار الأداء',
    performanceSubtitle: 'مسح فوري للكفاءة',
    languageLabel: 'اللغة',
    themeLabel: 'المظهر',
    latestUpdate: 'آخر تحديث منذ ٤ دقائق',
    searchPlaceholder: 'ابحث عن اللوحات أو الفرق أو التدفقات...',
  },
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState<Language>('en')

  const content = useMemo(() => contentMap[language], [language])

  return (
    <div
      className={`app theme-${theme}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      lang={language}
    >
      <div className="app__glow" aria-hidden="true" />
      <header className="app__header">
        <div className="app__brand">
          <div className="brand__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="brand__title">{content.title}</p>
            <p className="brand__subtitle">{content.subtitle}</p>
          </div>
        </div>
        <div className="app__controls">
          <label className="toggle">
            <span>{content.languageLabel}</span>
            <button
              type="button"
              className="toggle__button"
              onClick={() =>
                setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'))
              }
            >
              {language === 'en' ? 'AR' : 'EN'}
            </button>
          </label>
          <label className="toggle">
            <span>{content.themeLabel}</span>
            <button
              type="button"
              className="toggle__button"
              onClick={() =>
                setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </label>
        </div>
      </header>

      <section className="hero">
        <div className="hero__content">
          <p className="hero__badge">{content.latestUpdate}</p>
          <h1>{content.welcome}</h1>
          <p className="hero__lead">{content.subtitle}</p>
          <div className="hero__search">
            <span className="search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              placeholder={content.searchPlaceholder}
              aria-label={content.searchPlaceholder}
            />
          </div>
        </div>
        <div className="hero__metrics">
          {content.stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-card__header">
                <span>{stat.label}</span>
                <span className="stat-card__change">{stat.change}</span>
              </div>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <main className="dashboard">
        <section className="panel panel--chart">
          <div className="panel__header">
            <div>
              <h2>{content.chartTitle}</h2>
              <p>{content.chartSubtitle}</p>
            </div>
            <span className="pill">Live</span>
          </div>
          <div className="chart">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`bar-${index}`}
                className="chart__bar"
                style={{ height: `${40 + index * 6}%` }}
              />
            ))}
          </div>
        </section>

        <section className="panel panel--actions">
          <div className="panel__header">
            <div>
              <h2>{content.performanceTitle}</h2>
              <p>{content.performanceSubtitle}</p>
            </div>
          </div>
          <div className="radar">
            <div className="radar__grid" aria-hidden="true" />
            <div className="radar__pulse" aria-hidden="true" />
            <div className="radar__center" />
            <div className="radar__labels">
              <span>AI</span>
              <span>Ops</span>
              <span>UX</span>
              <span>Data</span>
            </div>
          </div>
          <div className="action-list">
            {content.actions.map((action) => (
              <button key={action.title} className="action-card" type="button">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel panel--activity">
          <div className="panel__header">
            <div>
              <h2>{content.activityTitle}</h2>
              <p>{content.chartSubtitle}</p>
            </div>
          </div>
          <div className="activity">
            {content.activity.map((item) => (
              <div key={item.title} className="activity__item">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.time}</span>
                </div>
                <span className="tag">{item.tag}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>    
  )
}

export default App
