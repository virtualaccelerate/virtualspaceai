# Notifications inventory (research only, no code changes)

Source: the code, plus real rows from the notifications table (last 7 days). No email notifications exist. Email is only used for sign-in and password reset. Most in-app bell items are also sent to Telegram, with the same title and text.

## 1. In-app bell + Telegram (same text)

| Type (7-day count) | Trigger | Who gets it | Real example |
|---|---|---|---|
| task_assigned (10) | Task assigned in the app or imported from YouGile/Trello | Assignee | "Вам назначена задача" / "+996 504 227 733 Элес \| тур на 2х… написать ей" |
| task_updated (2) | Assignee's task edited | Assignee | "Задача обновлена" / "заказать брендированные пакеты · Кто: Saltanat · Статус: done · Приоритет: urgent · Срок: 2026-11-03" |
| task_status_change (6) | Status changed | Assignee / creator | "Saltanat Sankubayeva изменил статус задачи" / "заказать брендированные пакеты · in_progress → done" |
| task_review (5) | Employee hands task in for review | Managers | "Задача сдана на проверку" / "Nuraim сдал(а) задачу… Пространство, Статус, Дедлайн" + Accept/Rework buttons |
| task_approved (5) / task_rework (1) | Manager accepts or returns a task | Assignee | "✅ Задача принята" / title, Пространство, Статус, Дедлайн, Проверил |
| task deleted | Task deleted | Assignee | task title only |
| Deadline in 3h / 1h | Hourly check | Assignee | "⏰ До дедлайна 3 часа" / task title |
| task_deadline (41) | Deadline reached | Assignee | "⏰ Наступил дедлайн задачи" / "Оценка качества ИИ-сигналов и рекомендации" + reschedule buttons |
| task_overdue (151) | Daily while overdue | Assignee | "🔴 Задача просрочена" / "Проверить Telegram-уведомления" |
| task_external_update (79) | YouGile/Trello change found by sync | Assignee | "Задача обновлена" / "Запуск… (Stories) — Статус: Чолпон ЗАДАЧИ → done (Trello)" |
| task_external_done (25) | Tracker task closed | Assignee | "Задача выполнена" / "Новая логика агентов… — выполнено (Trello)" |
| daily_brief (71) | Morning, AI-written | Each employee | "☀️ Просрочен отчет по продажам" / "Твоя задача «Отчет по продажам за день» просрочена на 2 дня…" |
| evening_brief (81) | Evening, AI-written | Each employee | "🌆 Итоги дня и просроченная задача" / "Сегодня не было закрытых задач…" |
| owner_brief (78), team_brief (37), project_brief (7) | Morning, AI-written | Owner / managers | "🏢 Обновление по Lucky Socks" / "За последние сутки новых задач не закрыто…" |
| agent_message (30) | Reminder the user set up with an AI agent (once or repeating) | The user who set it up | "🔁 Автоматическое напоминание" / "Не забудь завтра разобраться с каким-то билетом…" |

## 2. Telegram only
- **Виэй client digest:** sent at 09:00 to the employee responsible for the client, or to the assistant's owner. Example: "🔔 Напоминания по клиентам на сегодня". Items are grouped by birthday (🎂), subscription ending (⏳) and follow-up call (📞). Each item has the client name, reason, phone, sheet tab and a ready-made message to send.
- **КП (proposal):** sent to the person who asked for it after `/kp`. It contains a short summary, a link to open the proposal in the app, and the PDF file. It is not added to the in-app bell.
- **Bot replies:** menus, reports and task lists. These are answers to the user, not notifications.

## 3. Pop-up messages (toasts)
Short success/error pop-ups on about 18 screens, for example "Сохранено". They only confirm an action and have no details.

## 4. Onboarding
I found no notification for onboarding or training: nothing for a new course being assigned, a quiz finished, or a new member joining.

## What lacks useful details
1. **task_assigned:** no project, deadline, priority, who assigned it, or open button. The YouGile/Trello version is title only.
2. **3h / 1h / deadline / overdue:** title only. No deadline time, project, or how many days overdue. Overdue repeats every day with the same text (151 in 7 days).
3. **task_status_change:** shows raw codes like "in_progress → done" instead of names like "В работе → Готово". No project.
4. **task_updated:** shows the new values, not old → new. You can't tell what changed.
5. **task_external_update:** a messy text mix ("Чолпон ЗАДАЧИ → done") with raw status codes. No who changed it, no project, no link to the tracker.
6. **task_external_done:** no who closed it and no project.
7. **task deleted:** no who deleted it and no project.
8. **AI briefs (morning/evening/owner/team/project):** free AI text with no list of the tasks it talks about and no buttons. In the database, project briefs are not linked to a task.
9. **agent_message:** vague text, and in the database it is not linked to a task or client.
10. **КП:** never appears in the bell; you only get it in Telegram.
11. **Onboarding:** no notifications at all.
12. **In-app bell:** I didn't confirm whether every item is clickable and opens its task.
13. **Fine already:** review, accepted and rework messages (workspace, status, deadline, who checked, buttons) and the Виэй client digest.

## Possible next step (only if you approve)
- Use one standard layout for every task message: task, project, status name, deadline, who did it, old → new, and an "Открыть" button.
- Make the overdue text show how many days late it is.
- Add a list of the tasks under each AI brief.
