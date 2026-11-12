import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { isGuildMessageAcknowledged, sameMessageVersion } from "../lib/guild-message.ts";

const message = {
  id: "2bba24c4-9626-4523-a532-a9334c26b2ad",
  updated_at: "2026-11-12T02:22:43.849623+00:00",
};

test("a Got it mark only counts for the same message id and updated_at", () => {
  const mark = { message_id: message.id, message_updated_at: message.updated_at };
  assert.equal(isGuildMessageAcknowledged(message, mark), true);
  assert.equal(sameMessageVersion(message.updated_at, "2026-11-12T02:22:43.849623Z"), true);
});

test("an edit that only bumps updated_at reopens the message", () => {
  const dismissed = { message_id: message.id, message_updated_at: message.updated_at };
  assert.equal(isGuildMessageAcknowledged(message, dismissed), true);
  const edited = { ...message, updated_at: "2026-11-12T03:10:00.000Z" };
  assert.equal(isGuildMessageAcknowledged(edited, dismissed), false);
  const acknowledgedAgain = { message_id: message.id, message_updated_at: edited.updated_at };
  assert.equal(isGuildMessageAcknowledged(edited, acknowledgedAgain), true);
});

test("a mark for another message or a missing version does not collapse this one", () => {
  assert.equal(isGuildMessageAcknowledged(message, null), false);
  assert.equal(isGuildMessageAcknowledged(message, { message_id: message.id, message_updated_at: null }), false);
  assert.equal(isGuildMessageAcknowledged(message, { message_id: "00000000-0000-0000-0000-000000000000", message_updated_at: message.updated_at }), false);
});

test("the Hall and the Got it action key the dismissal to id plus updated_at", () => {
  const hall = readFileSync(new URL("../app/guild-hall/page.tsx", import.meta.url), "utf8");
  const action = readFileSync(new URL("../app/message-actions.ts", import.meta.url), "utf8");
  const card = readFileSync(new URL("../components/hall/MessageFromAaron.tsx", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/20261112030929_guild_message_read_version.sql", import.meta.url), "utf8");
  assert.equal(hall.includes("isGuildMessageAcknowledged"), true);
  assert.equal(hall.includes("updated_at"), true);
  assert.equal(action.includes("message_updated_at"), true);
  assert.equal(action.includes("sameMessageVersion"), true);
  assert.equal(card.includes("markGuildMessageRead(id, updatedAt)"), true);
  assert.equal(migration.includes("message_updated_at"), true);
  assert.equal(migration.includes("touch_guild_message"), true);
});
