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
- Pilot checks use a dedicated per-workspace table and authenticated evidence RPC; a trigger stamps checker/date, RLS restricts unchecking and finance to managers, and retained unchecked rows prevent automatic rechecking of manager overrides.
- Financials tabs are URL-backed so pilot finance and payroll items open their respective sections directly.
- Global Telegram setup requires both active workspace ownership and the encrypted application-admin session; employees' done requests become review server-side, while a database trigger blocks direct approval/review forgery.
- Shared demo sign-in is removed; never reintroduce a public account password.
- Pending invitation email edits/deletes require workspace managers; reconciliation uses only a service-only fixed-search-path lookup of confirmed Auth email, never user-editable profile email, to prevent mailbox impersonation.

- Direct membership INSERT is revoked for browser roles; creation adds the owner via the database trigger and invite joins use the authenticated service-role server function, so public-key callers cannot grant themselves membership or elevated roles.
- Training definition INSERT/UPDATE/DELETE policies require `private.is_teamspace_manager`; member SELECT access stays intact so assigned employees can learn.

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
- Hourly task hooks also run Google Calendar synchronization through request-scoped waitUntil, separately from brief jobs and AI pauses, so automatic sync does not block the Worker response.
- Hourly task hooks run local deadline reminders independently of AI access pauses; deadline-window claims use task_reminders and AI delivery suppresses separately reminded tasks.
- Daily briefs enqueue bounded workspace jobs with durable leases and terminal AI pause state; request-scoped waitUntil handles delivery while wake-on-enqueue retries unschedule after drain.
- Tracker syncs collect notification intents per invocation and flush through an atomic database dedupe/summary function; real task events, not sync write timestamps, define daily completion facts.
- YouGile operations use an invocation-local budget counting only YouGile HTTP time (fresh per source; larger for background), never a cross-request queue; sync reads company-wide 1000-row lists filtered locally (YouGile rate limit), mirrors only open tasks in batched upserts, hides closed/missing copies via `external_archived` (never deletes) and requires a complete snapshot before reconciliation.

- AI task assignment uses the shared exact/case-form member resolver and explicit account-id pickers; ambiguous names must never select the first member or become assignment labels.
- AI-chat update cards resolve assignment only for explicit assignee tokens; unrelated edits omit assignment fields to preserve imported labels and non-visible assignees.
- Mount the shared Sonner Toaster once in the root provider so notification and action popups render across routes.
- Telegram assignment callbacks encode UUIDs compactly and call the common task update service, so callbacks enforce membership, roles, notifications and tracker sync without transient server memory.

- Task writes only enqueue client extraction through the database trigger; the five-minute authenticated cron drains `client_sync_queue`, so AI and Google Sheets never delay task saves.

- WhatsApp bot (`src/lib/whatsapp.server.ts`) keeps its own copy of the Telegram task-agent logic instead of a shared helper — avoids regressions in the production Telegram path.

- Voice recognition uses one server-only STT module with centralized models, per-attempt metadata-only logging, and persistent terminal access pauses. Global recovery uses the protected application-admin session, never workspace ownership: classified workspace blocks allow one explicit access check, provider/unknown pauses require restored-access confirmation without probing. Compare pause tokens when clearing so concurrent denials remain blocked; resume only on a fresh user recording.

- Task project/department values pass through `resolveTaskLabel` (projects.server) on every create/update, which strips stray "|"/ids and maps to the per-workspace `projects`/`departments` directory — AI token splitting once leaked separators and workspace ids into these fields.
- Task label presentation uses browser-safe `taskLabelDisplay` to suppress UUID chips without mutating stored data.
- Auth screens wait for client initialization and share `AuthLoading`; protected routes still validate the user and workspace membership before rendering.
- Local task comments reuse task_events with author-only soft edits/deletes and deduplicated notifications; tracker discussions remain read-only to avoid unintended external writes.
- Telegram migrations use a service-only atomic merge preserving the original group identity and inactive aliases; verify Telegram migration IDs rather than merging by title to prevent cross-group linking.
- WhatsApp groups (WAHA) reuse `telegram_groups`/`telegram_group_messages` with a `provider` column and the same `processGroup`; replies go through `groupSend` so both messengers share one extraction path.
