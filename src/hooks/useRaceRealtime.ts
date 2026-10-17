import React from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type RaceRealtime = { connected: boolean; broadcast: () => void };

// Broadcasts carry no game state. They only prompt a fresh read from the
// authoritative race API; the interval in Race remains the reconnect fallback.
export function useRaceRealtime(code: string | null, onNudge: () => void, displayName: string | null): RaceRealtime {
  const [connected, setConnected] = React.useState(false);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const onNudgeRef = React.useRef(onNudge);
  React.useEffect(() => { onNudgeRef.current = onNudge; }, [onNudge]);

  React.useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!code || !url || !anonKey) return;
    let cancelled = false;
    let client: SupabaseClient | null = null;
    void import('@supabase/supabase-js').then(({ createClient }) => {
      if (cancelled) return;
      client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const channel = client.channel(`race:${code}`, {
        config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
      });
      channelRef.current = channel;
      channel.on('broadcast', { event: 'changed' }, () => onNudgeRef.current());
      channel.on('presence', { event: 'sync' }, () => onNudgeRef.current());
      channel.subscribe((status) => {
        if (cancelled) return;
        const ready = status === 'SUBSCRIBED';
        setConnected(ready);
        if (ready && displayName) void channel.track({ display_name: displayName });
      });
    }).catch(() => { if (!cancelled) setConnected(false); });
    return () => {
      cancelled = true;
      setConnected(false);
      const activeChannel = channelRef.current;
      channelRef.current = null;
      if (client && activeChannel) void client.removeChannel(activeChannel);
    };
  }, [code, displayName]);

  const broadcast = React.useCallback(() => {
    if (channelRef.current) void channelRef.current.send({ type: 'broadcast', event: 'changed', payload: {} });
  }, []);
  return { connected, broadcast };
}
