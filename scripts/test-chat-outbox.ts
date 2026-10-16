import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  chatOutbox,
  queueChat,
  discardChat,
  failChat,
} from "../src/chat-outbox.ts";
await queueChat("alice", "general", "Bonjour");
await queueChat("alice", "questions-aide", "Une question");
await queueChat("bob", "general", "Salut");
const alice = await chatOutbox("alice");
assert.equal(alice.length, 2);
assert.equal((await chatOutbox("bob")).length, 1);
assert.equal(alice[0].body, "Bonjour");
assert.notEqual(alice[0].client_msg_id, alice[1].client_msg_id);
// Re-opening the database preserves both payload and idempotency ID.
assert.deepEqual(await chatOutbox("alice"), alice);
await failChat(alice[0], "Muted after queueing");
assert.equal((await chatOutbox("alice"))[0].status, "failed");
assert.equal(
  (await chatOutbox("alice"))[0].client_msg_id,
  alice[0].client_msg_id,
);
await discardChat(alice[0].key);
assert.equal((await chatOutbox("alice")).length, 1);
assert.equal((await chatOutbox("bob")).length, 1);
console.log(
  "Chat outbox: durable IDs, ordering, account isolation, failures and removal pass.",
);
