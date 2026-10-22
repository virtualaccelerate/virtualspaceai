# Safe voice-input recovery

## Confirmed issue
An AI credit or access error saves a persistent pause shared by web chat and Telegram. No owner recovery action currently exists. Removing the pause automatically would violate the required safeguards for denied model access.

## Proposed change
- Add an explicit recovery action restricted to the application's authorized owner, not every teamspace owner: this pause affects all customers.
- Display the saved safe error and distinguish credit/policy blocks from provider access denials.
- Credit/policy blocks: permit one bounded recovery check only after the authorized owner requests it. Keep the pause if the service remains blocked.
- Provider access denials: no automatic expiry or probes. Clear only after restored access has been confirmed and the authorized owner explicitly resumes the affected model. Subsequent transcription requires a fresh user request.
- Keep the exact existing models, metadata-only logs, role protections, and shared web/Telegram behavior.
- Existing unclassified pause records remain blocked until explicitly reviewed; do not infer restored access from elapsed time.

## Technical details
- Add server-side recovery authorization against the application's protected owner/admin identity; workspace ownership alone must not authorize global recovery.
- Add additive pause classification metadata if needed; do not rewrite the existing migration or delete customer data.
- Separate workspace credit/policy pause handling from persistent provider-denial handling in the shared STT module and remove duplicate writes that erase the distinction.
- Connect a small owner-only recovery control to an authenticated server function. Preserve upstream status and safe error messages.

## Verification
- Automated tests for unauthorized recovery, explicit authorized recovery, persistent provider denial, failed recovery retaining the pause, and restored access requiring a fresh request.
- Use isolated pause fixtures rather than disrupting production voice input.
- Verify the owner recovery control and subsequent transcription with the configured model after access is available; stop on any terminal denial.

## Already completed
The notification popup display is now mounted once for all pages. AI-chat edits without an assignee instruction no longer invoke the assignee picker, so status/deadline edits omit assignment fields. All 26 assignment checks pass; a signed-in popup and its action were verified. Live AI-generated task editing was not exercised.