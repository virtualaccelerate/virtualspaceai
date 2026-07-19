import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const isBrowser = typeof window !== "undefined";

const resources = {
  en: {
    translation: {
      nav: {
        learn: "Learn", mentors: "Mentors", courses: "Courses",
        product: "Product", pricing: "Pricing", bookDemo: "Book Demo",
        login: "Log in", signup: "Sign up",
        cta: "Try now for free", demo: "Get Demo", price: "Pricing",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "AI Agentic Workspace for Business",
        subtitle: "Automate workflows, connect teams and manage AI agents in one workspace.",
        subtitle2: "\n",
        cta: "Try now for free",
        cta2: "Book a demo",
        tagline: "Start today. No setup required.",
      },
      newEra: {
        eyebrow: "",
        title: "New era for business",
        titleAccent: "with AI agents.",
        body1: "Teams no longer manage every routine task by hand. AI agents organize, analyze and automate — all inside one workspace.",
        body2: "Built for businesses that want to work smarter and faster.",
        pill1: "Organize & analyze",
        pill2: "Support operations",
        pill3: "Automate workflows",
        imageAlt: "Colleagues collaborating with an AI-powered workspace",
      },
      features: {
        eyebrow: "Built for how you work",
        title: "One workspace.",
        titleAccent: "Everything connected.",
        kb: {
          tag: "KNOWLEDGE BASE",
          title: "One brain for the whole team.",
          body: "Instant answers from your docs, chats and processes.",
        },
        reminders: {
          tag: "SMART REMINDERS",
          title: "Never miss a follow-up.",
          body: "Agents nudge the right person at the right time.",
        },
      },
      benefits: {
        eyebrow: "Benefits",
        title: "Save money. Save time.",
        titleAccent: "Automate processes.",
        cards: {
          money: {
            title: "Save money",
            body1: "Cut the cost of manual work by automating routine tasks.",
            body2: "Focus your team on strategy, sales and decisions.",
          },
          time: {
            title: "Save time",
            body1: "Agents handle reports, summaries and updates 24/7.",
            body2: "Less tool-switching. More real work.",
          },
          auto: {
            title: "Automate processes",
            body1: "Turn everyday workflows into automated systems.",
            body2: "From sales to HR, ops and support — end to end.",
          },
        },
      },
      audience: {
        eyebrow: "Who is Virtual Space for?",
        title: "Who is",
        titleAccent: "Virtual Space for?",
        businesses: {
          tag: "BUSINESSES",
          title: "For Businesses",
          desc: "Automate operations, reduce manual work, and connect your team, data, and AI agents in one workspace.",
          bestForLabel: "Best for:",
          bestFor: ["Sales teams", "Operations teams", "Service businesses", "SMEs", "Growing companies"],
        },
        startups: {
          tag: "STARTUPS",
          title: "For Startups",
          desc: "Move faster with AI. Automate routine work, organize data, and let AI agents become part of your team.",
          bestForLabel: "Best for:",
          bestFor: ["Founders", "Product teams", "Early-stage startups", "Growth teams"],
        },
        ngos: {
          tag: "NGOs",
          title: "For NGOs",
          desc: "Simplify project management, reporting, and knowledge sharing while saving valuable team time.",
          bestForLabel: "Best for:",
          bestFor: ["NGOs", "Project teams", "Donor-funded programs", "Education & social impact organizations"],
        },
      },
      cta: {
        title1: "Request a", title2: "demo",
        subtitle: "30 minutes — see how agents fit your business.",
        name: "Your name", contact: "Email or Telegram", company: "Company (optional)",
        submit: "Request demo",
        thanks: "Thanks! We'll reach out within 24 hours.",
        note1: "No card required", note2: "24h reply", note3: "NDA on request",
      },
      bookDemoPage: {
        title: "Book a Demo",
        subtitle: "See how Virtual Space fits your workflows and helps your team work faster with AI.",
        cta: "Book a Demo",
        sectionTitle: "What's in the Demo?",
        sectionSubtitle: "What you'll see",
        items: [
          { title: "AI Agents", body: "Create AI agents for sales, HR, operations, support, and analytics." },
          { title: "Workflow Automation", body: "Turn repetitive tasks into automated workflows." },
          { title: "Unified Workspace", body: "Manage projects, tasks, databases, and documents in one place." },
          { title: "Personalized Use Cases", body: "Discover how AI can improve your organization's processes." },
          { title: "Implementation Plan", body: "Receive a practical roadmap for getting started." },
        ],
      },
      pricingTeaser: {
        title: "Start simple. Scale with your business.",
        subtitle: "Whether you are testing AI agents for the first time or building a full AI-powered operating system for your company, Virtual Space can grow with your needs.",
        cta: "View pricing",
        cta2: "Try now for free",
      },
      finalCta: {
        title: "Ready to build your AI-powered workspace?",
        subtitle: "Start using AI agents to automate your business processes, connect your team, and move faster.",
        cta: "Try now for free",
        cta2: "Book a demo",
      },
      footer: {
        tagline: "AI-agentic workspace for business.",
        productLabel: "Product",
        learnLabel: "Learn",
        companyLabel: "Company",
        accountLabel: "Account",
        resources: "Resources",
        contact: "Contact",
        copyright: "© Virtual Space. All rights reserved.",
        powered: "Powered by Virtual Accelerate",
        poweredBy: "Powered by",
        productItems: { workspace: "Workspace", aiAgents: "AI Agents", automation: "Automation", analytics: "Analytics" },
      },
      brandbook: {
        oneWorkspace: {
          title: "One workspace.",
          accent: "Everything connected.",
          desc: "Teams, tools, workflows and AI agents in one operating space.",
          bullets: ["AI Agents at the core", "Team, Tasks, Tools & Data in orbit", "One connected layer"],
          orbit: { ai: "AI Agents", tasks: "Tasks", data: "Data", tools: "Tools", team: "Team" },
        },
        tone: {
          title: "Smart,",
          accent: "but human.",
          items: [
            { title: "Clear over complex", body: "We explain things simply." },
            { title: "Business-first", body: "We focus on real outcomes." },
            { title: "Calm confidence", body: "Reliable and professional." },
            { title: "Smart but human", body: "AI empowers, people lead." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Chat",
          workspace: "Workspace", insights: "Insights", account: "Account",
          overview: "Overview", tasks: "Tasks", knowledgeBase: "Knowledge Base",
          aiAgents: "AI Agents", analytics: "Analytics", timeTracking: "Time Tracking",
          clients: "Clients", profile: "Profile",
          agentsDocs: "Documents & Data", agentsTasks: "Team Tasks", agentsFusion: "Sales", inDevelopment: "In development", comingSoon: "Coming soon",
          financials: "Financials", telegram: "Telegram", team: "Team", settings: "Settings", newChat: "New chat", collapse: "Collapse", expand: "Expand", integrations: "Integrations",

        },
        settings: {
          profile: { title: "Profile", desc: "Your name, avatar, and language." },
          team: { title: "Team & invites", desc: "Manage members and roles." },
          teamspace: { title: "Teamspace", desc: "Workspace name and preferences." },
        },
        tasks: {
          dlgEdit: "Edit task",
          dlgNew: "New task",
          fTitle: "Title",
          phTitle: "Design new onboarding flow",
          fDesc: "Description",
          phDesc: "Details, acceptance criteria, links…",
          fStatus: "Status",
          fPriority: "Priority",
          fAssignee: "Assignee",
          phAssignee: "Name or email",
          fDue: "Due date",
          delete: "Delete",
          cancel: "Cancel",
          save: "Save",
          create: "Create task",
          errTitle: "Title is required",
          okUpdate: "Task updated",
          okCreate: "Task created",
          okDelete: "Task deleted",
          chatLog: "Task created manually",
        },
        header: {
          teamspace: "Teamspace", loading: "Loading…", signedInAs: "Signed in as",
          inviteMembers: "Invite members", teamspaceSettings: "Teamspace settings",
          signOut: "Sign out", newTask: "New task",
          search: "Search tasks, docs, agents…", invite: "Invite",
        },
        invite: {
          title: "Invite to", subtitle: "Share the code or link with your team.",
          code: "Invite code", link: "Invite link", copy: "Copy", copied: "Copied",
          hint: "Teammates can join by pasting the code on the onboarding screen or by opening the link and signing in.",
        },
        overview: {
          greeting: "Welcome back", subtitle: "Here's what's happening in your workspace today.",
          quickAction: "Quick action", askZukha: "Ask Zukha",
          askZukhaSubtitle: "Your business in one AI space",
          clear: "Clear", thinking: "Virtual Space is thinking…", placeholder: "Ask anything…",
          suggestions: [
            "Summarize what my team did this week",
            "Draft a client follow-up email",
            "What tasks should I prioritize today?",
            "Suggest 3 KPIs for our next sprint",
          ],
        },
        profile: {
          title: "Profile", subtitle: "Manage your personal information and preferences.",
          email: "Email", fullName: "Full name", company: "Company",
          avatarUrl: "Avatar URL", language: "Language",
          save: "Save changes", saving: "Saving…", saved: "Saved",
        },
        chat: {
          newChat: "New chat", history: "History", noHistory: "No previous chats yet",
          confirmDelete: "Delete this chat?", attach: "Attach file — synced to Knowledge Base",
          agentDocs: "Docs", agentTasks: "Tasks", agentAdvisor: "Advisor", clearAgent: "clear",
        },
        agents: {
          title: "AI Agents",
          subtitle: "Specialized AI agents you can call from any chat with @tag",
          howTitle: "How to use",
          howBody: "Type an agent tag inside any chat (e.g. @contracts) — the agent will handle that message. Or click 'Open' to start a dedicated conversation with the agent.",
          open: "Open agent", useInChat: "or use in any chat", moreSoon: "More agents coming soon",
          contracts: {
            title: "Contract Risk Agent",
            desc: "Analyzes contracts for risks and suggests improvements. Upload a contract to the Knowledge Base or paste text, then chat with @contracts.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Cleaning Logs", "ETL Flow", "Validation", "Encryption", "Backup"],
          ["Lead Scoring", "Outreach", "Follow-up", "Meeting Set", "Closing Docs"],
          ["KPI Tracking", "Insight Gen", "Forecasting", "Audit", "Visualizer"],
          ["Inventory", "Logistics", "Procurement", "Compliance", "Dispatch"],
        ],
      },
    },
  },
  ru: {
    translation: {
      nav: {
        learn: "Обучение", mentors: "Наставники", courses: "Курсы",
        product: "Продукт", pricing: "Тарифы", bookDemo: "Демо",
        login: "Войти", signup: "Регистрация",
        cta: "Попробовать бесплатно", demo: "Демо", price: "Тарифы",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "AI-пространство для бизнеса",
        subtitle: "Автоматизируйте процессы, объединяйте команды и управляйте ИИ-агентами в одном пространстве.",
        subtitle2: "\n",
        cta: "Попробовать бесплатно",
        cta2: "Забронировать демо",
        tagline: "Начните сегодня. Без сложной настройки.",
      },
      newEra: {
        eyebrow: "",
        title: "Новая эра для бизнеса",
        titleAccent: "с AI-агентами.",
        body1: "Командам больше не нужно вручную вести каждую рутину. AI-агенты организуют, анализируют и автоматизируют — в одном пространстве.",
        body2: "Для бизнеса, который хочет работать умнее и быстрее.",
        pill1: "Организация и анализ",
        pill2: "Поддержка операций",
        pill3: "Автоматизация процессов",
        imageAlt: "Коллеги работают с AI-пространством",
      },
      features: {
        eyebrow: "Работает так, как думаете вы",
        title: "Одно пространство.",
        titleAccent: "Всё связано.",
        kb: {
          tag: "БАЗА ЗНАНИЙ",
          title: "Единый мозг для команды.",
          body: "Мгновенные ответы по вашим документам и процессам.",
        },
        reminders: {
          tag: "УМНЫЕ НАПОМИНАНИЯ",
          title: "Ни один follow-up не потеряется.",
          body: "Агенты пингуют нужного человека в нужный момент.",
        },
      },
      benefits: {
        eyebrow: "Преимущества",
        title: "Экономьте деньги и время.",
        titleAccent: "Автоматизируйте процессы.",
        cards: {
          money: {
            title: "Экономия денег",
            body1: "Сократите расходы, автоматизируя рутинные задачи.",
            body2: "Освободите команду для стратегии и продаж.",
          },
          time: {
            title: "Экономия времени",
            body1: "Агенты работают 24/7: отчёты, сводки, обновления.",
            body2: "Меньше переключений. Больше результата.",
          },
          auto: {
            title: "Автоматизация",
            body1: "Превратите рутинные процессы в автосистемы.",
            body2: "От продаж и HR до операций и поддержки.",
          },
        },
      },
      audience: {
        eyebrow: "Для кого Virtual Space",
        title: "Для кого",
        titleAccent: "Virtual Space?",
        businesses: {
          tag: "БИЗНЕС",
          title: "Для бизнеса",
          desc: "Автоматизируйте операции, сократите ручной труд и объедините команду, данные и ИИ-агентов в одном пространстве.",
          bestForLabel: "Лучше всего подходит для:",
          bestFor: ["Отделы продаж", "Операционные команды", "Сервисные компании", "Малый и средний бизнес", "Растущие компании"],
        },
        startups: {
          tag: "СТАРТАПЫ",
          title: "Для стартапов",
          desc: "Двигайтесь быстрее с ИИ. Автоматизируйте рутину, организуйте данные и впишите ИИ-агентов в команду.",
          bestForLabel: "Лучше всего подходит для:",
          bestFor: ["Основатели", "Продуктовые команды", "Ранние стартапы", "Growth-команды"],
        },
        ngos: {
          tag: "НПО",
          title: "Для НПО",
          desc: "Упростите управление проектами, отчётность и обмен знаниями, экономя время команды.",
          bestForLabel: "Лучше всего подходит для:",
          bestFor: ["НПО", "Проектные команды", "Донорские программы", "Образовательные и социальные организации"],
        },
      },
      cta: {
        title1: "Оставьте заявку", title2: "на демо",
        subtitle: "30 минут — покажем, как агенты закроют задачи вашего бизнеса.",
        name: "Ваше имя", contact: "Email или Telegram", company: "Компания (необязательно)",
        submit: "Запросить демо",
        thanks: "Спасибо! Мы свяжемся в течение 24 часов.",
        note1: "Без карты", note2: "Ответ за 24 часа", note3: "NDA по запросу",
      },
      bookDemoPage: {
        title: "Забронировать демо",
        subtitle: "Узнайте, как Virtual Space впишется в ваши рабочие процессы и поможет команде работать быстрее с ИИ.",
        cta: "Забронировать демо",
        sectionTitle: "Что будет на демо?",
        sectionSubtitle: "Что вы увидите",
        items: [
          { title: "ИИ-агенты", body: "Создавайте ИИ-агентов для продаж, HR, операций, поддержки и аналитики." },
          { title: "Автоматизация процессов", body: "Превращайте рутинные задачи в автоматизированные рабочие процессы." },
          { title: "Единое рабочее пространство", body: "Управляйте проектами, задачами, базами данных и документами в одном месте." },
          { title: "Персональные сценарии", body: "Узнайте, как ИИ может улучшить процессы вашей организации." },
          { title: "План внедрения", body: "Получите практическую дорожную карту для старта." },
        ],
      },
      pricingTeaser: {
        title: "Начните просто. Масштабируйтесь вместе с бизнесом.",
        subtitle: "Тестируете ИИ-агентов впервые или строите полноценную AI-систему для компании — Virtual Space растёт вместе с вами.",
        cta: "Смотреть тарифы",
        cta2: "Попробовать бесплатно",
      },
      finalCta: {
        title: "Готовы построить AI-пространство?",
        subtitle: "Начните использовать ИИ-агентов для автоматизации процессов, объединения команды и ускорения работы.",
        cta: "Попробовать бесплатно",
        cta2: "Забронировать демо",
      },
      footer: {
        tagline: "AI-пространство для бизнеса.",
        productLabel: "Продукт",
        learnLabel: "Обучение",
        companyLabel: "Компания",
        accountLabel: "Аккаунт",
        resources: "Ресурсы",
        contact: "Контакты",
        copyright: "© Virtual Space. Все права защищены.",
        powered: "При поддержке Virtual Accelerate",
        poweredBy: "При поддержке",
        productItems: { workspace: "Пространство", aiAgents: "ИИ-агенты", automation: "Автоматизация", analytics: "Аналитика" },
      },
      brandbook: {
        oneWorkspace: {
          title: "Одно пространство.",
          accent: "Всё связано.",
          desc: "Команды, инструменты, процессы и ИИ-агенты в одном рабочем пространстве.",
          bullets: ["ИИ-агенты в центре", "Команда, задачи, инструменты и данные на орбите", "Один связанный слой"],
          orbit: { ai: "ИИ-агенты", tasks: "Задачи", data: "Данные", tools: "Инструменты", team: "Команда" },
        },
        tone: {
          title: "Умно,",
          accent: "но по-человечески.",
          items: [
            { title: "Просто о сложном", body: "Объясняем понятно." },
            { title: "Ориентир на бизнес", body: "Фокус на реальных результатах." },
            { title: "Спокойная уверенность", body: "Надёжно и профессионально." },
            { title: "Умно, но по-человечески", body: "ИИ помогает — решают люди." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Чат",
          workspace: "Рабочая область", insights: "Аналитика", account: "Аккаунт",
          overview: "Обзор", tasks: "Задачи", knowledgeBase: "База знаний",
          aiAgents: "AI-агенты", analytics: "Аналитика", timeTracking: "Учёт времени",
          clients: "Клиенты", profile: "Профиль",
          agentsDocs: "Документы и данные", agentsTasks: "Задачи команды", agentsFusion: "Продажи", inDevelopment: "В разработке", comingSoon: "Скоро",
          financials: "Финансы", telegram: "Телеграм", team: "Команда", settings: "Настройки", newChat: "Новый чат", collapse: "Свернуть", expand: "Развернуть", integrations: "Интеграции",

        },
        settings: {
          profile: { title: "Профиль", desc: "Имя, аватар и язык." },
          team: { title: "Команда и приглашения", desc: "Участники и роли." },
          teamspace: { title: "Рабочее пространство", desc: "Название и настройки." },
        },
        tasks: {
          dlgEdit: "Редактировать задачу",
          dlgNew: "Новая задача",
          fTitle: "Название",
          phTitle: "Новый онбординг",
          fDesc: "Описание",
          phDesc: "Детали, критерии, ссылки…",
          fStatus: "Статус",
          fPriority: "Приоритет",
          fAssignee: "Исполнитель",
          phAssignee: "Имя или email",
          fDue: "Срок",
          delete: "Удалить",
          cancel: "Отмена",
          save: "Сохранить",
          create: "Создать задачу",
          errTitle: "Название обязательно",
          okUpdate: "Задача обновлена",
          okCreate: "Задача создана",
          okDelete: "Задача удалена",
          chatLog: "Задача создана вручную",
        },
        header: {
          teamspace: "Командное пространство", loading: "Загрузка…", signedInAs: "Вы вошли как",
          inviteMembers: "Пригласить участников", teamspaceSettings: "Настройки пространства",
          signOut: "Выйти", newTask: "Новая задача",
          search: "Поиск задач, документов, агентов…", invite: "Пригласить",
        },
        invite: {
          title: "Пригласить в", subtitle: "Поделитесь кодом или ссылкой с командой.",
          code: "Код приглашения", link: "Ссылка приглашения", copy: "Копировать", copied: "Скопировано",
          hint: "Коллеги могут присоединиться, введя код на экране онбординга или открыв ссылку и войдя в аккаунт.",
        },
        overview: {
          greeting: "С возвращением", subtitle: "Вот что происходит в вашем пространстве сегодня.",
          quickAction: "Быстрое действие", askZukha: "Спросить Zukha",
          askZukhaSubtitle: "Ваш бизнес в одном AI-пространстве",
          clear: "Очистить", thinking: "Virtual Space думает…", placeholder: "Спросите что угодно…",
          suggestions: [
            "Подведи итог того, что сделала команда на этой неделе",
            "Напиши письмо-напоминание клиенту",
            "Какие задачи стоит сделать сегодня в первую очередь?",
            "Предложи 3 KPI для следующего спринта",
          ],
        },
        profile: {
          title: "Профиль", subtitle: "Управляйте личной информацией и настройками.",
          email: "Email", fullName: "Полное имя", company: "Компания",
          avatarUrl: "URL аватара", language: "Язык",
          save: "Сохранить изменения", saving: "Сохранение…", saved: "Сохранено",
        },
        chat: {
          newChat: "Новый чат", history: "История", noHistory: "Пока нет прошлых чатов",
          confirmDelete: "Удалить этот чат?", attach: "Прикрепить файл — синхронизируется с Базой знаний",
          agentDocs: "Документы", agentTasks: "Задачи", agentAdvisor: "Советник", clearAgent: "снять",
        },
        agents: {
          title: "AI Агенты",
          subtitle: "Специализированные AI-агенты, которых можно вызвать в любом чате через @тег",
          howTitle: "Как использовать",
          howBody: "Впишите тег агента в любом чате (например, @contracts) — агент возьмёт это сообщение. Или нажмите «Открыть», чтобы начать выделенный чат с агентом.",
          open: "Открыть агента", useInChat: "или использовать в любом чате", moreSoon: "Скоро больше агентов",
          contracts: {
            title: "Агент рисков по договорам",
            desc: "Анализирует договоры на риски и предлагает улучшения. Загрузите договор в Базу знаний или вставьте текст, затем пишите @contracts.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Очистка логов", "ETL-поток", "Валидация", "Шифрование", "Бэкап"],
          ["Скоринг лидов", "Аутрич", "Follow-up", "Встреча", "Закрытие"],
          ["KPI-трекинг", "Инсайты", "Прогноз", "Аудит", "Визуализация"],
          ["Склад", "Логистика", "Закупки", "Комплаенс", "Отгрузка"],
        ],
      },
    },
  },
  kk: {
    translation: {
      nav: {
        learn: "Оқыту", mentors: "Тәлімгерлер", courses: "Курстар",
        product: "Өнім", pricing: "Тарифтер", bookDemo: "Демо тапсырыс",
        login: "Кіру", signup: "Тіркелу",
        cta: "Тегін көру", demo: "Демо", price: "Тарифтер",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "Бизнеске арналған AI-кеңістік",
        subtitle: "Процестерді автоматтандырыңыз, командаларды біріктіріңіз және ИИ-агенттерді бір кеңістікте басқарыңыз.",
        subtitle2: "\n",
        cta: "Тегін көру",
        cta2: "Демо тапсырыс беру",
        tagline: "Бүгін бастаңыз. Күрделі баптаусыз.",
      },
      newEra: {
        eyebrow: "",
        title: "Бизнес үшін жаңа дәуір",
        titleAccent: "ИИ-агенттермен.",
        body1: "Командаларға енді әр рутинаны қолмен жүргізудің қажеті жоқ. ИИ-агенттер бір кеңістікте ұйымдастырады, талдайды және автоматтандырады.",
        body2: "Ақылды әрі жылдам жұмыс істегісі келетін бизнеске.",
        pill1: "Ұйымдастыру және талдау",
        pill2: "Операцияларды қолдау",
        pill3: "Процестерді автоматтандыру",
        imageAlt: "AI-кеңістікпен жұмыс істеп жатқан әріптестер",
      },
      features: {
        eyebrow: "Сіздің ойлау жүйеңізбен жұмыс істейді",
        title: "Бір кеңістік.",
        titleAccent: "Барлығы байланыста.",
        kb: {
          tag: "БІЛІМ БАЗАСЫ",
          title: "Команда үшін біртұтас ми.",
          body: "Құжаттарыңыз бен процестеріңіз бойынша лезде жауаптар.",
        },
        reminders: {
          tag: "АҚЫЛДЫ ЕСКЕРТУЛЕР",
          title: "Ешбір follow-up жоғалмайды.",
          body: "Агенттер қажетті адамға қажетті сәтте хабарлайды.",
        },
      },
      benefits: {
        eyebrow: "Артықшылықтар",
        title: "Ақша мен уақытты үнемдеңіз.",
        titleAccent: "Процестерді автоматтандырыңыз.",
        cards: {
          money: { title: "Ақшаны үнемдеу", body1: "Рутиналық тапсырмаларды автоматтандырып шығындарды азайтыңыз.", body2: "Команданы стратегия мен сатылымға босатыңыз." },
          time: { title: "Уақытты үнемдеу", body1: "Агенттер 24/7 жұмыс істейді: есептер, жаңартулар.", body2: "Азырақ ауысу. Көбірек нәтиже." },
          auto: { title: "Автоматтандыру", body1: "Рутиналық процестерді автожүйелерге айналдырыңыз.", body2: "Сатылым, HR, операциялар және қолдау." },
        },
      },
      audience: {
        eyebrow: "Virtual Space кімге арналған",
        title: "Кімге арналған",
        titleAccent: "Virtual Space?",
        businesses: {
          tag: "БИЗНЕС", title: "Бизнеске",
          desc: "Операцияларды автоматтандырыңыз, қол еңбегін азайтыңыз және команда, деректер мен ИИ-агенттерді бір жерге біріктіріңіз.",
          bestForLabel: "Ең жақсы сәйкес келеді:",
          bestFor: ["Сатылым бөлімдері", "Операциялық командалар", "Сервистік компаниялар", "Шағын және орта бизнес", "Дамушы компаниялар"],
        },
        startups: {
          tag: "СТАРТАПТАР", title: "Стартаптарға",
          desc: "ИИ-мен жылдамырақ қозғалыңыз. Рутинаны автоматтандырыңыз, деректерді ұйымдастырыңыз.",
          bestForLabel: "Ең жақсы сәйкес келеді:",
          bestFor: ["Негізін қалаушылар", "Өнім командалары", "Ерте стартаптар", "Growth-командалар"],
        },
        ngos: {
          tag: "ҮЕҰ", title: "ҮЕҰ үшін",
          desc: "Жобаларды басқаруды, есеп беруді және білім алмасуды жеңілдетіңіз.",
          bestForLabel: "Ең жақсы сәйкес келеді:",
          bestFor: ["ҮЕҰ", "Жоба командалары", "Донор бағдарламалары", "Білім беру ұйымдары"],
        },
      },
      cta: {
        title1: "Демо үшін", title2: "өтінім қалдырыңыз",
        subtitle: "30 минут — агенттер сіздің бизнесіңіздің тапсырмаларын қалай шешетінін көрсетеміз.",
        name: "Атыңыз", contact: "Email немесе Telegram", company: "Компания (міндетті емес)",
        submit: "Демо сұрау",
        thanks: "Рахмет! 24 сағат ішінде байланысамыз.",
        note1: "Картасыз", note2: "24 сағатта жауап", note3: "NDA сұраныс бойынша",
      },
      bookDemoPage: {
        title: "Демо тапсырыс беру",
        subtitle: "Virtual Space сіздің процестеріңізге қалай сәйкес келетінін біліңіз.",
        cta: "Демо тапсырыс беру",
        sectionTitle: "Демода не болады?",
        sectionSubtitle: "Не көресіз",
        items: [
          { title: "ИИ-агенттер", body: "Сатылым, HR, операциялар мен қолдау үшін ИИ-агенттер жасаңыз." },
          { title: "Процестерді автоматтандыру", body: "Рутиналық тапсырмаларды автоматтандырылған процестерге айналдырыңыз." },
          { title: "Біртұтас жұмыс кеңістігі", body: "Жобалар, тапсырмалар және құжаттар бір жерде." },
          { title: "Жеке сценарийлер", body: "ИИ ұйымыңыздың процестерін қалай жақсарта алатынын біліңіз." },
          { title: "Енгізу жоспары", body: "Іске қосу үшін практикалық жол картасын алыңыз." },
        ],
      },
      pricingTeaser: {
        title: "Қарапайымнан бастаңыз. Бизнеспен бірге масштабтаңыз.",
        subtitle: "Virtual Space сізбен бірге өседі.",
        cta: "Тарифтерді көру", cta2: "Тегін көру",
      },
      finalCta: {
        title: "AI-кеңістік құруға дайынсыз ба?",
        subtitle: "ИИ-агенттерді пайдалана бастаңыз және жұмысты жеделдетіңіз.",
        cta: "Тегін көру", cta2: "Демо тапсырыс беру",
      },
      footer: {
        tagline: "Бизнеске арналған AI-кеңістік.",
        productLabel: "Өнім", learnLabel: "Оқыту", companyLabel: "Компания", accountLabel: "Аккаунт",
        resources: "Ресурстар", contact: "Байланыс",
        copyright: "© Virtual Space. Барлық құқықтар қорғалған.",
        powered: "Virtual Accelerate қолдауымен",
        poweredBy: "Қолдауымен",
        productItems: { workspace: "Кеңістік", aiAgents: "ИИ-агенттер", automation: "Автоматтандыру", analytics: "Аналитика" },
      },
      brandbook: {
        oneWorkspace: {
          title: "Бір кеңістік.", accent: "Барлығы байланыста.",
          desc: "Командалар, құралдар, процестер және ИИ-агенттер бір жұмыс кеңістігінде.",
          bullets: ["ИИ-агенттер орталықта", "Команда, тапсырмалар, құралдар мен деректер орбитада", "Бір байланысқан қабат"],
          orbit: { ai: "ИИ-агенттер", tasks: "Тапсырмалар", data: "Деректер", tools: "Құралдар", team: "Команда" },
        },
        tone: {
          title: "Ақылды,", accent: "бірақ адами.",
          items: [
            { title: "Күрделі жайлы қарапайым", body: "Түсінікті түсіндіреміз." },
            { title: "Бизнеске бағдар", body: "Нақты нәтижелерге назар." },
            { title: "Сабырлы сенімділік", body: "Сенімді және кәсіби." },
            { title: "Ақылды, бірақ адами", body: "ИИ көмектеседі — шешімді адамдар қабылдайды." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Чат",
          workspace: "Жұмыс кеңістігі", insights: "Аналитика", account: "Аккаунт",
          overview: "Шолу", tasks: "Тапсырмалар", knowledgeBase: "Білім қоры",
          aiAgents: "AI-агенттер", analytics: "Аналитика", timeTracking: "Уақыт есебі",
          clients: "Клиенттер", profile: "Профиль",
          agentsDocs: "Құжаттар және деректер", agentsTasks: "Команда тапсырмалары", agentsFusion: "Сатылым", inDevelopment: "Әзірленуде", comingSoon: "Жақында",
          financials: "Қаржы", telegram: "Телеграм", team: "Команда", settings: "Баптаулар", newChat: "Жаңа чат", collapse: "Жию", expand: "Ашу", integrations: "Интеграциялар",

        },
        settings: {
          profile: { title: "Профиль", desc: "Атыңыз, аватар және тіл." },
          team: { title: "Команда мен шақырулар", desc: "Мүшелер мен рөлдер." },
          teamspace: { title: "Жұмыс кеңістігі", desc: "Атауы мен параметрлер." },
        },
        tasks: {
          dlgEdit: "Тапсырманы өңдеу",
          dlgNew: "Жаңа тапсырма",
          fTitle: "Атауы",
          phTitle: "Жаңа онбординг",
          fDesc: "Сипаттама",
          phDesc: "Мәліметтер, критерийлер, сілтемелер…",
          fStatus: "Мәртебесі",
          fPriority: "Басымдылық",
          fAssignee: "Орындаушы",
          phAssignee: "Атауы немесе email",
          fDue: "Мерзімі",
          delete: "Жою",
          cancel: "Бас тарту",
          save: "Сақтау",
          create: "Тапсырма құру",
          errTitle: "Атауы қажет",
          okUpdate: "Тапсырма жаңартылды",
          okCreate: "Тапсырма құрылды",
          okDelete: "Тапсырма жойылды",
          chatLog: "Тапсырма қолмен құрылды",
        },
        header: {
          teamspace: "Команда кеңістігі", loading: "Жүктелуде…", signedInAs: "Кіргенсіз:",
          inviteMembers: "Мүшелерді шақыру", teamspaceSettings: "Кеңістік баптаулары",
          signOut: "Шығу", newTask: "Жаңа тапсырма",
          search: "Тапсырмалар, құжаттар, агенттерді іздеу…", invite: "Шақыру",
        },
        invite: {
          title: "Шақыру:", subtitle: "Кодты немесе сілтемені командаңызбен бөлісіңіз.",
          code: "Шақыру коды", link: "Шақыру сілтемесі", copy: "Көшіру", copied: "Көшірілді",
          hint: "Әріптестер онбординг экранында кодты енгізу немесе сілтемені ашып кіру арқылы қосыла алады.",
        },
        overview: {
          greeting: "Қайта оралуыңызбен", subtitle: "Бүгін кеңістігіңізде не болып жатқанын көріңіз.",
          quickAction: "Жылдам әрекет", askZukha: "Zukha-дан сұрау",
          askZukhaSubtitle: "Сіздің бизнесіңіз бір AI-кеңістікте",
          clear: "Тазалау", thinking: "Virtual Space ойлауда…", placeholder: "Кез келген нәрсені сұраңыз…",
          suggestions: [
            "Командам осы аптада не істегенін қорытындыла",
            "Клиентке еске салу хатын жаз",
            "Бүгін ең алдымен қандай тапсырмаларға назар аудару керек?",
            "Келесі спринт үшін 3 KPI ұсын",
          ],
        },
        profile: {
          title: "Профиль", subtitle: "Жеке ақпарат пен баптауларды басқарыңыз.",
          email: "Email", fullName: "Толық аты-жөні", company: "Компания",
          avatarUrl: "Аватар URL", language: "Тіл",
          save: "Өзгерістерді сақтау", saving: "Сақталуда…", saved: "Сақталды",
        },
        chat: {
          newChat: "Жаңа чат", history: "Тарих", noHistory: "Әзірге чаттар жоқ",
          confirmDelete: "Осы чатты жоямыз ба?", attach: "Файлды тіркеу — Білім қорымен синхрондалады",
          agentDocs: "Құжаттар", agentTasks: "Тапсырмалар", agentAdvisor: "Кеңесші", clearAgent: "алып тастау",
        },
        agents: {
          title: "AI Агенттер",
          subtitle: "Кез-келген чатта @тег арқылы шақыратын мамандандырылған AI-агенттер",
          howTitle: "Қалай қолдану",
          howBody: "Кез-келген чатта агент тегін жазыңыз (мысалы, @contracts) — агент сол хабарламаны өңдейді. Немесе агентпен бөлек әңгіме бастау үшін 'Ашу' түймесін басыңыз.",
          open: "Агентті ашу", useInChat: "немесе кез-келген чатта", moreSoon: "Жақын арада тағы агенттер",
          contracts: {
            title: "Келісім-шарт тәуекел агенті",
            desc: "Келісім-шарттарды тәуекелдерге талдап, жақсартулар ұсынады. Келісім-шартты Білім қорына жүктеңіз немесе мәтінді қойып, @contracts арқылы жазыңыз.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Логтарды тазалау", "ETL ағыны", "Валидация", "Шифрлау", "Backup"],
          ["Лидтерді скорингтеу", "Outreach", "Follow-up", "Кездесу", "Жабу"],
          ["KPI-трекинг", "Инсайттар", "Болжам", "Аудит", "Визуализация"],
          ["Қойма", "Логистика", "Сатып алу", "Комплаенс", "Жөнелту"],
        ],
      },
    },
  },
  ky: {
    translation: {
      nav: {
        learn: "Окутуу", mentors: "Насаатчылар", courses: "Курстар",
        product: "Продукт", pricing: "Тарифтер", bookDemo: "Демо буйруу",
        login: "Кирүү", signup: "Катталуу",
        cta: "Акысыз көрүү", demo: "Демо", price: "Тарифтер",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "Бизнес үчүн AI-мейкиндик",
        subtitle: "Процесстерди автоматташтырыңыз, командаларды бириктириңиз жана ИИ-агенттерди бир мейкиндикте башкарыңыз.",
        subtitle2: "\n",
        cta: "Акысыз көрүү",
        cta2: "Демо буйруу",
        tagline: "Бүгүн баштаңыз. Татаал жөндөөсүз.",
      },
      newEra: {
        eyebrow: "",
        title: "Бизнес үчүн жаңы доор",
        titleAccent: "ИИ-агенттер менен.",
        body1: "Командаларга ар бир рутинаны кол менен жүргүзүүнүн кереги жок. ИИ-агенттер уюштурат, талдайт жана автоматташтырат.",
        body2: "Акылдуу жана тезирээк иштегиси келген бизнес үчүн.",
        pill1: "Уюштуруу жана талдоо",
        pill2: "Операцияларды колдоо",
        pill3: "Процесстерди автоматташтыруу",
        imageAlt: "ИИ-мейкиндиги менен иштеген кесиптештер",
      },
      features: {
        eyebrow: "Сиз ойлогондой иштейт",
        title: "Бир мейкиндик.",
        titleAccent: "Баары байланышта.",
        kb: { tag: "БИЛИМ БАЗАСЫ", title: "Команда үчүн бирдиктүү мээ.", body: "Документтериңиз боюнча заматта жооптор." },
        reminders: { tag: "АКЫЛДУУ ЭСКЕРТҮҮЛӨР", title: "Эч бир follow-up жоголбойт.", body: "Агенттер керектүү учурда билдирет." },
      },
      benefits: {
        eyebrow: "Артыкчылыктар",
        title: "Акча жана убакытты үнөмдөңүз.",
        titleAccent: "Процесстерди автоматташтырыңыз.",
        cards: {
          money: { title: "Акча үнөмдөө", body1: "Рутиналык тапшырмаларды автоматташтырып чыгымды азайтыңыз.", body2: "Команданы стратегияга бошотуңуз." },
          time: { title: "Убакыт үнөмдөө", body1: "Агенттер 24/7 иштейт: отчёттор, жаңылоолор.", body2: "Азыраак которулуу. Көбүрөөк натыйжа." },
          auto: { title: "Автоматташтыруу", body1: "Рутиналык процесстерди автосистемага айландырыңыз.", body2: "Сатуу, HR, операциялар, колдоо." },
        },
      },
      audience: {
        eyebrow: "Virtual Space кимге",
        title: "Кимге",
        titleAccent: "Virtual Space?",
        businesses: {
          tag: "БИЗНЕС", title: "Бизнес үчүн",
          desc: "Операцияларды автоматташтырыңыз, кол эмгегин азайтыңыз жана команданы бириктириңиз.",
          bestForLabel: "Эң жакшы дал келет:",
          bestFor: ["Сатуу бөлүмдөрү", "Операциялык командалар", "Сервистик компаниялар", "Чакан жана орто бизнес", "Өсүп жаткан компаниялар"],
        },
        startups: {
          tag: "СТАРТАПТАР", title: "Стартаптарга",
          desc: "ИИ менен тезирээк кыймылдаңыз. Рутинаны автоматташтырыңыз.",
          bestForLabel: "Эң жакшы дал келет:",
          bestFor: ["Негиздөөчүлөр", "Продукт командалары", "Эрте стартаптар", "Growth-командалар"],
        },
        ngos: {
          tag: "ӨЭУ", title: "ӨЭУ үчүн",
          desc: "Долбоорлорду башкарууну, отчёттуулукту жана билим алмашууну жеңилдетиңиз.",
          bestForLabel: "Эң жакшы дал келет:",
          bestFor: ["ӨЭУ", "Долбоор командалары", "Донор программалары", "Билим берүү уюмдары"],
        },
      },
      cta: {
        title1: "Демо үчүн", title2: "арыз калтырыңыз",
        subtitle: "30 мүнөт — агенттер бизнесиңиздин милдеттерин кантип чечерин көрсөтөбүз.",
        name: "Аты-жөнүңүз", contact: "Email же Telegram", company: "Компания (милдеттүү эмес)",
        submit: "Демо суроо",
        thanks: "Рахмат! 24 сааттын ичинде байланышабыз.",
        note1: "Картасыз", note2: "24 саатта жооп", note3: "NDA талап боюнча",
      },
      bookDemoPage: {
        title: "Демо буйруу",
        subtitle: "Virtual Space сиздин процесстериңизге кантип туура келерин билиңиз.",
        cta: "Демо буйруу",
        sectionTitle: "Демодо эмне болот?",
        sectionSubtitle: "Эмне көрөсүз",
        items: [
          { title: "ИИ-агенттер", body: "Сатуу, HR, операциялар үчүн ИИ-агенттерди түзүңүз." },
          { title: "Процесстерди автоматташтыруу", body: "Рутиналык тапшырмаларды автоматташтырылган процесстерге айландырыңыз." },
          { title: "Бирдиктүү жумуш мейкиндиги", body: "Долбоорлор, тапшырмалар жана документтер бир жерде." },
          { title: "Жеке сценарийлер", body: "ИИ уюмуңуздун процесстерин кантип жакшыртарын билиңиз." },
          { title: "Ишке ашыруу планы", body: "Баштоо үчүн практикалык жол картасын алыңыз." },
        ],
      },
      pricingTeaser: {
        title: "Жөнөкөйдөн баштаңыз. Бизнес менен бирге өсүңүз.",
        subtitle: "Virtual Space сиз менен бирге өсөт.",
        cta: "Тарифтерди көрүү", cta2: "Акысыз көрүү",
      },
      finalCta: {
        title: "AI-мейкиндик курууга даярсызбы?",
        subtitle: "ИИ-агенттерди колдонуп ишти тездетиңиз.",
        cta: "Акысыз көрүү", cta2: "Демо буйруу",
      },
      footer: {
        tagline: "Бизнес үчүн AI-мейкиндик.",
        productLabel: "Продукт", learnLabel: "Окутуу", companyLabel: "Компания", accountLabel: "Аккаунт",
        resources: "Ресурстар", contact: "Байланыш",
        copyright: "© Virtual Space. Бардык укуктар корголгон.",
        powered: "Virtual Accelerate колдоосу менен",
        poweredBy: "Колдоосу менен",
        productItems: { workspace: "Мейкиндик", aiAgents: "ИИ-агенттер", automation: "Автоматташтыруу", analytics: "Аналитика" },
      },
      brandbook: {
        oneWorkspace: {
          title: "Бир мейкиндик.", accent: "Баары байланышта.",
          desc: "Командалар, куралдар, процесстер жана ИИ-агенттер бир жумуш мейкиндигинде.",
          bullets: ["ИИ-агенттер борбордо", "Команда, тапшырмалар, куралдар жана маалыматтар орбитада", "Бир байланышкан катмар"],
          orbit: { ai: "ИИ-агенттер", tasks: "Тапшырмалар", data: "Маалыматтар", tools: "Куралдар", team: "Команда" },
        },
        tone: {
          title: "Акылдуу,", accent: "бирок адамча.",
          items: [
            { title: "Татаал жөнүндө жөнөкөй", body: "Түшүнүктүү түшүндүрөбүз." },
            { title: "Бизнеске багыт", body: "Реалдуу натыйжаларга көңүл." },
            { title: "Токтоо ишеним", body: "Ишенимдүү жана кесипкөй." },
            { title: "Акылдуу, бирок адамча", body: "ИИ жардам берет — чечимди адамдар кабыл алат." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Чат",
          workspace: "Иш мейкиндиги", insights: "Аналитика", account: "Аккаунт",
          overview: "Кароо", tasks: "Тапшырмалар", knowledgeBase: "Билим базасы",
          aiAgents: "AI-агенттер", analytics: "Аналитика", timeTracking: "Убакыт эсеби",
          clients: "Кардарлар", profile: "Профиль",
          agentsDocs: "Документтер жана маалыматтар", agentsTasks: "Команда тапшырмалары", agentsFusion: "Сатуулар", inDevelopment: "Иштелип жатат", comingSoon: "Жакында",
          financials: "Каржы", telegram: "Телеграм", team: "Команда", settings: "Жөндөөлөр", newChat: "Жаңы чат", collapse: "Жыйноо", expand: "Ачуу", integrations: "Интеграциялар",

        },
        settings: {
          profile: { title: "Профиль", desc: "Атыңыз, аватар жана тил." },
          team: { title: "Команда жана чакыруулар", desc: "Мүчөлөр жана ролдор." },
          teamspace: { title: "Иш мейкиндиги", desc: "Аты жана жөндөөлөр." },
        },
        tasks: {
          dlgEdit: "Тапшырманы түзөтүү",
          dlgNew: "Жаңы тапшырма",
          fTitle: "Аталышы",
          phTitle: "Жаңы онбординг",
          fDesc: "Сүрөттөмө",
          phDesc: "Чоо-жайы, критерийлер, шилтемелер…",
          fStatus: "Абалы",
          fPriority: "Приоритет",
          fAssignee: "Аткаруучу",
          phAssignee: "Аты же email",
          fDue: "Мөөнөтү",
          delete: "Өчүрүү",
          cancel: "Жокко чыгаруу",
          save: "Сактоо",
          create: "Тапшырма түзүү",
          errTitle: "Аталышы керек",
          okUpdate: "Тапшырма жаңыртылды",
          okCreate: "Тапшырма түзүлдү",
          okDelete: "Тапшырма өчүрүлдү",
          chatLog: "Тапшырма кол менен түзүлдү",
        },
        header: {
          teamspace: "Команда мейкиндиги", loading: "Жүктөлүүдө…", signedInAs: "Кирген:",
          inviteMembers: "Мүчөлөрдү чакыруу", teamspaceSettings: "Мейкиндик жөндөөлөрү",
          signOut: "Чыгуу", newTask: "Жаңы тапшырма",
          search: "Тапшырма, документ, агенттерди издөө…", invite: "Чакыруу",
        },
        invite: {
          title: "Чакыруу:", subtitle: "Кодду же шилтемени командаңыз менен бөлүшүңүз.",
          code: "Чакыруу коду", link: "Чакыруу шилтемеси", copy: "Көчүрүү", copied: "Көчүрүлдү",
          hint: "Кесиптештер онбординг экранында кодду киргизип же шилтемени ачып кире алышат.",
        },
        overview: {
          greeting: "Кайра кош келиңиз", subtitle: "Бүгүн мейкиндигиңизде эмне болуп жатканын көрүңүз.",
          quickAction: "Тез аракет", askZukha: "Zukha-дан сура",
          askZukhaSubtitle: "Сиздин бизнесиңиз бир AI-мейкиндикте",
          clear: "Тазалоо", thinking: "Virtual Space ойлонуп жатат…", placeholder: "Каалаган нерсени сура…",
          suggestions: [
            "Командам бул жумада эмне кылганын жыйынтыкта",
            "Кардарга эскертүү катын жаз",
            "Бүгүн эң биринчи кайсы тапшырмаларды аткаруу керек?",
            "Кийинки спринт үчүн 3 KPI сунуштагыла",
          ],
        },
        profile: {
          title: "Профиль", subtitle: "Жеке маалыматты жана жөндөөлөрдү башкарыңыз.",
          email: "Email", fullName: "Толук аты-жөнү", company: "Компания",
          avatarUrl: "Аватар URL", language: "Тил",
          save: "Өзгөрүүлөрдү сактоо", saving: "Сакталууда…", saved: "Сакталды",
        },
        chat: {
          newChat: "Жаңы чат", history: "Тарых", noHistory: "Азырынча чаттар жок",
          confirmDelete: "Бул чатты өчүрөбүзбү?", attach: "Файл тиркөө — Билим базасы менен синхрондолот",
          agentDocs: "Документтер", agentTasks: "Тапшырмалар", agentAdvisor: "Кеңешчи", clearAgent: "алып салуу",
        },
        agents: {
          title: "AI Агенттер",
          subtitle: "Каалаган чатта @тег аркылуу чакыра турган адистешкен AI-агенттер",
          howTitle: "Кантип колдонуу",
          howBody: "Каалаган чатта агенттин тегин жазыңыз (мисалы, @contracts) — агент ошол билдирүүнү иштетет. Же 'Ачуу' баскычы менен агент менен өзүнчө чат баштаңыз.",
          open: "Агентти ачуу", useInChat: "же каалаган чатта колдонуу", moreSoon: "Жакында дагы агенттер",
          contracts: {
            title: "Келишим тобокелдик агенти",
            desc: "Келишимдерди тобокелдиктерге талдап, жакшыртууларды сунуштайт. Келишимди Билим базасына жүктөңүз же текстти коюңуз, андан кийин @contracts менен жазыңыз.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Логдорду тазалоо", "ETL агымы", "Валидация", "Шифрлөө", "Backup"],
          ["Лиддерди скоринг", "Outreach", "Follow-up", "Жолугушуу", "Жабуу"],
          ["KPI-трекинг", "Инсайттар", "Болжолдоо", "Аудит", "Визуализация"],
          ["Кампа", "Логистика", "Сатып алуу", "Комплаенс", "Жөнөтүү"],
        ],
      },
    },
  },
  uz: {
    translation: {
      nav: {
        learn: "Oʻqitish", mentors: "Mentorlar", courses: "Kurslar",
        product: "Mahsulot", pricing: "Tariflar", bookDemo: "Demo buyurtma",
        login: "Kirish", signup: "Roʻyxatdan oʻtish",
        cta: "Bepul sinab koʻring", demo: "Demo", price: "Tariflar",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "Biznes uchun AI-makon",
        subtitle: "Jarayonlarni avtomatlashtiring, jamoalarni birlashtiring va AI-agentlarni bir makonda boshqaring.",
        subtitle2: "\n",
        cta: "Bepul sinab koʻring",
        cta2: "Demo buyurtma berish",
        tagline: "Bugun boshlang. Murakkab sozlashsiz.",
      },
      newEra: {
        eyebrow: "",
        title: "Biznes uchun yangi davr",
        titleAccent: "AI-agentlar bilan.",
        body1: "Jamoalarga har bir rutinani qoʻlda yuritish shart emas. AI-agentlar bir makonda tashkil qiladi, tahlil qiladi va avtomatlashtiradi.",
        body2: "Aqlliroq va tezroq ishlashni istagan biznes uchun.",
        pill1: "Tashkil qilish va tahlil",
        pill2: "Operatsiyalarni qoʻllab-quvvatlash",
        pill3: "Jarayonlarni avtomatlashtirish",
        imageAlt: "AI-makoni bilan hamkorlik qilayotgan hamkasblar",
      },
      features: {
        eyebrow: "Siz oʻylagandek ishlaydi",
        title: "Bir makon.",
        titleAccent: "Hammasi bogʻliq.",
        kb: { tag: "BILIMLAR BAZASI", title: "Jamoa uchun yagona miya.", body: "Hujjatlaringiz boʻyicha bir zumda javoblar." },
        reminders: { tag: "AQLLI ESLATMALAR", title: "Hech bir follow-up yoʻqolmaydi.", body: "Agentlar kerakli paytda xabar beradi." },
      },
      benefits: {
        eyebrow: "Afzalliklar",
        title: "Pul va vaqtni tejang.",
        titleAccent: "Jarayonlarni avtomatlashtiring.",
        cards: {
          money: { title: "Pulni tejash", body1: "Rutin vazifalarni avtomatlashtirib xarajatlarni kamaytiring.", body2: "Jamoani strategiyaga boʻshating." },
          time: { title: "Vaqtni tejash", body1: "Agentlar 24/7 ishlaydi: hisobotlar, yangilanishlar.", body2: "Kamroq oʻtish. Koʻproq natija." },
          auto: { title: "Avtomatlashtirish", body1: "Rutin jarayonlarni avto-tizimlarga aylantiring.", body2: "Sotuv, HR, operatsiyalar, qoʻllab-quvvatlash." },
        },
      },
      audience: {
        eyebrow: "Virtual Space kimga",
        title: "Kimga",
        titleAccent: "Virtual Space?",
        businesses: {
          tag: "BIZNES", title: "Biznes uchun",
          desc: "Operatsiyalarni avtomatlashtiring, qoʻl mehnatini kamaytiring va jamoani birlashtiring.",
          bestForLabel: "Eng mos keladi:",
          bestFor: ["Sotuv boʻlimlari", "Operatsion jamoalar", "Servis kompaniyalari", "Kichik va oʻrta biznes", "Oʻsayotgan kompaniyalar"],
        },
        startups: {
          tag: "STARTAPLAR", title: "Startaplar uchun",
          desc: "AI bilan tezroq harakatlaning. Rutinani avtomatlashtiring.",
          bestForLabel: "Eng mos keladi:",
          bestFor: ["Asoschilar", "Mahsulot jamoalari", "Erta startaplar", "Growth-jamoalar"],
        },
        ngos: {
          tag: "NNT", title: "NNT uchun",
          desc: "Loyihalarni boshqarish, hisobot va bilim almashishni soddalashtiring.",
          bestForLabel: "Eng mos keladi:",
          bestFor: ["NNT", "Loyiha jamoalari", "Donor dasturlari", "Taʼlim tashkilotlari"],
        },
      },
      cta: {
        title1: "Demo uchun", title2: "ariza qoldiring",
        subtitle: "30 daqiqa — agentlar biznesingiz vazifalarini qanday hal qilishini koʻrsatamiz.",
        name: "Ismingiz", contact: "Email yoki Telegram", company: "Kompaniya (majburiy emas)",
        submit: "Demo soʻrash",
        thanks: "Rahmat! 24 soat ichida bogʻlanamiz.",
        note1: "Kartasiz", note2: "24 soatda javob", note3: "NDA soʻrov boʻyicha",
      },
      bookDemoPage: {
        title: "Demo buyurtma berish",
        subtitle: "Virtual Space jarayonlaringizga qanday mos kelishini bilib oling.",
        cta: "Demo buyurtma berish",
        sectionTitle: "Demoda nima boʻladi?",
        sectionSubtitle: "Nima koʻrasiz",
        items: [
          { title: "AI-agentlar", body: "Sotuv, HR, operatsiyalar uchun AI-agentlarni yarating." },
          { title: "Jarayonlarni avtomatlashtirish", body: "Rutin vazifalarni avtomatlashtirilgan jarayonlarga aylantiring." },
          { title: "Yagona ish makoni", body: "Loyihalar, vazifalar va hujjatlar bir joyda." },
          { title: "Shaxsiy stsenariylar", body: "AI tashkilotingiz jarayonlarini qanday yaxshilashi mumkinligini bilib oling." },
          { title: "Joriy etish rejasi", body: "Boshlash uchun amaliy yoʻl xaritasini oling." },
        ],
      },
      pricingTeaser: {
        title: "Oddiydan boshlang. Biznes bilan birga oʻsing.",
        subtitle: "Virtual Space siz bilan birga oʻsadi.",
        cta: "Tariflarni koʻrish", cta2: "Bepul sinab koʻring",
      },
      finalCta: {
        title: "AI-makonni qurishga tayyormisiz?",
        subtitle: "AI-agentlardan foydalanib ishni tezlashtiring.",
        cta: "Bepul sinab koʻring", cta2: "Demo buyurtma berish",
      },
      footer: {
        tagline: "Biznes uchun AI-makon.",
        productLabel: "Mahsulot", learnLabel: "Oʻqitish", companyLabel: "Kompaniya", accountLabel: "Akkaunt",
        resources: "Resurslar", contact: "Aloqa",
        copyright: "© Virtual Space. Barcha huquqlar himoyalangan.",
        powered: "Virtual Accelerate koʻmagida",
        poweredBy: "Koʻmagida",
        productItems: { workspace: "Makon", aiAgents: "AI-agentlar", automation: "Avtomatlashtirish", analytics: "Analitika" },
      },
      brandbook: {
        oneWorkspace: {
          title: "Bir makon.", accent: "Hammasi bogʻliq.",
          desc: "Jamoalar, vositalar, jarayonlar va AI-agentlar bir ish makonida.",
          bullets: ["AI-agentlar markazda", "Jamoa, vazifalar, vositalar va maʼlumotlar orbitada", "Bir bogʻlangan qatlam"],
          orbit: { ai: "AI-agentlar", tasks: "Vazifalar", data: "Maʼlumotlar", tools: "Vositalar", team: "Jamoa" },
        },
        tone: {
          title: "Aqlli,", accent: "lekin insoniy.",
          items: [
            { title: "Murakkab haqida sodda", body: "Tushunarli tushuntiramiz." },
            { title: "Biznesga yoʻnalish", body: "Real natijalarga eʼtibor." },
            { title: "Osoyishta ishonch", body: "Ishonchli va professional." },
            { title: "Aqlli, lekin insoniy", body: "AI yordam beradi — qaror odamniki." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Chat",
          workspace: "Ish maydoni", insights: "Analitika", account: "Akkaunt",
          overview: "Umumiy koʻrinish", tasks: "Vazifalar", knowledgeBase: "Bilim bazasi",
          aiAgents: "AI-agentlar", analytics: "Analitika", timeTracking: "Vaqt hisobi",
          clients: "Mijozlar", profile: "Profil",
          agentsDocs: "Hujjatlar va maʼlumotlar", agentsTasks: "Jamoa vazifalari", agentsFusion: "Sotuv", inDevelopment: "Ishlab chiqilmoqda", comingSoon: "Tez orada",
          financials: "Moliya", telegram: "Telegram", team: "Jamoa", settings: "Sozlamalar", newChat: "Yangi chat", collapse: "Yig'ish", expand: "Ochish", integrations: "Integratsiyalar",

        },
        settings: {
          profile: { title: "Profil", desc: "Ism, avatar va til." },
          team: { title: "Jamoa va takliflar", desc: "Aʼzolar va rollar." },
          teamspace: { title: "Ish maydoni", desc: "Nom va sozlamalar." },
        },
        tasks: {
          dlgEdit: "Vazifani tahrirlash",
          dlgNew: "Yangi vazifa",
          fTitle: "Nomi",
          phTitle: "Yangi onboarding",
          fDesc: "Tavsif",
          phDesc: "Tafsilotlar, mezonlar, havolalar…",
          fStatus: "Holat",
          fPriority: "Muhimlik",
          fAssignee: "Ijrochi",
          phAssignee: "Ism yoki email",
          fDue: "Muddat",
          delete: "Oʻchirish",
          cancel: "Bekor qilish",
          save: "Saqlash",
          create: "Vazifa yaratish",
          errTitle: "Nomi kerak",
          okUpdate: "Vazifa yangilandi",
          okCreate: "Vazifa yaratildi",
          okDelete: "Vazifa oʻchirildi",
          chatLog: "Vazifa qo'lda yaratildi",
        },
        header: {
          teamspace: "Jamoa maydoni", loading: "Yuklanmoqda…", signedInAs: "Kirgan:",
          inviteMembers: "Aʼzolarni taklif qilish", teamspaceSettings: "Maydon sozlamalari",
          signOut: "Chiqish", newTask: "Yangi vazifa",
          search: "Vazifa, hujjat, agentlarni qidirish…", invite: "Taklif",
        },
        invite: {
          title: "Taklif:", subtitle: "Kod yoki havolani jamoangiz bilan ulashing.",
          code: "Taklif kodi", link: "Taklif havolasi", copy: "Nusxalash", copied: "Nusxalandi",
          hint: "Hamkasblar onboarding ekranida kodni kiritish yoki havolani ochib kirish orqali qoʻshila oladi.",
        },
        overview: {
          greeting: "Qaytganingiz bilan", subtitle: "Bugun maydoningizda nima boʻlayotganini koʻring.",
          quickAction: "Tez harakat", askZukha: "Zukha'dan soʻrash",
          askZukhaSubtitle: "Sizning biznesingiz bitta AI-fazoda",
          clear: "Tozalash", thinking: "Virtual Space oʻylayapti…", placeholder: "Xohlagan narsani soʻrang…",
          suggestions: [
            "Jamoam shu hafta nima qilganini xulosa qil",
            "Mijozga eslatma xat yoz",
            "Bugun eng avval qaysi vazifalarni bajarish kerak?",
            "Keyingi sprint uchun 3 ta KPI taklif qil",
          ],
        },
        profile: {
          title: "Profil", subtitle: "Shaxsiy maʼlumot va sozlamalarni boshqaring.",
          email: "Email", fullName: "Toʻliq ism", company: "Kompaniya",
          avatarUrl: "Avatar URL", language: "Til",
          save: "Oʻzgarishlarni saqlash", saving: "Saqlanmoqda…", saved: "Saqlandi",
        },
        chat: {
          newChat: "Yangi chat", history: "Tarix", noHistory: "Hozircha chatlar yo'q",
          confirmDelete: "Ushbu chat o'chirilsinmi?", attach: "Fayl biriktirish — Bilim bazasi bilan sinxronlanadi",
          agentDocs: "Hujjatlar", agentTasks: "Vazifalar", agentAdvisor: "Maslahatchi", clearAgent: "o'chirish",
        },
        agents: {
          title: "AI Agentlar",
          subtitle: "Har qanday chatda @teg orqali chaqiriladigan maxsus AI-agentlar",
          howTitle: "Qanday foydalanish",
          howBody: "Har qanday chatda agent tegini yozing (masalan, @contracts) — agent shu xabarni ishlaydi. Yoki 'Ochish' tugmasi bilan agent bilan alohida suhbat boshlang.",
          open: "Agentni ochish", useInChat: "yoki har qanday chatda", moreSoon: "Yaqinda ko'proq agentlar",
          contracts: {
            title: "Shartnoma xavf agenti",
            desc: "Shartnomalarni xavflarga tahlil qiladi va yaxshilanishlarni taklif qiladi. Shartnomani Bilim bazasiga yuklang yoki matnni joylashtiring, so'ng @contracts orqali yozing.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Loglarni tozalash", "ETL oqim", "Validatsiya", "Shifrlash", "Backup"],
          ["Lidlarni skoring", "Outreach", "Follow-up", "Uchrashuv", "Yopish"],
          ["KPI-treking", "Insaytlar", "Prognoz", "Audit", "Vizualizatsiya"],
          ["Ombor", "Logistika", "Xarid", "Komplaens", "Joʻnatish"],
        ],
      },
    },
  },
  tg: {
    translation: {
      nav: {
        learn: "Омӯзиш", mentors: "Мураббиён", courses: "Курсҳо",
        product: "Маҳсулот", pricing: "Тарифҳо", bookDemo: "Фармоиши демо",
        login: "Ворид шудан", signup: "Бақайдгирӣ",
        cta: "Ройгон санҷед", demo: "Демо", price: "Тарифҳо",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "Фазои AI барои бизнес",
        subtitle: "Равандҳоро автоматӣ кунед, дастаҳоро муттаҳид созед ва AI-агентҳоро дар як фазо идора кунед.",
        subtitle2: "\n",
        cta: "Ройгон санҷед",
        cta2: "Фармоиши демо",
        tagline: "Имрӯз оғоз кунед. Бе танзими мураккаб.",
      },
      newEra: {
        eyebrow: "",
        title: "Давраи нав барои бизнес",
        titleAccent: "бо AI-агентҳо.",
        body1: "Дастаҳо дигар лозим нест ҳар як рутинаро дастӣ пеш баранд. AI-агентҳо дар як фазо ташкил, таҳлил ва автоматӣ мекунанд.",
        body2: "Барои бизнесе, ки мехоҳад оқилтар ва тезтар кор кунад.",
        pill1: "Ташкил ва таҳлил",
        pill2: "Дастгирии амалиёт",
        pill3: "Автоматикунонии равандҳо",
        imageAlt: "Кормандон бо AI-фазо ҳамкорӣ мекунанд",
      },
      features: {
        eyebrow: "Ба тарзе ки шумо фикр мекунед, кор мекунад",
        title: "Як фазо.",
        titleAccent: "Ҳама алоқаманд.",
        kb: { tag: "БАЗАИ ДОНИШ", title: "Мағзи ягона барои даста.", body: "Ҷавобҳои фаврӣ аз рӯи ҳуҷҷатҳои шумо." },
        reminders: { tag: "ЁДДОШТҲОИ ОҚИЛОНА", title: "Ҳеҷ follow-up гум намешавад.", body: "Агентҳо дар лаҳзаи зарурӣ хабар медиҳанд." },
      },
      benefits: {
        eyebrow: "Афзалиятҳо",
        title: "Пул ва вақтро сарфа кунед.",
        titleAccent: "Равандҳоро автоматӣ кунед.",
        cards: {
          money: { title: "Сарфаи пул", body1: "Хароҷотро бо автоматикунонии вазифаҳои рутинӣ кам кунед.", body2: "Дастаро барои стратегия озод кунед." },
          time: { title: "Сарфаи вақт", body1: "Агентҳо 24/7 кор мекунанд: ҳисоботҳо, навсозиҳо.", body2: "Камтар табдил. Бештар натиҷа." },
          auto: { title: "Автоматикунонӣ", body1: "Равандҳои рутиниро ба системаҳои худкор табдил диҳед.", body2: "Фурӯш, HR, амалиёт, дастгирӣ." },
        },
      },
      audience: {
        eyebrow: "Virtual Space барои кӣ",
        title: "Барои кӣ",
        titleAccent: "Virtual Space?",
        businesses: {
          tag: "БИЗНЕС", title: "Барои бизнес",
          desc: "Амалиётро автоматӣ кунед, меҳнати дастиро кам кунед ва дастаро муттаҳид созед.",
          bestForLabel: "Беҳтарин мувофиқ:",
          bestFor: ["Шӯъбаҳои фурӯш", "Дастаҳои амалиётӣ", "Ширкатҳои хидматрасон", "Бизнеси хурду миёна", "Ширкатҳои дар ҳоли рушд"],
        },
        startups: {
          tag: "СТАРТАПҲО", title: "Барои стартапҳо",
          desc: "Бо AI зудтар ҳаракат кунед. Рутинаро автоматӣ кунед.",
          bestForLabel: "Беҳтарин мувофиқ:",
          bestFor: ["Бунёдгузорон", "Дастаҳои маҳсулот", "Стартапҳои барвақт", "Growth-дастаҳо"],
        },
        ngos: {
          tag: "СҒД", title: "Барои СҒД",
          desc: "Идоракунии лоиҳаҳо, ҳисобот ва мубодилаи донишро осон кунед.",
          bestForLabel: "Беҳтарин мувофиқ:",
          bestFor: ["СҒД", "Дастаҳои лоиҳа", "Барномаҳои донор", "Ташкилотҳои таълимӣ"],
        },
      },
      cta: {
        title1: "Барои демо", title2: "ариза гузоред",
        subtitle: "30 дақиқа — нишон медиҳем, ки агентҳо чӣ гуна вазифаҳои бизнеси шуморо иҷро мекунанд.",
        name: "Номи шумо", contact: "Email ё Telegram", company: "Ширкат (ихтиёрӣ)",
        submit: "Дархости демо",
        thanks: "Ташаккур! Дар давоми 24 соат бо шумо тамос мегирем.",
        note1: "Бе корт", note2: "Ҷавоб дар 24 соат", note3: "NDA аз рӯи дархост",
      },
      bookDemoPage: {
        title: "Фармоиши демо",
        subtitle: "Бифаҳмед, ки Virtual Space чӣ гуна ба равандҳои шумо мувофиқ мешавад.",
        cta: "Фармоиши демо",
        sectionTitle: "Дар демо чӣ мешавад?",
        sectionSubtitle: "Чӣ мебинед",
        items: [
          { title: "AI-агентҳо", body: "Барои фурӯш, HR, амалиёт AI-агентҳо созед." },
          { title: "Автоматикунонии равандҳо", body: "Вазифаҳои рутиниро ба равандҳои автоматӣ табдил диҳед." },
          { title: "Фазои ягонаи корӣ", body: "Лоиҳаҳо, вазифаҳо ва ҳуҷҷатҳо дар як ҷо." },
          { title: "Сенарияҳои шахсӣ", body: "Бифаҳмед, ки AI чӣ гуна равандҳои ташкилоти шуморо беҳтар мекунад." },
          { title: "Нақшаи татбиқ", body: "Барои оғоз харитаи амалиро гиред." },
        ],
      },
      pricingTeaser: {
        title: "Аз оддӣ оғоз кунед. Бо бизнес рушд кунед.",
        subtitle: "Virtual Space бо шумо рушд мекунад.",
        cta: "Тарифҳоро дидан", cta2: "Ройгон санҷед",
      },
      finalCta: {
        title: "Омодаед фазои AI бисозед?",
        subtitle: "AI-агентҳоро истифода баред ва корро суръат бахшед.",
        cta: "Ройгон санҷед", cta2: "Фармоиши демо",
      },
      footer: {
        tagline: "Фазои AI барои бизнес.",
        productLabel: "Маҳсулот", learnLabel: "Омӯзиш", companyLabel: "Ширкат", accountLabel: "Ҳисоб",
        resources: "Захираҳо", contact: "Тамос",
        copyright: "© Virtual Space. Ҳамаи ҳуқуқҳо ҳифз шудаанд.",
        powered: "Бо дастгирии Virtual Accelerate",
        poweredBy: "Бо дастгирии",
        productItems: { workspace: "Фазо", aiAgents: "AI-агентҳо", automation: "Автоматикунонӣ", analytics: "Аналитика" },
      },
      brandbook: {
        oneWorkspace: {
          title: "Як фазо.", accent: "Ҳама алоқаманд.",
          desc: "Дастаҳо, воситаҳо, равандҳо ва AI-агентҳо дар як фазои корӣ.",
          bullets: ["AI-агентҳо дар марказ", "Даста, вазифаҳо, воситаҳо ва маълумот дар мадор", "Як қабати алоқаманд"],
          orbit: { ai: "AI-агентҳо", tasks: "Вазифаҳо", data: "Маълумот", tools: "Воситаҳо", team: "Даста" },
        },
        tone: {
          title: "Оқилона,", accent: "аммо инсонӣ.",
          items: [
            { title: "Мураккабро содда", body: "Фаҳмо шарҳ медиҳем." },
            { title: "Нигоҳ ба бизнес", body: "Диққат ба натиҷаҳои воқеӣ." },
            { title: "Эътимоди ором", body: "Боэътимод ва касбӣ." },
            { title: "Оқилона, вале инсонӣ", body: "AI кӯмак мекунад — қарор аз они одамон." },
          ],
        },
      },
      app: {
        nav: {
          chat: "Чат",
          workspace: "Фазои корӣ", insights: "Таҳлил", account: "Ҳисоб",
          overview: "Шарҳ", tasks: "Вазифаҳо", knowledgeBase: "Пойгоҳи дониш",
          aiAgents: "AI-агентҳо", analytics: "Таҳлил", timeTracking: "Ҳисоби вақт",
          clients: "Муштариён", profile: "Профил",
          agentsDocs: "Ҳуҷҷатҳо ва маълумот", agentsTasks: "Вазифаҳои даста", agentsFusion: "Фурӯш", inDevelopment: "Дар ҳоли таҳия", comingSoon: "Ба зудӣ",
          financials: "Молия", telegram: "Телеграм", team: "Даста", settings: "Танзимот", newChat: "Чати нав", collapse: "Ҷамъ кардан", expand: "Кушодан",

        },
        settings: {
          profile: { title: "Профил", desc: "Ном, аватар ва забон." },
          team: { title: "Даста ва даъватҳо", desc: "Аъзоён ва нақшҳо." },
          teamspace: { title: "Фазои корӣ", desc: "Ном ва танзимот." },
        },
        tasks: {
          dlgEdit: "Таҳрири вазифа",
          dlgNew: "Вазифаи нав",
          fTitle: "Ном",
          phTitle: "Онбординги нав",
          fDesc: "Тавсиф",
          phDesc: "Тафсилот, меъёрҳо, пайвандҳо…",
          fStatus: "Ҳолат",
          fPriority: "Афзалият",
          fAssignee: "Иҷрокунанда",
          phAssignee: "Ном ё email",
          fDue: "Муҳлат",
          delete: "Нест кардан",
          cancel: "Бекор",
          save: "Захира",
          create: "Сохтани вазифа",
          errTitle: "Ном лозим аст",
          okUpdate: "Вазифа навсозӣ шуд",
          okCreate: "Вазифа сохта шуд",
          okDelete: "Вазифа нест шуд",
          chatLog: "Вазифа дастӣ сохта шуд",
        },
        header: {
          teamspace: "Фазои даста", loading: "Бор шуда истодааст…", signedInAs: "Ворид шудаед:",
          inviteMembers: "Даъвати аъзоён", teamspaceSettings: "Танзимоти фазо",
          signOut: "Баромадан", newTask: "Вазифаи нав",
          search: "Ҷустуҷӯи вазифа, ҳуҷҷат, агентҳо…", invite: "Даъват",
        },
        invite: {
          title: "Даъват ба:", subtitle: "Код ё пайвандро бо дастаи худ мубодила кунед.",
          code: "Коди даъват", link: "Пайванди даъват", copy: "Нусхабардорӣ", copied: "Нусхабардорӣ шуд",
          hint: "Ҳамкорон метавонанд бо ворид кардани код дар экрани онбординг ё кушодани пайванд ва воридшавӣ ҳамроҳ шаванд.",
        },
        overview: {
          greeting: "Хуш омадед", subtitle: "Имрӯз дар фазои шумо чӣ рӯй дода истодааст.",
          quickAction: "Амали зуд", askZukha: "Аз Zukha пурсидан",
          askZukhaSubtitle: "Бизнеси шумо дар як фазои AI",
          clear: "Тоза кардан", thinking: "Virtual Space фикр мекунад…", placeholder: "Ҳар чиро пурсед…",
          suggestions: [
            "Он чиро, ки дастаам ин ҳафта кард, ҷамъбаст кун",
            "Ба муштарӣ мактуби ёдоварӣ нависед",
            "Имрӯз пеш аз ҳама кадом вазифаҳоро иҷро кардан лозим аст?",
            "Барои спринти оянда 3 KPI пешниҳод кун",
          ],
        },
        profile: {
          title: "Профил", subtitle: "Маълумоти шахсӣ ва танзимотро идора кунед.",
          email: "Email", fullName: "Номи пурра", company: "Ширкат",
          avatarUrl: "URL-и аватар", language: "Забон",
          save: "Захира кардани тағйирот", saving: "Захира шуда истодааст…", saved: "Захира шуд",
        },
        chat: {
          newChat: "Чати нав", history: "Таърих", noHistory: "Ҳоло чатҳо нест",
          confirmDelete: "Ин чатро нест мекунед?", attach: "Замима кардани файл — бо Пойгоҳи дониш ҳамоҳанг мешавад",
          agentDocs: "Ҳуҷҷатҳо", agentTasks: "Вазифаҳо", agentAdvisor: "Мушовир", clearAgent: "тоза кардан",
        },
        agents: {
          title: "AI Агентҳо",
          subtitle: "AI-агентҳои махсус, ки шумо метавонед дар ҳар як чат бо @тег даъват кунед",
          howTitle: "Тарзи истифода",
          howBody: "Дар ҳар як чат теги агентро нависед (масалан, @contracts) — агент он паёмро иҷро мекунад. Ё тугмаи 'Кушодан'-ро зер кунед, то бо агент сӯҳбати ҷудогона оғоз кунед.",
          open: "Кушодани агент", useInChat: "ё дар ҳар як чат", moreSoon: "Ба зудӣ агентҳои бештар",
          contracts: {
            title: "Агенти хатарҳои шартнома",
            desc: "Шартномаҳоро барои хатарҳо таҳлил мекунад ва беҳбудиҳо пешниҳод мекунад. Шартномаро ба Пойгоҳи дониш бор кунед ё матнро гузоред, сипас бо @contracts нависед.",
          },
        },
      },
      taskTable: {
        tasks: [
          ["Тозакунии логҳо", "ETL ҷараён", "Валидатсия", "Рамзгузорӣ", "Backup"],
          ["Скоринги лидҳо", "Outreach", "Follow-up", "Мулоқот", "Пӯшидан"],
          ["KPI-трекинг", "Инсайтҳо", "Пешгӯӣ", "Аудит", "Визуализатсия"],
          ["Анбор", "Логистика", "Харид", "Комплаенс", "Фиристодан"],
        ],
      },
    },
  },

};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ru", "kk", "ky", "uz", "tg"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

// Map ISO country code → preferred language
const COUNTRY_TO_LANG: Record<string, string> = {
  RU: "ru", BY: "ru", UA: "ru", MD: "ru", AM: "ru", AZ: "ru", TM: "ru",
  KZ: "kk",
  KG: "ky",
  UZ: "uz",
  TJ: "tg",
};

const SUPPORTED = ["en", "ru", "kk", "ky", "uz", "tg"];

async function detectCountryLang(): Promise<string | null> {
  try {
    const cached = localStorage.getItem("i18nGeoCountry");
    let country = cached;
    if (!country) {
      const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        country = (data?.country_code || data?.country || "").toUpperCase();
        if (country) localStorage.setItem("i18nGeoCountry", country);
      }
    }
    if (country && COUNTRY_TO_LANG[country]) return COUNTRY_TO_LANG[country];
  } catch {
    /* ignore */
  }
  return null;
}

// Detect and apply the preferred language only on the client, AFTER hydration,
// so SSR and initial client render match (both use "en").
export function applyClientLanguage() {
  if (!isBrowser) return;
  try {
    const saved = localStorage.getItem("i18nextLng");
    if (saved && SUPPORTED.includes(saved)) {
      if (saved !== i18n.language) void i18n.changeLanguage(saved);
      return;
    }
    void detectCountryLang().then((geoLang) => {
      const nav = navigator.language?.split("-")[0];
      const pick = geoLang || (nav && SUPPORTED.includes(nav) ? nav : "en");
      if (pick && pick !== i18n.language) void i18n.changeLanguage(pick);
    });
  } catch {
    /* ignore */
  }
}


export const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kk", label: "KK" },
  { code: "ky", label: "KY" },
  { code: "uz", label: "UZ" },
  { code: "tg", label: "TG" },
] as const;


export default i18n;
