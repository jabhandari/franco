import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiGet, apiPost } from "../api/client";
import type { ChatRealtimeTicket } from "../types";

// Broadcast is only a refetch hint. Presence metadata is untrusted: the API
// resolves opaque, short-lived lease keys to verified chat pseudonyms.
export function useChatRealtime(
  token: string,
  slug: string,
  refresh: () => void,
  setMembers: (members: string[]) => void,
  setLive: (live: boolean) => void,
) {
  useEffect(() => {
    let stopped = false;
    let client: SupabaseClient | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let release = () => {};
    async function connect() {
      try {
        const ticket = await apiPost<ChatRealtimeTicket>(
          "/api/chat/realtime-token",
          {},
          token,
        );
        if (stopped) return;
        release();
        client = createClient(ticket.url, ticket.publishable_key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        await client.realtime.setAuth(ticket.token);
        if (stopped) return;
        const channel = client.channel(`chat:${slug}`, {
          config: { private: true, presence: { key: ticket.presence_key } },
        });
        const connection = client;
        release = () => {
          void connection.removeAllChannels();
          connection.realtime.disconnect();
        };
        channel
          .on("broadcast", { event: "changed" }, refresh)
          .on("presence", { event: "sync" }, () => {
            const ids = Object.keys(channel.presenceState())
              .slice(0, 100)
              .join(",");
            void apiGet<{ members: string[] }>(
              `/api/chat/presence?keys=${encodeURIComponent(ids)}`,
              token,
            )
              .then((result) => {
                if (!stopped) setMembers(result.members);
              })
              .catch(() => {
                if (!stopped) setMembers([]);
              });
          })
          .subscribe((status) => {
            if (stopped) return;
            setLive(status === "SUBSCRIBED");
            if (status === "SUBSCRIBED") {
              void channel.track({});
              refresh();
            }
          });
        timer = setTimeout(
          () => {
            void connect();
          },
          Math.max(
            1000,
            new Date(ticket.expires_at).getTime() - Date.now() - 15000,
          ),
        );
      } catch {
        release();
        if (stopped) return;
        setLive(false);
        setMembers([]);
        if (!stopped)
          timer = setTimeout(() => {
            void connect();
          }, 30000);
      }
    }
    void connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      release();
      if (client) void client.removeAllChannels();
      setLive(false);
      setMembers([]);
    };
  }, [token, slug, refresh, setMembers, setLive]);
}
