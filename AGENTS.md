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

- Owner/admin = manager, everyone else = plain member. Enforce role checks server-side
  (`src/lib/roles.server.ts`) and in RLS (`private.is_teamspace_manager`), never only in the UI —
  hiding a nav item does not protect the data behind it.
- Members may only read their own work: task visibility is matched by assignee id and, for
  imported tracker tasks, by assignee name via `private.task_belongs_to_user` /
  `src/lib/task-visibility.server.ts`. Keep both implementations in sync.
- Payroll, financials, client database, integrations, HR analytics, other people's cards and other
  people's onboarding/quiz results are manager-only in both the server functions and RLS.

## Background client extraction

- Task writes only enqueue client extraction through the database trigger; the five-minute authenticated cron drains `client_sync_queue`, so AI and Google Sheets never delay task saves.
