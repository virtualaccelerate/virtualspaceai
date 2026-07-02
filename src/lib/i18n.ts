import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

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
        subtitle2: "Tasks, data, tools and agents — all in one connected space.",
        cta: "Try now for free",
        cta2: "Book a demo",
        tagline: "Start today. No setup required.",
      },
      newEra: {
        eyebrow: "The shift",
        title: "New era for business",
        titleAccent: "with AI agents.",
        body1: "Teams no longer manage every routine task by hand. AI agents organize, analyze and automate — all inside one workspace.",
        body2: "Built for businesses that want to work smarter and faster.",
        pill1: "Organize & analyze",
        pill2: "Support operations",
        pill3: "Automate workflows",
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
        eyebrow: "Who it's for",
        title: "Built for teams that",
        titleAccent: "move.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Ship product, not process." },
        entrepreneurs: { tag: "ENTREPRENEURS", title: "Entrepreneurs", body: "Agents handle the repeatable." },
        ngo: { tag: "NGO", title: "NGOs", body: "More impact with fewer resources." },
      },
      cta: {
        title1: "Request a", title2: "demo",
        subtitle: "30 minutes — see how agents fit your business.",
        name: "Your name", contact: "Email or Telegram", company: "Company (optional)",
        submit: "Request demo",
        thanks: "Thanks! We'll reach out within 24 hours.",
        note1: "No card required", note2: "24h reply", note3: "NDA on request",
      },
    },
  },
  ru: {
    translation: {
      nav: {
        learn: "Обучение", mentors: "Наставники", courses: "Курсы",
        product: "Продукт", pricing: "Тарифы", bookDemo: "Забронировать демо",
        login: "Войти", signup: "Регистрация",
        cta: "Попробовать бесплатно", demo: "Демо", price: "Тарифы",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "AI-пространство для бизнеса",
        subtitle: "Автоматизируйте процессы, объединяйте команды и управляйте ИИ-агентами в одном пространстве.",
        subtitle2: "Задачи, данные, инструменты и агенты — в одном связанном пространстве.",
        cta: "Попробовать бесплатно",
        cta2: "Забронировать демо",
        tagline: "Начните сегодня. Без сложной настройки.",
      },
      newEra: {
        eyebrow: "Сдвиг",
        title: "Новая эра для бизнеса",
        titleAccent: "с AI-агентами.",
        body1: "Командам больше не нужно вручную вести каждую рутину. AI-агенты организуют, анализируют и автоматизируют — в одном пространстве.",
        body2: "Для бизнеса, который хочет работать умнее и быстрее.",
        pill1: "Организация и анализ",
        pill2: "Поддержка операций",
        pill3: "Автоматизация процессов",
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
        eyebrow: "Кому подходит",
        title: "Для команд, которые",
        titleAccent: "движутся.",
        startups: { tag: "СТАРТАПЫ", title: "Стартапам", body: "Делайте продукт, а не процессы." },
        entrepreneurs: { tag: "ПРЕДПРИНИМАТЕЛИ", title: "Предпринимателям", body: "Агенты закрывают рутину." },
        ngo: { tag: "НПО", title: "НПО", body: "Больше эффекта при малых ресурсах." },
      },
      cta: {
        title1: "Оставьте заявку", title2: "на демо",
        subtitle: "30 минут — покажем, как агенты закроют задачи вашего бизнеса.",
        name: "Ваше имя", contact: "Email или Telegram", company: "Компания (необязательно)",
        submit: "Запросить демо",
        thanks: "Спасибо! Мы свяжемся в течение 24 часов.",
        note1: "Без карты", note2: "Ответ за 24 часа", note3: "NDA по запросу",
      },
    },
  },
  es: {
    translation: {
      nav: {
        learn: "Aprender", mentors: "Mentores", courses: "Cursos",
        product: "Producto", pricing: "Precios", bookDemo: "Reservar demo",
        login: "Iniciar sesión", signup: "Registrarse",
        cta: "Pruébalo gratis", demo: "Demo", price: "Precios",
      },
      hero: {
        badge: "Espacio de trabajo con IA",
        title: "Espacio de trabajo con IA para empresas",
        subtitle: "Automatiza flujos, conecta equipos y gestiona agentes IA en un solo espacio.",
        subtitle2: "Tareas, datos, herramientas y agentes — todo conectado.",
        cta: "Pruébalo gratis",
        cta2: "Reservar una demo",
        tagline: "Empieza hoy. Sin configuración compleja.",
      },
      newEra: {
        eyebrow: "El cambio",
        title: "Nueva era para los negocios",
        titleAccent: "con agentes de IA.",
        body1: "Los equipos ya no gestionan cada tarea manualmente. Los agentes organizan, analizan y automatizan — todo en un espacio.",
        body2: "Para empresas que quieren trabajar más inteligente y rápido.",
        pill1: "Organizar y analizar",
        pill2: "Apoyar operaciones",
        pill3: "Automatizar flujos",
      },
      features: {
        eyebrow: "Diseñado como piensas tú",
        title: "Un espacio.",
        titleAccent: "Todo conectado.",
        kb: { tag: "BASE DE CONOCIMIENTO", title: "Un cerebro para todo el equipo.", body: "Respuestas al instante desde tus docs y procesos." },
        reminders: { tag: "RECORDATORIOS INTELIGENTES", title: "Nunca pierdas un seguimiento.", body: "Los agentes avisan a la persona indicada." },
      },
      benefits: {
        eyebrow: "Beneficios",
        title: "Ahorra dinero. Ahorra tiempo.",
        titleAccent: "Automatiza procesos.",
        cards: {
          money: { title: "Ahorra dinero", body1: "Reduce costes automatizando la rutina.", body2: "Enfoca al equipo en estrategia y ventas." },
          time: { title: "Ahorra tiempo", body1: "Agentes 24/7 para informes y resúmenes.", body2: "Menos cambios de herramienta. Más resultados." },
          auto: { title: "Automatiza procesos", body1: "Convierte flujos diarios en sistemas automáticos.", body2: "De ventas y RRHH a operaciones y soporte." },
        },
      },
      audience: {
        eyebrow: "Para quién es",
        title: "Para equipos que",
        titleAccent: "avanzan.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Envía producto, no procesos." },
        entrepreneurs: { tag: "EMPRENDEDORES", title: "Emprendedores", body: "Los agentes hacen lo repetitivo." },
        ngo: { tag: "ONG", title: "ONG", body: "Más impacto con menos recursos." },
      },
      cta: {
        title1: "Solicita una", title2: "demo",
        subtitle: "30 minutos — te mostramos cómo encajan los agentes.",
        name: "Tu nombre", contact: "Email o Telegram", company: "Empresa (opcional)",
        submit: "Solicitar demo",
        thanks: "¡Gracias! Te contactaremos en 24 horas.",
        note1: "Sin tarjeta", note2: "Respuesta en 24h", note3: "NDA a petición",
      },
    },
  },
  de: {
    translation: {
      nav: {
        learn: "Lernen", mentors: "Mentoren", courses: "Kurse",
        product: "Produkt", pricing: "Preise", bookDemo: "Demo buchen",
        login: "Anmelden", signup: "Registrieren",
        cta: "Jetzt kostenlos testen", demo: "Demo", price: "Preise",
      },
      hero: {
        badge: "AI Agentic Workspace",
        title: "KI-Arbeitsplatz für Unternehmen",
        subtitle: "Automatisiere Workflows, verbinde Teams und verwalte KI-Agenten in einem Workspace.",
        subtitle2: "Aufgaben, Daten, Tools und Agenten — alles verbunden.",
        cta: "Jetzt kostenlos testen",
        cta2: "Demo buchen",
        tagline: "Starte heute. Keine komplexe Einrichtung.",
      },
      newEra: {
        eyebrow: "Der Wandel",
        title: "Neue Ära für Unternehmen",
        titleAccent: "mit KI-Agenten.",
        body1: "Teams müssen nicht mehr jede Routine manuell erledigen. KI-Agenten organisieren, analysieren und automatisieren — in einem Workspace.",
        body2: "Für Unternehmen, die smarter und schneller arbeiten wollen.",
        pill1: "Organisieren & analysieren",
        pill2: "Abläufe unterstützen",
        pill3: "Prozesse automatisieren",
      },
      features: {
        eyebrow: "So gebaut, wie ihr denkt",
        title: "Ein Workspace.",
        titleAccent: "Alles verbunden.",
        kb: { tag: "WISSENSDATENBANK", title: "Ein Gehirn für das ganze Team.", body: "Sofortige Antworten aus euren Dokumenten und Prozessen." },
        reminders: { tag: "SMARTE ERINNERUNGEN", title: "Kein Follow-up geht verloren.", body: "Agenten erinnern die richtige Person zur richtigen Zeit." },
      },
      benefits: {
        eyebrow: "Vorteile",
        title: "Geld sparen. Zeit sparen.",
        titleAccent: "Prozesse automatisieren.",
        cards: {
          money: { title: "Geld sparen", body1: "Kosten senken durch Automatisierung der Routine.", body2: "Fokus auf Strategie, Vertrieb und Entscheidungen." },
          time: { title: "Zeit sparen", body1: "Agenten arbeiten 24/7: Berichte, Zusammenfassungen, Updates.", body2: "Weniger Tool-Wechsel. Mehr Ergebnisse." },
          auto: { title: "Prozesse automatisieren", body1: "Alltägliche Workflows in Systeme verwandeln.", body2: "Von Vertrieb bis HR, Ops und Support." },
        },
      },
      audience: {
        eyebrow: "Für wen",
        title: "Für Teams, die",
        titleAccent: "sich bewegen.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Produkt liefern, nicht Prozesse." },
        entrepreneurs: { tag: "GRÜNDER", title: "Gründer", body: "Agenten übernehmen das Wiederkehrende." },
        ngo: { tag: "NGO", title: "NGOs", body: "Mehr Wirkung mit wenig Ressourcen." },
      },
      cta: {
        title1: "Fordert eine", title2: "Demo an",
        subtitle: "30 Minuten — wir zeigen, wie Agenten in euer Business passen.",
        name: "Euer Name", contact: "E-Mail oder Telegram", company: "Firma (optional)",
        submit: "Demo anfragen",
        thanks: "Danke! Wir melden uns innerhalb von 24 Stunden.",
        note1: "Ohne Karte", note2: "Antwort in 24h", note3: "NDA auf Anfrage",
      },
    },
  },
  fr: {
    translation: {
      nav: {
        learn: "Apprendre", mentors: "Mentors", courses: "Cours",
        product: "Produit", pricing: "Tarifs", bookDemo: "Réserver une démo",
        login: "Se connecter", signup: "S'inscrire",
        cta: "Essayer gratuitement", demo: "Demo", price: "Tarifs",
      },
      hero: {
        badge: "Espace de travail IA",
        title: "Espace de travail IA pour les entreprises",
        subtitle: "Automatisez les workflows, connectez les équipes et gérez les agents IA en un seul espace.",
        subtitle2: "Tâches, données, outils et agents — tout est connecté.",
        cta: "Essayer gratuitement",
        cta2: "Réserver une démo",
        tagline: "Commencez aujourd'hui. Sans configuration complexe.",
      },
      newEra: {
        eyebrow: "Le tournant",
        title: "Nouvelle ère pour les entreprises",
        titleAccent: "avec les agents IA.",
        body1: "Les équipes ne gèrent plus chaque routine à la main. Les agents IA organisent, analysent et automatisent — dans un seul espace.",
        body2: "Pour les entreprises qui veulent travailler plus vite et plus intelligemment.",
        pill1: "Organiser et analyser",
        pill2: "Soutenir les opérations",
        pill3: "Automatiser les flux",
      },
      features: {
        eyebrow: "Conçu comme vous pensez",
        title: "Un espace.",
        titleAccent: "Tout connecté.",
        kb: { tag: "BASE DE CONNAISSANCES", title: "Un cerveau pour toute l'équipe.", body: "Des réponses instantanées depuis vos docs et process." },
        reminders: { tag: "RAPPELS INTELLIGENTS", title: "Ne ratez plus un suivi.", body: "Les agents alertent la bonne personne au bon moment." },
      },
      benefits: {
        eyebrow: "Avantages",
        title: "Économisez de l'argent et du temps.",
        titleAccent: "Automatisez les processus.",
        cards: {
          money: { title: "Économisez de l'argent", body1: "Réduisez les coûts en automatisant la routine.", body2: "Concentrez l'équipe sur la stratégie et les ventes." },
          time: { title: "Gagnez du temps", body1: "Les agents travaillent 24/7 : rapports, résumés, mises à jour.", body2: "Moins de changements d'outil. Plus de résultats." },
          auto: { title: "Automatisez les processus", body1: "Transformez vos workflows en systèmes automatiques.", body2: "Des ventes aux RH, aux ops et au support." },
        },
      },
      audience: {
        eyebrow: "Pour qui",
        title: "Pour les équipes qui",
        titleAccent: "avancent.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Livrez du produit, pas du process." },
        entrepreneurs: { tag: "ENTREPRENEURS", title: "Entrepreneurs", body: "Les agents gèrent le répétitif." },
        ngo: { tag: "ONG", title: "ONG", body: "Plus d'impact avec peu de ressources." },
      },
      cta: {
        title1: "Demandez une", title2: "démo",
        subtitle: "30 minutes — on vous montre comment les agents s'intègrent.",
        name: "Votre nom", contact: "Email ou Telegram", company: "Entreprise (optionnel)",
        submit: "Demander la démo",
        thanks: "Merci ! Nous revenons vers vous sous 24 heures.",
        note1: "Sans carte", note2: "Réponse en 24h", note3: "NDA sur demande",
      },
    },
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: ["en", "ru", "es", "de", "fr"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
      },
    });
}

export const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
] as const;

export default i18n;
