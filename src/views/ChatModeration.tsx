import React, { useState } from "react";
import { Box, Text, Field, Button, ErrorMessage } from "../components/ui";
import { apiGet, apiPost } from "../api/client";
import type { ChatModMessage } from "../types";
export function ChatModeration() {
  const [key, setKey] = useState("");
  const [messages, setMessages] = useState<ChatModMessage[]>([]);
  const [reason, setReason] = useState("other");
  const [duration, setDuration] = useState("3600");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await apiGet<{ messages: ChatModMessage[] }>(
        "/api/chat/moderation",
        null,
        { apiKey: key },
      );
      setMessages(result.messages);
      setLoaded(true);
    } catch (e) {
      setMessages([]);
      setLoaded(false);
      setError(
        e instanceof Error ? e.message : "Could not load moderation queue.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function act(id: string, action: string) {
    setBusy(true);
    try {
      await apiPost(
        "/api/chat/moderation/actions",
        { message_id: id, action, reason, duration_seconds: Number(duration) },
        null,
        { apiKey: key },
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Box className="chat-welcome">
      <Text as="h1">Chat moderation</Text>
      <Text as="p">
        Internal access. Use the dedicated chat moderator key. Every action
        records its reason and actor; audit records contain no message text.
      </Text>
      <Field
        label="Moderator key"
        type="password"
        autoComplete="off"
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setMessages([]);
          setLoaded(false);
        }}
      />
      <Button
        disabled={!key || busy}
        onClick={() => {
          void load();
        }}
      >
        Load queue
      </Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Field
        label="Action reason: harassment, hate, spam, personal_information, sexual_or_graphic, unsafe_link, other"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Field
        label="Mute duration in seconds (60–2592000)"
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />
      {loaded && !messages.length && (
        <Text as="p" role="status">
          No messages need review.
        </Text>
      )}
      {messages.map((message) => (
        <Box key={message.id} className="chat-moderation-card">
          <Text as="h2">
            {message.display_name} · #{message.channel_id}
          </Text>
          <Text as="p" className="chat-message-body">
            {message.body}
          </Text>
          <Text as="p">
            {message.status} · score {message.toxicity_score ?? "pending"} ·{" "}
            {message.reports} reports ·{" "}
            {new Date(message.created_at).toLocaleString()}
          </Text>
          <Text as="p">
            Reasons:{" "}
            {message.reasons?.map((item) => item.reason).join(", ") ||
              "automated review"}
          </Text>
          {message.context?.length > 0 && (
            <Box>
              <Text as="h3">Nearby messages</Text>
              {message.context.map((item, index) => (
                <Box key={`${message.id}:${index}`}>
                  <Text as="strong">
                    {item.display_name} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                  <Text as="p" className="chat-message-body">
                    {item.body}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
          <Box className="chat-actions">
            {["dismiss", "delete", "mute", "ban"].map((action) => (
              <Button
                key={action}
                variant="text"
                disabled={busy}
                onClick={() => {
                  if (
                    (action !== "ban" && action !== "delete") ||
                    window.confirm(
                      `${action} this ${action === "ban" ? "member" : "message"}?`,
                    )
                  )
                    void act(message.id, action);
                }}
              >
                {action}
              </Button>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
