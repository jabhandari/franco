CREATE TABLE IF NOT EXISTS public.chat_channels (
 slug TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, level_band TEXT NOT NULL,
 slow_mode_seconds INTEGER NOT NULL DEFAULT 3 CHECK(slow_mode_seconds>=0), sort_order INTEGER NOT NULL UNIQUE
);
INSERT INTO public.chat_channels(slug,title,description,level_band,slow_mode_seconds,sort_order) VALUES
 ('general','général','Be kind, practise French, and keep personal details private.','A1–C2',3,1),
 ('debutants-a1-a2','débutants-a1-a2','Short everyday French. Mistakes are welcome; help each other kindly.','A1–A2',5,2),
 ('intermediaire-b1-b2','intermédiaire-b1-b2','Share experiences and opinions. Disagree respectfully.','B1–B2',3,3),
 ('avances-c1-c2','avancés-c1-c2','Discuss nuance, culture and ideas without personal attacks.','C1–C2',3,4),
 ('questions-aide','questions-aide','Ask about French. English is welcome when it helps explain a question.','A1–C2',3,5)
 ON CONFLICT(slug) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.chat_profiles (
 user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, member_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 display_name TEXT NOT NULL, is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
 guidelines_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), guidelines_version TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_profile_name_idx ON public.chat_profiles(lower(display_name));
CREATE TABLE IF NOT EXISTS public.chat_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seq BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
 channel_id TEXT NOT NULL REFERENCES public.chat_channels(slug),user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 display_name TEXT NOT NULL, body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1500),
 status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','flagged','hidden','deleted')),
 toxicity_score REAL CHECK(toxicity_score BETWEEN 0 AND 1),client_msg_id UUID NOT NULL,
 moderation_state TEXT NOT NULL DEFAULT 'pending' CHECK(moderation_state IN ('pending','processing','done','manual')),
 moderation_attempts INTEGER NOT NULL DEFAULT 0,moderation_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 reviewed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,client_msg_id)
);
CREATE INDEX IF NOT EXISTS chat_message_history_idx ON public.chat_messages(channel_id,seq DESC);
CREATE INDEX IF NOT EXISTS chat_message_sender_idx ON public.chat_messages(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS chat_message_retention_idx ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS chat_message_scoring_idx ON public.chat_messages(moderation_retry_at) WHERE moderation_state IN ('pending','processing');
CREATE TABLE IF NOT EXISTS public.chat_read_markers (
 user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,channel_id TEXT NOT NULL REFERENCES public.chat_channels(slug),
 last_read_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,last_read_seq BIGINT NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,channel_id)
);
CREATE TABLE IF NOT EXISTS public.chat_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
 reporter_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','dismissed','actioned')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(message_id,reporter_user_id)
);
CREATE TABLE IF NOT EXISTS public.chat_mod_actions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),actor TEXT NOT NULL,target_user_id TEXT NOT NULL,
 target_message_id UUID,action TEXT NOT NULL CHECK(action IN ('delete','mute','ban','dismiss')),
 duration_seconds INTEGER,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS chat_active_sanctions_idx ON public.chat_mod_actions(target_user_id,action,expires_at);
