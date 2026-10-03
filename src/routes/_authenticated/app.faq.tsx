import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/app/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ по AI-агентам — Virtual Space" },
      { name: "description", content: "Ответы на частые вопросы о работе AI-ассистента и агентов Virtual Space." },
      { property: "og:title", content: "FAQ по AI-агентам — Virtual Space" },
      { property: "og:description", content: "Как ставить задачи, вызывать агентов и работать с документами через чат." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type QA = { q: string; a: string };
type Section = { title: string; items: QA[] };

const RU = {
  title: "FAQ по AI-агентам",
  subtitle: "Простыми словами о том, что умеет ассистент Virtual Space",
  search: "Поиск по вопросам…",
  empty: "Ничего не найдено",
  intro: [
    "Понимает живую речь — пишите как коллеге, без форм.",
    "Ничего не меняет молча — сначала показывает карточку, вы подтверждаете одним кликом.",
    "Не плодит дубликаты — если похожая задача уже есть, предупредит.",
    "Видит задачи, команду, базу знаний и подключённые таблицы вашего пространства.",
  ],
  sections: [
    {
      title: "Общее",
      items: [
        { q: "Что такое AI-ассистент Virtual Space?", a: "Это цифровой координатор команды. Он видит открытые задачи, загрузку коллег, документы базы знаний и подключённые таблицы, поэтому отвечает по делу и может сам предлагать действия." },
        { q: "Сделает ли ассистент что-то без моего согласия?", a: "Нет. Любое создание или изменение задачи, встречи или программы обучения приходит в виде карточки. Пока вы не нажмёте подтверждение, ничего не меняется." },
        { q: "На каком языке он отвечает?", a: "На языке вашего сообщения. Если вы пишете по-русски, ответ будет на русском, независимо от языка профиля." },
        { q: "Работает ли это в Telegram?", a: "Да. Подключите Telegram-бота в разделе «Telegram Bot» — там те же возможности, включая голосовые сообщения." },
      ],
    },
    {
      title: "Задачи",
      items: [
        { q: "Как поставить задачу коллеге?", a: "Напишите своими словами: «Создай задачу для Айзы: проверить билеты спикеров до пятницы, высокий приоритет». Ассистент сам найдёт человека по имени или нику, поставит дату и приоритет и покажет карточку." },
        { q: "Можно ли перенести срок или сменить ответственного?", a: "Да: «Перенеси дедлайн по презентации на понедельник», «Передай задачу с билетами Данияру», «Закрой задачу с отчётом». Ассистент найдёт задачу и предложит изменение." },
        { q: "Что будет, если я не указал срок или исполнителя?", a: "Ассистент задаст один короткий уточняющий вопрос и создаст задачу после ответа." },
        { q: "Как посмотреть свои задачи?", a: "Спросите «Какие у меня задачи?» или «Что у Айзы на этой неделе?». Ответ придёт коротким списком: название и срок, просрочки отмечены отдельно." },
        { q: "Можно отправить сразу список задач?", a: "Да, одним сообщением. Ассистент создаст отдельную карточку на каждый пункт и пропустит те, что уже есть на доске." },
      ],
    },
    {
      title: "Специализированные агенты",
      items: [
        { q: "Как вызвать агента?", a: "Напишите его тег в любом чате, например @delegation, или откройте раздел «AI Agents» и нажмите «Открыть» — начнётся отдельный диалог с этим агентом." },
        { q: "@tasks — Агент задач", a: "Ведёт задачи от постановки до закрытия: создаёт, назначает, переносит сроки, меняет статусы." },
        { q: "@delegation — Агент делегирования", a: "Даёте цель, например «Запустить промо курса» — он разбивает её на задачи и распределяет между теми, у кого меньше загрузка." },
        { q: "@project — Агент проекта", a: "Проверяет проект целиком: просрочки, задачи без срока или исполнителя, перегруженных людей — и предлагает исправленный план." },
        { q: "@knowledge — Агент знаний", a: "Ищет ответ в базе знаний и на Google Диске и даёт вывод со ссылкой на исходный файл." },
        { q: "@document — Агент документов", a: "Читает договор, ТЗ или регламент, выделяет сроки, суммы и обязательства и превращает их в задачи." },
        { q: "@research — Агент исследований", a: "Собирает информацию по теме, отделяет факты от предположений и даёт рекомендации со следующими шагами." },
        { q: "@contracts — Агент договоров", a: "Разбирает договор: краткая суть, риски с оценкой важности и конкретные правки." },
      ],
    },
    {
      title: "Документы, таблицы и встречи",
      items: [
        { q: "Как задать вопрос по документу?", a: "Загрузите файл в базу знаний или прикрепите в чат. Ассистент отвечает только по содержимому файлов и даёт кликабельную ссылку на источник. Если ответа в файлах нет, он так и скажет." },
        { q: "Можно спросить по Google-таблице?", a: "Да. Вставьте ссылку прямо в сообщение — таблица должна быть открыта по ссылке для просмотра. Ассистент прочитает все вкладки." },
        { q: "Видит ли ассистент мой Google Диск?", a: "Если вы подключили Google Диск в разделе «Integrations», ассистент находит нужные файлы по смыслу вопроса и читает их." },
        { q: "Как назначить встречу?", a: "Напишите «Назначь созвон с командой завтра в 15:00». Достаточно даты и времени — ассистент создаст событие в Google Календаре и пригласит названных коллег." },
        { q: "Может ли он подготовить онбординг или чек-лист?", a: "Да: «Создай онбординг для нового менеджера» — программа с этапами и чек-листами появится в разделе «Onboarding & Training»." },
      ],
    },
    {
      title: "Доступ и безопасность",
      items: [
        { q: "Что видят обычные участники?", a: "Только свои задачи. Зарплаты, финансы, база клиентов и чужие результаты доступны только руководителям." },
        { q: "Почему ассистент не нашёл файл?", a: "Возможно, файл не загружен в базу знаний или текст из него ещё не извлечён. Переиндексируйте файл в разделе «Knowledge Base»." },
      ],
    },
  ] as Section[],
};

const EN: typeof RU = {
  title: "AI Agents FAQ",
  subtitle: "What the Virtual Space assistant can do, in plain words",
  search: "Search questions…",
  empty: "Nothing found",
  intro: [
    "Understands plain language — write like you would to a colleague.",
    "Never changes anything silently — you confirm every action with one click.",
    "Avoids duplicates — warns you if a similar task already exists.",
    "Sees your workspace tasks, team, knowledge base and linked sheets.",
  ],
  sections: [
    {
      title: "General",
      items: [
        { q: "What is the Virtual Space AI assistant?", a: "A digital team coordinator. It sees open tasks, team workload, knowledge base files and linked sheets, so it answers to the point and proposes actions." },
        { q: "Will it do anything without my consent?", a: "No. Every new or changed task, meeting or training program arrives as a card. Nothing changes until you confirm." },
        { q: "Which language does it reply in?", a: "The language of your message." },
        { q: "Does it work in Telegram?", a: "Yes. Connect the bot in “Telegram Bot” — same features, including voice messages." },
      ],
    },
    {
      title: "Tasks",
      items: [
        { q: "How do I assign a task?", a: "Just write it: “Create a task for Aiza: check speaker tickets by Friday, high priority”. The assistant finds the person, sets the date and priority and shows a card." },
        { q: "Can I change a deadline or assignee?", a: "Yes: “Move the presentation deadline to Monday”, “Give the tickets task to Daniyar”, “Close the report task”." },
        { q: "What if I skip the deadline or assignee?", a: "It asks one short question and creates the task after you answer." },
        { q: "How do I see my tasks?", a: "Ask “What are my tasks?” or “What does Aiza have this week?” — you get a short list with deadlines, overdue items marked." },
        { q: "Can I send a whole list of tasks?", a: "Yes, in one message. Each item becomes its own card; items already on the board are skipped." },
      ],
    },
    {
      title: "Specialized agents",
      items: [
        { q: "How do I call an agent?", a: "Type its tag in any chat, e.g. @delegation, or open “AI Agents” and press “Open” to start a dedicated conversation." },
        { q: "@tasks — Task Agent", a: "Runs tasks end to end: creates, assigns, reschedules, moves statuses." },
        { q: "@delegation — Delegation Agent", a: "Give it a goal — it breaks it into tasks and assigns them to the least loaded people." },
        { q: "@project — Project Agent", a: "Reviews a whole project: overdue work, tasks without owner or date, overloaded people — and proposes a fixed plan." },
        { q: "@knowledge — Knowledge Agent", a: "Finds answers in the knowledge base and Google Drive and cites the source file." },
        { q: "@document — Document Agent", a: "Reads a contract, brief or policy, extracts deadlines, amounts and obligations and turns them into tasks." },
        { q: "@research — Research Agent", a: "Gathers information, separates facts from assumptions and recommends next steps." },
        { q: "@contracts — Contract Risk Agent", a: "Breaks down a contract: summary, risks with severity and concrete edits." },
      ],
    },
    {
      title: "Documents, sheets and meetings",
      items: [
        { q: "How do I ask about a document?", a: "Upload it to the knowledge base or attach it in chat. Answers come only from file contents, with a clickable source link." },
        { q: "Can I ask about a Google Sheet?", a: "Yes. Paste the link in your message — the sheet must be viewable by link. All tabs are read." },
        { q: "Does it see my Google Drive?", a: "If Google Drive is connected in “Integrations”, it finds relevant files and reads them." },
        { q: "How do I schedule a meeting?", a: "Write “Schedule a team call tomorrow at 3pm”. Date and time are enough — it creates a Google Calendar event." },
        { q: "Can it build onboarding or a checklist?", a: "Yes: “Create onboarding for a new manager” — it appears in “Onboarding & Training”." },
      ],
    },
    {
      title: "Access and security",
      items: [
        { q: "What do regular members see?", a: "Only their own tasks. Payroll, financials, client database and others’ results are manager-only." },
        { q: "Why couldn’t it find a file?", a: "The file may not be uploaded or its text not extracted yet. Re-index it in “Knowledge Base”." },
      ],
    },
  ],
};

function FaqPage() {
  const { i18n } = useTranslation();
  const c = i18n.language?.startsWith("en") ? EN : RU;
  const [q, setQ] = useState("");

  const sections = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return c.sections;
    return c.sections
      .map((sec) => ({ ...sec, items: sec.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(s)) }))
      .filter((sec) => sec.items.length);
  }, [q, c]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-foreground">{c.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{c.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {c.intro.map((line) => (
          <div key={line} className="rounded-xl border border-border bg-card/60 p-3 text-sm text-foreground">
            {line}
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.search} className="pl-9" />
      </div>

      {sections.length === 0 && <p className="text-sm text-muted-foreground">{c.empty}</p>}

      {sections.map((sec) => (
        <section key={sec.title} className="space-y-2">
          <h2 className="font-display text-lg text-foreground">{sec.title}</h2>
          <Accordion type="multiple" className="rounded-xl border border-border bg-card/60 px-4">
            {sec.items.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
