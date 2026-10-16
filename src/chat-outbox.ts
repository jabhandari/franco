import { openDB } from "idb";
import type { ChatOutboxEntry } from "./types";
type ChatDatabase = {
  outbox: {
    key: string;
    value: ChatOutboxEntry;
    indexes: { "by-user": string };
  };
};
const db = () =>
  openDB<ChatDatabase>("franco-chat-v1", 1, {
    upgrade(database) {
      database
        .createObjectStore("outbox", { keyPath: "key" })
        .createIndex("by-user", "user_id");
    },
  });
export async function chatOutbox(userId: string): Promise<ChatOutboxEntry[]> {
  const database = await db();
  const rows = await database.getAllFromIndex("outbox", "by-user", userId);
  const expired = rows.filter(
    (row) => Date.now() - row.created_at > 28 * 86400000,
  );
  await Promise.all(expired.map((row) => database.delete("outbox", row.key)));
  return rows
    .filter((row) => !expired.includes(row))
    .sort((a, b) => a.created_at - b.created_at || a.key.localeCompare(b.key));
}
export async function queueChat(userId: string, channel: string, body: string) {
  const database = await db();
  const transaction = database.transaction("outbox", "readwrite");
  if ((await transaction.store.index("by-user").count(userId)) >= 100) {
    transaction.abort();
    throw new Error(
      "Your outbox is full. Remove failed messages before sending more.",
    );
  }
  const existing = await transaction.store.index("by-user").getAll(userId);
  const createdAt = Math.max(
    Date.now(),
    ...existing.map((row) => row.created_at + 1),
  );
  const id = crypto.randomUUID();
  await transaction.store.add({
    key: `${userId}:${id}`,
    user_id: userId,
    client_msg_id: id,
    channel,
    body,
    created_at: createdAt,
    status: "queued",
    error: "",
  });
  await transaction.done;
}
export async function failChat(entry: ChatOutboxEntry, error: string) {
  const database = await db();
  const transaction = database.transaction("outbox", "readwrite");
  if (await transaction.store.get(entry.key))
    await transaction.store.put({ ...entry, status: "failed", error });
  await transaction.done;
}
export async function discardChat(key: string) {
  const database = await db();
  await database.delete("outbox", key);
}
