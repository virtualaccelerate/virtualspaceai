import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      nav: { learn: "Product", price: "Pricing", demo: "Get Demo" },
      hero: {
        badge: "AI Agentic Workspace",
        title1: "A new era",
        title2: "for business",
        title3: "with AI agents.",
        subtitle: "One workspace where autonomous agents run operations, sales and support — 24/7, without burning out.",
        cta: "Get a demo",
        learn: "Explore product",
      },
      features: {
        eyebrow: "Built for the way you work",
        title: "Your second brain,",
        titleAccent: "always on.",
        kb: {
          tag: "KNOWLEDGE BASE",
          title: "One brain for the whole team.",
          body: "@Brain instantly answers any employee question from your docs, chats and processes — no more repeated onboarding.",
        },
        owner: {
          tag: "OWNER'S SECOND BRAIN",
          title: "Everything the founder needs — in one thread.",
          body: "Metrics, decisions, meeting notes, priorities. Agents summarize the business each morning and flag what needs you.",
        },
        reminders: {
          tag: "SMART REMINDERS",
          title: "Never miss a follow-up again.",
          body: "Agents watch conversations and deals, then nudge the right person at the right time with the right context.",
        },
      },
      value: {
        eyebrow: "Why teams switch",
        title: "Save money. Save time.",
        titleAccent: "Ship faster.",
        cards: {
          money: { title: "Save money", body: "Replace repetitive hours with agents that cost cents to run — cut operating costs up to 70%." },
          time: { title: "24/7 uptime", body: "Agents work while you sleep. Customers get answers in seconds, always." },
          auto: { title: "Automations", body: "Compose multi-step workflows across your tools with no code. Trigger, decide, act, report." },
        },
      },
      audience: {
        eyebrow: "Who it's for",
        title: "Built for teams that",
        titleAccent: "move.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Do the work of a 20-person team from day one. Ship product, not process." },
        entrepreneurs: { tag: "ENTREPRENEURS", title: "Entrepreneurs", body: "Run sales, support and ops solo. Agents handle the repeatable." },
        ngo: { tag: "NGO", title: "NGOs", body: "Amplify impact with limited resources. Automate donor comms and reporting." },
      },
      cta: {
        title1: "Request a",
        title2: "demo",
        subtitle: "30 minutes — we'll show how agents close the 3 most expensive tasks in your business.",
        name: "Your name",
        contact: "Email or Telegram",
        company: "Company (optional)",
        submit: "Request demo",
        thanks: "Thanks! We'll reach out within 24 hours.",
        note1: "No card required", note2: "24h reply", note3: "NDA on request",
      },
    },
  },
  ru: {
    translation: {
      nav: { learn: "Продукт", price: "Тарифы", demo: "Демо" },
      hero: {
        badge: "AI Agentic Workspace",
        title1: "Новая эра",
        title2: "для бизнеса",
        title3: "с ИИ-агентами.",
        subtitle: "Единое пространство, где автономные агенты ведут операции, продажи и поддержку — 24/7, без выгорания.",
        cta: "Получить демо",
        learn: "Изучить продукт",
      },
      features: {
        eyebrow: "Работает так, как думаете вы",
        title: "Ваш второй мозг,",
        titleAccent: "всегда на связи.",
        kb: {
          tag: "БАЗА ЗНАНИЙ",
          title: "Единый мозг для всей команды.",
          body: "@Brain мгновенно отвечает сотрудникам по вашим документам, чатам и процессам — забудьте о повторных онбордингах.",
        },
        owner: {
          tag: "ВТОРОЙ МОЗГ ВЛАДЕЛЬЦА",
          title: "Всё, что нужно основателю — в одной ленте.",
          body: "Метрики, решения, заметки со встреч, приоритеты. Каждое утро агенты собирают сводку и подсвечивают, что требует вас.",
        },
        reminders: {
          tag: "УМНЫЕ НАПОМИНАНИЯ",
          title: "Ни один follow-up не потеряется.",
          body: "Агенты следят за диалогами и сделками и вовремя пингуют нужного человека с нужным контекстом.",
        },
      },
      value: {
        eyebrow: "Почему переходят к нам",
        title: "Экономьте деньги и время.",
        titleAccent: "Растите быстрее.",
        cards: {
          money: { title: "Экономия", body: "Замените повторяемые часы работой агентов за копейки — минус до 70% операционных расходов." },
          time: { title: "24/7 без пауз", body: "Агенты работают, пока вы спите. Клиенты получают ответ за секунды." },
          auto: { title: "Автоматизации", body: "Собирайте многошаговые сценарии между сервисами без кода. Триггер, решение, действие, отчёт." },
        },
      },
      audience: {
        eyebrow: "Кому подходит",
        title: "Для команд, которые",
        titleAccent: "движутся.",
        startups: { tag: "СТАРТАПЫ", title: "Стартапам", body: "Работа команды из 20 человек с первого дня. Делайте продукт, а не процессы." },
        entrepreneurs: { tag: "ПРЕДПРИНИМАТЕЛИ", title: "Предпринимателям", body: "Ведите продажи, поддержку и операционку в одиночку. Агенты закрывают рутину." },
        ngo: { tag: "НПО", title: "НПО", body: "Больший эффект при ограниченных ресурсах. Автоматизируйте коммуникации и отчёты." },
      },
      cta: {
        title1: "Оставьте заявку",
        title2: "на демо",
        subtitle: "30 минут — покажем, как агенты закроют 3 самые дорогие задачи вашего бизнеса.",
        name: "Ваше имя",
        contact: "Email или Telegram",
        company: "Компания (необязательно)",
        submit: "Запросить демо",
        thanks: "Спасибо! Мы свяжемся в течение 24 часов.",
        note1: "Без карты", note2: "Ответ за 24 часа", note3: "NDA по запросу",
      },
    },
  },
  es: {
    translation: {
      nav: { learn: "Producto", price: "Precios", demo: "Demo" },
      hero: {
        badge: "Espacio de trabajo con IA",
        title1: "Una nueva era",
        title2: "para el negocio",
        title3: "con agentes IA.",
        subtitle: "Un solo espacio donde agentes autónomos gestionan operaciones, ventas y soporte — 24/7, sin agotarse.",
        cta: "Solicitar demo",
        learn: "Ver producto",
      },
      features: {
        eyebrow: "Diseñado como piensas tú",
        title: "Tu segundo cerebro,",
        titleAccent: "siempre activo.",
        kb: { tag: "BASE DE CONOCIMIENTO", title: "Un cerebro para todo el equipo.", body: "@Brain responde al instante a cualquier empleado con tus documentos, chats y procesos." },
        owner: { tag: "SEGUNDO CEREBRO DEL DUEÑO", title: "Todo lo que el fundador necesita, en un hilo.", body: "Métricas, decisiones, notas y prioridades. Los agentes resumen el negocio cada mañana." },
        reminders: { tag: "RECORDATORIOS INTELIGENTES", title: "Nunca pierdas un seguimiento.", body: "Los agentes vigilan conversaciones y avisan a la persona indicada en el momento justo." },
      },
      value: {
        eyebrow: "Por qué eligen cambiar",
        title: "Ahorra dinero y tiempo.",
        titleAccent: "Crece más rápido.",
        cards: {
          money: { title: "Ahorra dinero", body: "Cambia horas repetitivas por agentes que cuestan céntimos — hasta 70% menos de costes." },
          time: { title: "24/7 sin pausa", body: "Los agentes trabajan mientras duermes. Los clientes reciben respuesta en segundos." },
          auto: { title: "Automatizaciones", body: "Crea flujos entre tus herramientas sin código. Activa, decide, actúa, reporta." },
        },
      },
      audience: {
        eyebrow: "Para quién es",
        title: "Para equipos que",
        titleAccent: "avanzan.",
        startups: { tag: "STARTUPS", title: "Startups", body: "El trabajo de un equipo de 20 desde el día uno. Envía producto, no procesos." },
        entrepreneurs: { tag: "EMPRENDEDORES", title: "Emprendedores", body: "Lleva ventas, soporte y operaciones solo. Los agentes hacen lo repetitivo." },
        ngo: { tag: "ONG", title: "ONG", body: "Amplifica el impacto con recursos limitados. Automatiza donantes y reportes." },
      },
      cta: {
        title1: "Solicita una",
        title2: "demo",
        subtitle: "30 minutos — te mostramos cómo los agentes cierran las 3 tareas más costosas de tu negocio.",
        name: "Tu nombre",
        contact: "Email o Telegram",
        company: "Empresa (opcional)",
        submit: "Solicitar demo",
        thanks: "¡Gracias! Te contactaremos en 24 horas.",
        note1: "Sin tarjeta", note2: "Respuesta en 24h", note3: "NDA a petición",
      },
    },
  },
  de: {
    translation: {
      nav: { learn: "Produkt", price: "Preise", demo: "Demo" },
      hero: {
        badge: "AI Agentic Workspace",
        title1: "Eine neue Ära",
        title2: "für Unternehmen",
        title3: "mit KI-Agenten.",
        subtitle: "Ein Arbeitsplatz, an dem autonome Agenten Betrieb, Vertrieb und Support übernehmen — 24/7, ohne Burnout.",
        cta: "Demo anfragen",
        learn: "Produkt entdecken",
      },
      features: {
        eyebrow: "So gebaut, wie ihr denkt",
        title: "Euer zweites Gehirn,",
        titleAccent: "immer aktiv.",
        kb: { tag: "WISSENSDATENBANK", title: "Ein Gehirn für das ganze Team.", body: "@Brain beantwortet sofort jede Mitarbeiterfrage aus euren Dokumenten, Chats und Prozessen." },
        owner: { tag: "ZWEITES GEHIRN DES INHABERS", title: "Alles, was der Gründer braucht — in einem Feed.", body: "Kennzahlen, Entscheidungen, Notizen. Agenten fassen das Business jeden Morgen zusammen." },
        reminders: { tag: "SMARTE ERINNERUNGEN", title: "Kein Follow-up geht mehr verloren.", body: "Agenten beobachten Gespräche und Deals und stupsen zur richtigen Zeit die richtige Person an." },
      },
      value: {
        eyebrow: "Warum Teams wechseln",
        title: "Geld und Zeit sparen.",
        titleAccent: "Schneller liefern.",
        cards: {
          money: { title: "Geld sparen", body: "Ersetzt repetitive Stunden durch Agenten für Cent-Beträge — bis zu 70% weniger Kosten." },
          time: { title: "24/7 Uptime", body: "Agenten arbeiten, während ihr schlaft. Kunden bekommen Antworten in Sekunden." },
          auto: { title: "Automatisierungen", body: "Mehrstufige Workflows ohne Code zwischen euren Tools. Auslösen, entscheiden, handeln." },
        },
      },
      audience: {
        eyebrow: "Für wen",
        title: "Für Teams, die",
        titleAccent: "sich bewegen.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Die Arbeit eines 20-Personen-Teams ab Tag eins. Produkt liefern, nicht Prozesse." },
        entrepreneurs: { tag: "GRÜNDER", title: "Gründer", body: "Vertrieb, Support und Ops alleine führen. Agenten übernehmen das Wiederkehrende." },
        ngo: { tag: "NGO", title: "NGOs", body: "Mehr Wirkung mit wenig Ressourcen. Spendenkommunikation und Berichte automatisieren." },
      },
      cta: {
        title1: "Fordert eine",
        title2: "Demo an",
        subtitle: "30 Minuten — wir zeigen, wie Agenten die 3 teuersten Aufgaben eures Business schließen.",
        name: "Euer Name",
        contact: "E-Mail oder Telegram",
        company: "Firma (optional)",
        submit: "Demo anfragen",
        thanks: "Danke! Wir melden uns innerhalb von 24 Stunden.",
        note1: "Ohne Karte", note2: "Antwort in 24h", note3: "NDA auf Anfrage",
      },
    },
  },
  fr: {
    translation: {
      nav: { learn: "Produit", price: "Tarifs", demo: "Demo" },
      hero: {
        badge: "Espace de travail IA",
        title1: "Une nouvelle ère",
        title2: "pour l'entreprise",
        title3: "avec des agents IA.",
        subtitle: "Un seul espace où des agents autonomes gèrent les opérations, les ventes et le support — 24/7, sans épuisement.",
        cta: "Demander une démo",
        learn: "Voir le produit",
      },
      features: {
        eyebrow: "Conçu comme vous pensez",
        title: "Votre second cerveau,",
        titleAccent: "toujours actif.",
        kb: { tag: "BASE DE CONNAISSANCES", title: "Un cerveau pour toute l'équipe.", body: "@Brain répond instantanément à chaque collaborateur depuis vos docs, chats et process." },
        owner: { tag: "SECOND CERVEAU DU DIRIGEANT", title: "Tout ce dont le fondateur a besoin — dans un seul fil.", body: "Métriques, décisions, notes, priorités. Les agents résument l'activité chaque matin." },
        reminders: { tag: "RAPPELS INTELLIGENTS", title: "Ne ratez plus jamais un suivi.", body: "Les agents surveillent conversations et deals et alertent la bonne personne au bon moment." },
      },
      value: {
        eyebrow: "Pourquoi ils changent",
        title: "Économisez argent et temps.",
        titleAccent: "Avancez plus vite.",
        cards: {
          money: { title: "Économies", body: "Remplacez les heures répétitives par des agents à quelques centimes — jusqu'à 70% de coûts en moins." },
          time: { title: "24/7 sans pause", body: "Les agents travaillent pendant que vous dormez. Vos clients ont une réponse en secondes." },
          auto: { title: "Automatisations", body: "Composez des workflows multi-étapes sans code. Déclencher, décider, agir, reporter." },
        },
      },
      audience: {
        eyebrow: "Pour qui",
        title: "Pour les équipes qui",
        titleAccent: "avancent.",
        startups: { tag: "STARTUPS", title: "Startups", body: "Le travail d'une équipe de 20 dès le premier jour. Livrez du produit, pas du process." },
        entrepreneurs: { tag: "ENTREPRENEURS", title: "Entrepreneurs", body: "Menez ventes, support et ops en solo. Les agents gèrent le répétitif." },
        ngo: { tag: "ONG", title: "ONG", body: "Amplifiez l'impact avec peu de ressources. Automatisez donateurs et rapports." },
      },
      cta: {
        title1: "Demandez une",
        title2: "démo",
        subtitle: "30 minutes — on vous montre comment les agents ferment les 3 tâches les plus coûteuses.",
        name: "Votre nom",
        contact: "Email ou Telegram",
        company: "Entreprise (optionnel)",
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
