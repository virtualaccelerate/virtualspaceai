import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkWebhookSecret, newWhatsappGroupRow, parseEvent, shouldStore, whatsappWelcome } from "./waha-payload";
import { newGroupLinkCode } from "./telegram-groups";

const G = "120363000000000001@g.us";

describe("WAHA payload normalizer", () => {
  it("parses an incoming group message", () => {
    const m = parseEvent({ id: `false_${G}_ABC_77@lid`, timestamp: 1790000000, from: G, participant: "77@lid", body: " Сделай отчёт ", _data: { notifyName: "Айгерим", type: "chat" } });
    assert.equal(m.chatId, G); assert.equal(m.isGroup, true); assert.equal(m.fromMe, false);
    assert.equal(m.senderJid, "77@lid"); assert.equal(m.sender, "Айгерим"); assert.equal(m.body, "Сделай отчёт");
    assert.equal(m.ts, new Date(1790000000 * 1000).toISOString()); assert.equal(shouldStore(m), true);
  });
  it("ignores fromMe messages (chat taken from `to`)", () => {
    const m = parseEvent({ id: `true_${G}_X`, from: "1@lid", to: G, fromMe: true, body: "hi" });
    assert.equal(m.chatId, G); assert.equal(shouldStore(m), false);
  });
  it("ignores status@broadcast", () => {
    const m = parseEvent({ id: "false_status@broadcast_X", from: "status@broadcast", participant: "996555@c.us", body: "story" });
    assert.equal(m.isStatus, true); assert.equal(shouldStore(m), false);
  });
  it("media without caption becomes a placeholder body", () => {
    const m = parseEvent({ id: { _serialized: `false_${G}_M` }, from: G, participant: "996555123456@c.us", hasMedia: true, type: "image" });
    assert.equal(m.body, "[image]"); assert.equal(m.sender, "+996555123456");
  });
});

describe("WAHA webhook secret", () => {
  it("accepts only the exact secret", () => {
    assert.equal(checkWebhookSecret("s3cret-value", "s3cret-value"), true);
    assert.equal(checkWebhookSecret("s3cret-valuX", "s3cret-value"), false);
    assert.equal(checkWebhookSecret(null, "s3cret-value"), false);
    assert.equal(checkWebhookSecret("x", undefined), false);
  });
});

describe("unknown WhatsApp group", () => {
  it("becomes a pending row with a link code and one welcome text", () => {
    const code = newGroupLinkCode();
    const row = newWhatsappGroupRow(G, code, new Date("2026-10-27T10:00:00Z"));
    assert.equal(row.provider, "whatsapp"); assert.equal(row.status, "pending"); assert.equal(row.external_chat_id, G);
    assert.equal(row.link_code, code); assert.equal(row.bot_added_at, "2026-10-27T10:00:00.000Z");
    assert.ok(whatsappWelcome(code).includes(`Код привязки: ${code}`));
  });
});