CREATE TABLE IF NOT EXISTS public.chat_realtime_leases (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),member_id UUID NOT NULL REFERENCES public.chat_profiles(member_id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mod_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_realtime_leases ENABLE ROW LEVEL SECURITY;
-- The only browser-readable table contains opaque, short-lived lease IDs, no
-- account IDs or message bodies. All chat data is API-only with Franco sessions.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON public.chat_channels,public.chat_profiles,public.chat_messages,public.chat_read_markers,public.chat_reports,public.chat_mod_actions FROM authenticated;
  GRANT SELECT ON public.chat_realtime_leases TO authenticated;
  IF to_regprocedure('auth.jwt()') IS NOT NULL THEN
   DROP POLICY IF EXISTS franco_chat_own_lease ON public.chat_realtime_leases;
   CREATE POLICY franco_chat_own_lease ON public.chat_realtime_leases FOR SELECT TO authenticated
    USING(member_id::text=(SELECT auth.jwt()->>'sub') AND id::text=(SELECT auth.jwt()->>'chat_lease') AND expires_at>NOW());
  END IF;
  IF to_regclass('realtime.messages') IS NOT NULL THEN
   -- Restrictive boundary survives permissive policies added for other features.
   DROP POLICY IF EXISTS franco_chat_boundary ON realtime.messages;
   CREATE POLICY franco_chat_boundary ON realtime.messages AS RESTRICTIVE FOR ALL TO authenticated USING(
    realtime.topic() NOT LIKE 'chat:%' OR ((SELECT auth.jwt()->>'purpose')='franco_chat'
     AND realtime.topic() IN ('chat:general','chat:debutants-a1-a2','chat:intermediaire-b1-b2','chat:avances-c1-c2','chat:questions-aide')
     AND EXISTS(SELECT 1 FROM public.chat_realtime_leases WHERE id::text=(SELECT auth.jwt()->>'chat_lease') AND expires_at>NOW()))
   ) WITH CHECK(
    realtime.topic() NOT LIKE 'chat:%' OR (extension='presence' AND (SELECT auth.jwt()->>'purpose')='franco_chat'
     AND realtime.topic() IN ('chat:general','chat:debutants-a1-a2','chat:intermediaire-b1-b2','chat:avances-c1-c2','chat:questions-aide')
     AND EXISTS(SELECT 1 FROM public.chat_realtime_leases WHERE id::text=(SELECT auth.jwt()->>'chat_lease') AND expires_at>NOW()))
   );
   DROP POLICY IF EXISTS franco_chat_receive ON realtime.messages;
   CREATE POLICY franco_chat_receive ON realtime.messages FOR SELECT TO authenticated USING(
    (SELECT auth.jwt()->>'purpose')='franco_chat' AND realtime.topic() IN ('chat:general','chat:debutants-a1-a2','chat:intermediaire-b1-b2','chat:avances-c1-c2','chat:questions-aide')
    AND extension IN ('broadcast','presence') AND EXISTS(SELECT 1 FROM public.chat_realtime_leases WHERE id::text=(SELECT auth.jwt()->>'chat_lease') AND expires_at>NOW())
   );
   DROP POLICY IF EXISTS franco_chat_presence ON realtime.messages;
   CREATE POLICY franco_chat_presence ON realtime.messages FOR INSERT TO authenticated WITH CHECK(
    extension='presence' AND (SELECT auth.jwt()->>'purpose')='franco_chat'
    AND realtime.topic() IN ('chat:general','chat:debutants-a1-a2','chat:intermediaire-b1-b2','chat:avances-c1-c2','chat:questions-aide')
    AND EXISTS(SELECT 1 FROM public.chat_realtime_leases WHERE id::text=(SELECT auth.jwt()->>'chat_lease') AND expires_at>NOW())
   );
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON public.chat_channels,public.chat_profiles,public.chat_messages,public.chat_read_markers,public.chat_reports,public.chat_mod_actions,public.chat_realtime_leases FROM anon;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.chat_notify() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL THEN
  BEGIN
   PERFORM realtime.send(jsonb_build_object('message_id',NEW.id::text,'channel',NEW.channel_id),'changed','chat:'||NEW.channel_id,TRUE);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Chat broadcast unavailable; clients will catch up from history'; END;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chat_notify() FROM PUBLIC;
DROP TRIGGER IF EXISTS chat_changed ON public.chat_messages;
CREATE TRIGGER chat_changed AFTER INSERT OR UPDATE OF status ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.chat_notify();
CREATE OR REPLACE FUNCTION public.chat_cleanup() RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE removed INTEGER; BEGIN
 DELETE FROM public.chat_messages WHERE created_at<NOW()-INTERVAL '28 days';GET DIAGNOSTICS removed=ROW_COUNT;
 DELETE FROM public.chat_realtime_leases WHERE expires_at<NOW();RETURN removed;
END $$;
REVOKE ALL ON FUNCTION public.chat_cleanup() FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.schedule('franco-chat-retention','0 * * * *','SELECT public.chat_cleanup()');
 END IF;
END $$;
