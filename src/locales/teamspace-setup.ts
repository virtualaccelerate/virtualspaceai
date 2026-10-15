import type { GroupResources } from "./merge";

const bundle: GroupResources = {
  en: { teamspaceSetup: {
    create: "Create new", continue: "Continue", back: "Back", finish: "Create my Space",
    sizeTitle: "How many people are in your company?",
    sizeSubtitle: "This will help us tailor Virtual Space to your team.",
    industryTitle: "What industry do you work in?",
    industrySubtitle: "Choose the option that fits best.",
    prioritiesTitle: "What matters most to you right now?",
    prioritiesSubtitle: "Choose one or more options.",
    sizes: { "1-10": "Small team", "11-30": "Growing company", "31-50": "Medium business", "51-100": "Large company" },
    industries: { healthcare: "Healthcare", travel: "Travel", digital: "Digital / IT", marketing: "Marketing / Agency", retail: "Retail / E-commerce", finance: "Finance", construction: "Construction / Real estate", education: "Education", services: "Services", other: "Other" },
    priorities: {
      projects: { title: "Project and task management", description: "Planning, deadline tracking, project delivery" },
      team: { title: "Effective team management", description: "Delegation, oversight, employee development" },
      finances: { title: "Company finance management", description: "Budgets, expenses, financial planning" },
      hr: { title: "HR process automation", description: "Hiring, onboarding, employee records" },
      analytics: { title: "Company analytics and metrics", description: "Key indicators, reports, growth" },
      automation: { title: "Routine process automation", description: "Reducing manual work" },
    },
  } },
  ru: { teamspaceSetup: {
    create: "Создать новое", continue: "Продолжить", back: "Назад", finish: "Создать мой Space",
    sizeTitle: "Сколько человек в вашей компании?",
    sizeSubtitle: "Это поможет нам настроить Virtual Space под вашу команду.",
    industryTitle: "В какой индустрии вы работаете?",
    industrySubtitle: "Выберите наиболее подходящий вариант.",
    prioritiesTitle: "Что для вас сейчас важнее всего?",
    prioritiesSubtitle: "Выберите один или несколько вариантов.",
    sizes: { "1-10": "Небольшая команда", "11-30": "Растущая компания", "31-50": "Средний бизнес", "51-100": "Крупная компания" },
    industries: { healthcare: "Медицина / Healthcare", travel: "Туризм / Travel", digital: "Digital / IT", marketing: "Маркетинг / Агентство", retail: "Ритейл / E-commerce", finance: "Финансы", construction: "Строительство / Недвижимость", education: "Образование", services: "Услуги", other: "Другое" },
    priorities: {
      projects: { title: "Управление проектами и задачами", description: "Планирование, контроль сроков, ведение проектов" },
      team: { title: "Эффективное управление командой", description: "Делегирование, контроль, развитие сотрудников" },
      finances: { title: "Управление финансами компании", description: "Бюджеты, расходы, финансовое планирование" },
      hr: { title: "Автоматизация HR-процессов", description: "Найм, адаптация, учет сотрудников" },
      analytics: { title: "Аналитика и метрики компании", description: "Ключевые показатели, отчеты, рост" },
      automation: { title: "Автоматизация рутинных процессов", description: "Сокращение ручной работы" },
    },
  } },
};
export default bundle;