import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Text,
  Button,
  Field,
  Textarea,
  CheckRow,
  ErrorMessage,
  LoadingSpinner,
  ChatTimeline,
} from "../components/ui";
import { apiGet, apiPost, ApiError } from "../api/client";
import { chatOutbox, queueChat, discardChat, failChat } from "../chat-outbox";
import { useChatRealtime } from "../hooks/useChatRealtime";
import type {
  ChatBootstrap,
  ChatChannel,
  ChatHistory,
  ChatMessage,
  ChatOutboxEntry,
  ChatSendResult,
} from "../types";

const reasons = [
  "harassment",
  "hate",
  "spam",
  "personal_information",
  "sexual_or_graphic",
  "unsafe_link",
  "other",
];
export function Chat({
  token,
  userId,
}: {
  token: string;
  userId: string;
  key?: string;
}) {
  const [bootstrap, setBootstrap] = useState<ChatBootstrap | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void apiGet<ChatBootstrap>("/api/chat/bootstrap", token)
      .then((result) => {
        if (current) setBootstrap(result);
      })
      .catch((e) => {
        if (current)
          setError(e instanceof Error ? e.message : "Chat unavailable.");
      });
    return () => {
      current = false;
    };
  }, [token]);
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!bootstrap) return <LoadingSpinner />;
  if (!bootstrap.profile || !bootstrap.available)
    return (
      <ChatWelcome
        token={token}
        bootstrap={bootstrap}
        onAccepted={() => {
          void apiGet<ChatBootstrap>("/api/chat/bootstrap", token)
            .then(setBootstrap)
            .catch((e) =>
              setError(e instanceof Error ? e.message : "Chat unavailable."),
            );
        }}
      />
    );
  return (
    <ChatRoom
      key={userId}
      token={token}
      userId={userId}
      bootstrap={bootstrap}
      onAccessLost={setError}
    />
  );
}
function Guidelines({ guidelines }: { guidelines: string[] }) {
  return (
    <Box className="chat-guidelines">
      {guidelines.map((rule, i) => (
        <Text as="p" key={rule}>
          {i + 1}. {rule}
        </Text>
      ))}
    </Box>
  );
}
function ChatWelcome({
  token,
  bootstrap,
  onAccepted,
}: {
  token: string;
  bootstrap: ChatBootstrap;
  onAccepted: () => void;
}) {
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function join() {
    setBusy(true);
    setError("");
    try {
      await apiPost(
        "/api/chat/profile",
        {
          display_name: name,
          accept_guidelines: accepted,
          guidelines_version: bootstrap.guidelines_version,
        },
        token,
      );
      onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join chat.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Box className="chat-welcome">
      <Text as="h1">Un petit mot en français ?</Text>
      <Text as="p">
        A place for members to practise together. Choose a chat name that is
        different from your real name.
      </Text>
      {!bootstrap.available && (
        <Text as="p" role="status">
          Chat is getting ready. Community guidelines and live service setup
          must be approved before opening.
        </Text>
      )}
      <Text as="h2">
        Community guidelines
        {!bootstrap.guidelines_approved ? " · draft awaiting approval" : ""}
      </Text>
      <Guidelines guidelines={bootstrap.guidelines} />
      <Field
        label="Chat pseudonym"
        value={name}
        maxLength={24}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
      />
      <CheckRow
        label="I agree to these community guidelines"
        checked={accepted}
        onChange={() => setAccepted(!accepted)}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button
        disabled={
          !bootstrap.available || !accepted || name.trim().length < 3 || busy
        }
        onClick={() => {
          void join();
        }}
      >
        Enter chat
      </Button>
    </Box>
  );
}
function ChatRoom({
  token,
  userId,
  bootstrap,
  onAccessLost,
}: {
  token: string;
  userId: string;
  bootstrap: ChatBootstrap;
  key?: string;
  onAccessLost: (message: string) => void;
}) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [slug, setSlug] = useState("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [readSeq, setReadSeq] = useState<string | null>(null);
  const [outbox, setOutbox] = useState<ChatOutboxEntry[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [live, setLive] = useState(false);
  const [rules, setRules] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const slugRef = useRef(slug);
  slugRef.current = slug;
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const active = useRef(true);
  const flushing = useRef(false);
  const generation = useRef(0);
  const refreshRequest = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const loadOutbox = useCallback(async () => {
    const rows = await chatOutbox(userId);
    if (active.current) setOutbox(rows);
    return rows;
  }, [userId]);
  const loadChannels = useCallback(async () => {
    const result = await apiGet<{ channels: ChatChannel[] }>(
      "/api/chat/channels",
      token,
    );
    if (active.current) setChannels(result.channels);
  }, [token]);
  const refresh = useCallback(() => {
    if (slugRef.current !== slug) return;
    const current = generation.current;
    const request = ++refreshRequest.current;
    const floor = messagesRef.current[0]?.seq;
    async function catchUp() {
      let result = await apiGet<ChatHistory>(
        `/api/chat/channels/${slug}/messages`,
        token,
      );
      const marker = result.last_read_seq;
      let rows = result.messages;
      // Walk back to our oldest loaded message, closing gaps larger than one
      // page and picking up moderation changes to older messages as well.
      while (
        floor &&
        result.has_more &&
        result.before &&
        BigInt(result.before) > BigInt(floor)
      ) {
        if (
          !active.current ||
          current !== generation.current ||
          request !== refreshRequest.current ||
          slugRef.current !== slug
        )
          return;
        result = await apiGet<ChatHistory>(
          `/api/chat/channels/${slug}/messages?before=${result.before}`,
          token,
        );
        rows = [...result.messages, ...rows];
      }
      if (
        !active.current ||
        current !== generation.current ||
        request !== refreshRequest.current ||
        slugRef.current !== slug
      )
        return;
      setMessages((previous: ChatMessage[]) => {
        const merged = new Map<string, ChatMessage>(
          previous.map((message) => [message.id, message]),
        );
        rows.forEach((message) => merged.set(message.id, message));
        return [...merged.values()]
          .filter(
            (message) =>
              Date.now() - new Date(message.created_at).getTime() <
              28 * 86400000,
          )
          .sort((a, b) => (BigInt(a.seq) < BigInt(b.seq) ? -1 : 1));
      });
      setReadSeq((previous: string | null) => previous ?? marker);
      setBefore((previous: string | null) =>
        previous && result.before && BigInt(previous) < BigInt(result.before)
          ? previous
          : result.before,
      );
      setMore(result.has_more);
      setError("");
    }
    void catchUp().catch((e) => {
      if (
        active.current &&
        current === generation.current &&
        slugRef.current === slug
      ) {
        setError(e instanceof Error ? e.message : "Unable to load chat.");
        if (e instanceof ApiError && [401, 403].includes(e.status))
          onAccessLost(e.message);
      }
    });
    void loadChannels().catch((e) => {
      if (
        active.current &&
        e instanceof ApiError &&
        [401, 403].includes(e.status)
      )
        onAccessLost(e.message);
    });
  }, [token, slug, loadChannels, onAccessLost]);
  useEffect(() => {
    generation.current += 1;
    setMessages([]);
    setReadSeq(null);
    setBefore(null);
    setMore(false);
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      generation.current += 1;
      clearInterval(timer);
    };
  }, [refresh]);
  useChatRealtime(token, slug, refresh, setMembers, setLive);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine || !active.current) return;
    flushing.current = true;
    try {
      const pending = await loadOutbox();
      for (const entry of pending) {
        if (!active.current || !navigator.onLine) break;
        if (entry.status !== "queued") continue;
        try {
          const result = await apiPost<ChatSendResult>(
            `/api/chat/channels/${entry.channel}/messages`,
            { body: entry.body, client_msg_id: entry.client_msg_id },
            token,
          );
          await discardChat(entry.key);
          if (active.current) {
            if (result.french_nudge) setHint("Essaie en français ?");
            refreshRef.current();
          }
        } catch (e) {
          if (
            e instanceof ApiError &&
            [400, 401, 403, 404, 409, 413, 422].includes(e.status)
          )
            await failChat(entry, e.message);
          else break; // Preserve the same client ID across offline/rate-limit retries.
        }
        await loadOutbox();
      }
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error ? e.message : "Your outbox could not be opened.",
        );
    } finally {
      flushing.current = false;
    }
  }, [loadOutbox, token]);
  useEffect(() => {
    void flush();
    const timer = setInterval(() => {
      void flush();
    }, 10000);
    const online = () => {
      void flush();
      refresh();
    };
    window.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [flush, refresh]);
  const lastMarked = useRef("");
  const latestId = messages[messages.length - 1]?.id;
  const markLatest = useCallback(() => {
    if (!latestId || lastMarked.current === `${slug}:${latestId}`) return;
    lastMarked.current = `${slug}:${latestId}`;
    void apiPost(
      `/api/chat/channels/${slug}/read`,
      { message_id: latestId },
      token,
    )
      .then(loadChannels)
      .catch(() => {
        lastMarked.current = "";
      });
  }, [latestId, slug, token, loadChannels]);
  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await queueChat(userId, slug, body.trim());
      setBody("");
      setHint("");
      await loadOutbox();
      void flush();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save this message. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function older() {
    const current = generation.current;
    try {
      const result = await apiGet<ChatHistory>(
        `/api/chat/channels/${slug}/messages?before=${before}`,
        token,
      );
      if (current !== generation.current) return;
      setMessages((previous) => [
        ...result.messages.filter((m) => !previous.some((p) => p.id === m.id)),
        ...previous,
      ]);
      setBefore(result.before);
      setMore(result.has_more);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load older messages.",
      );
    }
  }
  async function action(
    id: string,
    operation: "delete" | "report",
    reason = "other",
  ) {
    try {
      await apiPost(
        `/api/chat/messages/${id}/${operation}`,
        operation === "report" ? { reason } : {},
        token,
      );
      setReportId(null);
      setDeleteId(null);
      setHint(
        operation === "report"
          ? "Report received. A moderator will review it."
          : "Message deleted.",
      );
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save action.");
    }
  }
  const channel = channels.find((item) => item.slug === slug);
  const firstUnread = messages.find(
    (message) =>
      readSeq !== null && BigInt(message.seq) > BigInt(readSeq) && !message.own,
  )?.id;
  return (
    <Box className="chat-page">
      <Box className="chat-heading">
        <Box>
          <Text className="chat-eyebrow">MEMBERS’ CLUB</Text>
          <Text as="h1">Parlons français.</Text>
          <Text as="p">Small conversations. Everyday progress.</Text>
        </Box>
        <Button
          variant="text"
          onClick={() => setRules(!rules)}
          aria-expanded={rules}
        >
          Community guidelines
        </Button>
      </Box>
      {rules && <Guidelines guidelines={bootstrap.guidelines} />}
      <Box className="chat-layout">
        <Box as="nav" className="chat-channels" aria-label="Chat channels">
          <Text as="h2">Your rooms</Text>
          {channels.map((item) => (
            <Button
              key={item.slug}
              variant="nav"
              active={slug === item.slug}
              onClick={() => {
                messagesRef.current = [];
                setSlug(item.slug);
              }}
              aria-current={slug === item.slug ? "page" : undefined}
            >
              # {item.title}
              {item.unread > 0 ? ` · ${item.unread} unread` : ""}
            </Button>
          ))}
          <Text as="p" className="chat-small">
            You’re {bootstrap.profile?.display_name}. Your account name stays
            private.
          </Text>
        </Box>
        <Box className="chat-room">
          <Box className="chat-room-header">
            <Text as="h2"># {channel?.title || slug}</Text>
            <Text as="p">
              {channel?.description || "Practise a little, together."}
            </Text>
            <Text className="chat-small" role="status">
              {live
                ? "Live · members only"
                : "Connecting · history refreshes every 15 seconds"}{" "}
              · {channel?.slow_mode_seconds || 3}s slow mode
            </Text>
          </Box>
          <Box className="chat-pin">
            <Text>
              Bienvenue ! French first, kindness always. No personal
              information. Messages disappear after four weeks.
            </Text>
          </Box>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <ChatTimeline
            key={slug}
            latestId={latestId}
            onReadLatest={markLatest}
          >
            {more && (
              <Button
                variant="text"
                onClick={() => {
                  void older();
                }}
              >
                Load older messages
              </Button>
            )}
            {messages.length === 0 && (
              <Text as="p">Start with a bonjour. Your room is ready.</Text>
            )}
            {messages.map((message) => (
              <Box key={message.id}>
                {message.id === firstUnread && (
                  <Text className="chat-unread">NEW SINCE YOUR LAST VISIT</Text>
                )}
                <Box as="article" className="chat-message">
                  <Box className="chat-avatar" aria-hidden="true">
                    {message.display_name.slice(0, 2).toUpperCase()}
                  </Box>
                  <Box className="chat-message-content">
                    <Box className="chat-message-meta">
                      <Text as="strong">
                        {message.display_name}
                        {message.own ? " · you" : ""}
                      </Text>
                      <Text className="chat-small">
                        {new Date(message.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Box>
                    <Text as="p" className="chat-message-body">
                      {message.status === "deleted"
                        ? "Message deleted."
                        : message.status === "hidden"
                          ? "Message held for moderation."
                          : message.body}
                    </Text>
                    {message.status !== "deleted" && (
                      <Button
                        variant="text"
                        onClick={() =>
                          message.own
                            ? setDeleteId(message.id)
                            : setReportId(message.id)
                        }
                        aria-label={`${message.own ? "Delete" : "Report"} message by ${message.display_name}`}
                      >
                        {message.own ? "Delete" : "Report"}
                      </Button>
                    )}
                    {deleteId === message.id && (
                      <Box>
                        <Text>Delete this message?</Text>
                        <Button
                          variant="text"
                          onClick={() => {
                            void action(message.id, "delete");
                          }}
                        >
                          Confirm delete
                        </Button>
                        <Button
                          variant="text"
                          onClick={() => setDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}
                    {reportId === message.id && (
                      <Box>
                        <Text>Why are you reporting this message?</Text>
                        {reasons.map((reason) => (
                          <Button
                            key={reason}
                            variant="text"
                            onClick={() => {
                              void action(message.id, "report", reason);
                            }}
                          >
                            {reason.replaceAll("_", " ")}
                          </Button>
                        ))}
                        <Button
                          variant="text"
                          onClick={() => setReportId(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </ChatTimeline>
          <Box className="chat-composer">
            <Field label={`Message #${channel?.title || slug}`}>
              <Textarea
                value={body}
                maxLength={1500}
                rows={3}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Un petit bonjour pour commencer…"
              />
            </Field>
            <Box className="chat-composer-footer">
              <Text className="chat-small">
                {body.length}/1500 · Offline messages stay in this browser until
                sent.
              </Text>
              <Button
                disabled={!body.trim() || busy}
                onClick={() => {
                  void send();
                }}
              >
                Send message
              </Button>
            </Box>
            {hint && <Text role="status">{hint}</Text>}
            {outbox
              .filter((entry) => entry.channel === slug)
              .map((entry) => (
                <Box key={entry.key} className="chat-outbox">
                  <Text as="p" className="chat-message-body">
                    {entry.body}
                  </Text>
                  <Text role="status">
                    {entry.status === "failed"
                      ? `Failed: ${entry.error}`
                      : "Queued · waiting to send"}
                  </Text>
                  <Button
                    variant="text"
                    onClick={() => {
                      void discardChat(entry.key)
                        .then(loadOutbox)
                        .catch(() =>
                          setError("Could not remove this queued message."),
                        );
                    }}
                  >
                    Remove from outbox
                  </Button>
                </Box>
              ))}
          </Box>
        </Box>
        <Box className="chat-members">
          <Text as="h2">Around the table</Text>
          <Text className="chat-small">
            {members.length} online in this room
          </Text>
          {members.map((name) => (
            <Text as="p" key={name}>
              ● {name}
            </Text>
          ))}
          <Text as="p" className="chat-small">
            Only chat names appear here. Be curious. Be kind. Keep trying.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
