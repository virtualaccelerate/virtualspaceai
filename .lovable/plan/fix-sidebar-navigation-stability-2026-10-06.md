# Fix sidebar navigation stability

## What will change
- Keep the application sidebar in the existing authenticated layout so one sidebar instance wraps every `/app` page.
- Make the desktop sidebar fixed instead of switching to sticky positioning, and reserve matching layout space beside it so page content never shifts underneath it.
- Reuse the same width value for the fixed panel and its spacer, while retaining the saved collapsed/expanded preference.
- Keep the sidebar navigation element mounted across child-route changes so its scroll position remains unchanged.

## Scope
- Change only `src/routes/_authenticated/route.tsx`.
- Do not modify page content, navigation destinations, or business logic.

## Verification
- Navigate between several `/app` pages and confirm the sidebar does not remount, jump, cover content, or reset its scroll/collapsed state.
- Check desktop and mobile layouts and confirm the preview build remains clean.
