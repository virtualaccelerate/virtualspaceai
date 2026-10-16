<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Workspace roles and access

- Workspace creation uses browser-safe setup helpers for legacy size mapping and automatic naming, with a dedicated locale bundle, so saved choices and translations stay consistent.

- Owner/admin = manager, everyone else = plain member. Enforce role checks server-side
  (`src/lib/roles.server.ts`) and in RLS (`private.is_teamspace_manager`), never only in the UI —
  hiding a nav item does not protect the data behind it.
- Members may only read their own work: task visibility is matched by assignee id and, for
  imported tracker tasks, by assignee name via `private.task_belongs_to_user` /
  `src/lib/task-visibility.server.ts`. Keep both implementations in sync.
- Payroll, financials, client database, integrations, HR analytics, other people's cards and other
  people's onboarding/quiz results are manager-only in both the server functions and RLS.

## Background client extraction

- AI task assignment uses the shared exact/case-form member resolver and explicit account-id pickers; ambiguous names must never select the first member or become assignment labels.
- Telegram assignment callbacks encode UUIDs compactly and call the common task update service, so callbacks enforce membership, roles, notifications and tracker sync without transient server memory.

- Task writes only enqueue client extraction through the database trigger; the five-minute authenticated cron drains `client_sync_queue`, so AI and Google Sheets never delay task saves.

- WhatsApp bot (`src/lib/whatsapp.server.ts`) keeps its own copy of the Telegram task-agent logic instead of a shared helper — avoids regressions in the production Telegram path.
