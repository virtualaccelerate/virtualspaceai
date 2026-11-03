# WhatsApp / WAHA: research findings (no code changes)

## 1. How WhatsApp works today
There are two separate WhatsApp paths:

**A. WAHA (WhatsApp groups, "move to public")**
- Files: `src/lib/waha.server.ts` (sends messages, looks up phone numbers), `src/lib/waha-payload.ts` (reads incoming events, checks the secret), `src/lib/telegram-groups.server.ts` (the shared group logic Telegram also uses: `handleWahaMessage`, extracting tasks/clients from chats, welcome/link-code replies), `src/routes/api/public/waha-webhook.ts`.
- Settings it reads: `WAHA_URL`, `WAHA_API_KEY`, `WAHA_WEBHOOK_SECRET`, `WAHA_SESSION` (optional, defaults to `default`).
- **None of these 4 are set in the project secrets.** So the host is not localhost, ngrok or an IP. It is simply empty, and the code has no hardcoded host.
- Webhook WAHA calls: `POST /api/public/waha-webhook?secret=<WAHA_WEBHOOK_SECRET>`. Only `message` / `message.any` events are handled.
- Calls to WAHA: `POST {WAHA_URL}/api/sendText` and `GET {WAHA_URL}/api/{session}/lids/{lid}`, both with the `X-Api-Key` header.
- What it's used for: receiving group messages, then saving them, linking a group to a workspace with a code, extracting tasks and clients, and bot replies in the group. It does not send task notifications.

**B. Meta WhatsApp Cloud API (the separate 1:1 bot)**
- Files: `src/lib/whatsapp.server.ts`, `whatsapp.functions.ts`, `src/routes/api/public/whatsapp/webhook.ts`.
- Secrets that are set: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_DISPLAY_PHONE_NUMBER`. `WHATSAPP_VERIFY_TOKEN` is **missing**, so Meta's webhook check (GET) will always get 403.
- This path doesn't use WAHA and isn't affected by the move.

## 2. What is broken now (real evidence)
- WAHA is fully switched off. With no settings, every call to the webhook returns **503** with "WhatsApp-группы отключены: задайте WAHA_URL, WAHA_API_KEY и WAHA_WEBHOOK_SECRET.", and `sendText` throws the same message.
- Database: there are **0 WhatsApp groups** in total (only 4 Telegram groups) and **0 WhatsApp group messages in the last 7 days**. So nothing has ever been received from WAHA.
- I found no connection-refused or timeout errors. The app never tries to reach WAHA because the address isn't set. The likely history: WAHA ran on someone's local machine, which the published app can't reach, and its settings were never added here.

## 3. What must change for a public WAHA
1. Add these secrets (Project Settings → Secrets):
   - `WAHA_URL` = the public HTTPS address, e.g. `https://waha.example.com` (no trailing slash)
   - `WAHA_API_KEY` = the same value as `WHATSAPP_API_KEY` on the WAHA server
   - `WAHA_WEBHOOK_SECRET` = a long random string
   - `WAHA_SESSION` = only needed if the session name isn't `default`
2. Webhook to set on WAHA (session config or `WHATSAPP_HOOK_URL`):
   `https://ai-virtualspace.com/api/public/waha-webhook?secret=<WAHA_WEBHOOK_SECRET>`, with events `message` (or `message.any`).
   The app must be **published** first, because preview addresses won't work.
3. CORS: not needed. Both sides talk server-to-server. Our side checks the `?secret=`, and WAHA checks `X-Api-Key`.
4. Scan the QR again: start the session on the new server and scan it with the bot's phone. The old local session can't be reused unless its sessions folder is copied over.
5. After the move, add the bot to a group and send the link code, so the group is saved as a "whatsapp" group.
6. Nothing in the code points to localhost, so no code changes are needed.
7. (Separate) Add `WHATSAPP_VERIFY_TOKEN` if the Meta bot should work too.

## 4. Public WAHA server checklist
- Docker image `devlikeapro/waha` (WEBJS engine; the payload reader is built for WEBJS). Use WAHA Plus if you need several sessions.
- Settings: `WHATSAPP_API_KEY=<key>`, `WHATSAPP_DEFAULT_ENGINE=WEBJS`, `WAHA_DASHBOARD_ENABLED=true` with `WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD` (do not keep the defaults), optional `WHATSAPP_HOOK_URL` + `WHATSAPP_HOOK_EVENTS=message`, `WHATSAPP_RESTART_ALL_SESSIONS=True`.
- A persistent volume `/app/.sessions`, so a restart doesn't need a new QR scan.
- HTTPS through a reverse proxy (Caddy/Nginx + Let's Encrypt) on a domain. Don't expose port 3000 directly.
- Always running: `restart: unless-stopped`, at least 1–2 GB RAM, logs collected.
- Firewall: open only 443. Keep the dashboard behind its password.

## Proposed next step (if approved)
No code changes needed. Once the server is ready and the 3 secrets are added, I publish, send a test message to the webhook, and confirm a test group connects. I would also like WAHA problems to show up in the logs more clearly.
