# Edit Trello tasks in Virtual Space

## Changes
- Allow Trello cards to open the existing task editor while keeping YouGile read-only.
- Show the Edit action for Trello cards in the task details dialog.
- Send title, description, status, assignee, and due-date changes to Trello before saving the local mirrored task.
- Resolve workspace statuses to Trello lists and workspace assignees to Trello board members using the existing connection mappings.
- Keep existing workspace membership and role checks unchanged.

## Files
- `src/routes/_authenticated/app.tasks.tsx`
- `src/components/TaskDetailDialog.tsx`
- `src/lib/tasks.server.ts`
- `src/lib/trello.server.ts`
- `roadmap.md` only to track completion

## Verification
- Confirm a Trello task opens in the editor and saves the five requested fields.
- Confirm YouGile tasks remain read-only.
- Verify the project builds cleanly.
