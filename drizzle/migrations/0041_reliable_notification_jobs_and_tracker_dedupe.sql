ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sync_archived_at timestamptz;
CREATE TABLE public.tracker_notification_claims (key text PRIMARY KEY, claimed_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.tracker_notification_claims TO service_role;
ALTER TABLE public.tracker_notification_claims ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.notification_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), teamspace_id uuid NOT NULL, pass text NOT NULL CHECK (pass IN ('morning','evening','pulse')), day date NOT NULL, force boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending', lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0, error text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz);
GRANT ALL ON public.notification_jobs TO service_role;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX notification_jobs_daily_unique ON public.notification_jobs(teamspace_id,pass,day) WHERE NOT force;
CREATE TABLE public.notification_service_state (key text PRIMARY KEY, reason text NOT NULL, requires_owner boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.notification_service_state TO service_role;
ALTER TABLE public.notification_service_state ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.deliver_tracker_notifications(_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u uuid; s uuid; pending jsonb; item jsonb; result jsonb := '[]'; inserted public.notifications; k text; n integer; tracker text;
BEGIN
 FOR u,s IN SELECT DISTINCT (v->>'userId')::uuid,(v->>'teamspaceId')::uuid FROM jsonb_array_elements(_items) v ORDER BY 1,2 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(u::text || ':' || s::text,0));
  pending := '[]';
  FOR item IN SELECT DISTINCT ON (v->>'taskId',v->>'body') v FROM jsonb_array_elements(_items) v WHERE (v->>'userId')::uuid=u AND (v->>'teamspaceId')::uuid=s LOOP
   k := md5(u::text || ':' || coalesce(item->>'taskId','') || ':' || coalesce(item->>'body',''));
   IF EXISTS(SELECT 1 FROM public.tracker_notification_claims WHERE key=k AND claimed_at > now()-interval '10 minutes') OR EXISTS(SELECT 1 FROM public.notifications WHERE user_id=u AND task_id IS NOT DISTINCT FROM (item->>'taskId')::uuid AND body IS NOT DISTINCT FROM item->>'body' AND created_at > now()-interval '10 minutes') THEN CONTINUE; END IF;
   INSERT INTO public.tracker_notification_claims(key,claimed_at) VALUES(k,now()) ON CONFLICT(key) DO UPDATE SET claimed_at=excluded.claimed_at;
   pending := pending || jsonb_build_array(item);
  END LOOP;
  SELECT count(DISTINCT v->>'taskId') INTO n FROM jsonb_array_elements(pending) v;
  IF n > 5 THEN
   tracker := coalesce(pending->0->>'tracker','Трекер');
   INSERT INTO public.notifications(user_id,teamspace_id,kind,title,body) VALUES(u,s,'task_external_update',tracker || ': обновлено ' || n || ' задач',tracker || ': обновлено ' || n || ' задач') RETURNING * INTO inserted;
   result := result || jsonb_build_array(to_jsonb(inserted));
  ELSE
   FOR item IN SELECT v FROM jsonb_array_elements(pending) v LOOP
    INSERT INTO public.notifications(user_id,teamspace_id,task_id,kind,title,body,actor_id,actor_name) VALUES(u,s,(item->>'taskId')::uuid,item->>'kind',item->>'title',item->>'body',(item->>'actorId')::uuid,item->>'actorName') RETURNING * INTO inserted;
    result := result || jsonb_build_array(to_jsonb(inserted));
   END LOOP;
  END IF;
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.deliver_tracker_notifications(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_tracker_notifications(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_notification_job(_id uuid,_token uuid) RETURNS SETOF public.notification_jobs LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.notification_jobs SET status='running',lease_token=_token,lease_until=now()+interval '2 minutes',attempts=attempts+1 WHERE id=_id AND attempts<5 AND (status='pending' OR (status='running' AND lease_until<now())) AND NOT EXISTS(SELECT 1 FROM public.notification_service_state) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_job(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_job(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.dispatch_notification_jobs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j record; secret text;
BEGIN
 IF EXISTS(SELECT 1 FROM public.notification_service_state) THEN RETURN; END IF;
 SELECT value INTO secret FROM public.app_settings WHERE key='cron_secret';
 FOR j IN SELECT id FROM public.notification_jobs WHERE attempts<5 AND (status='pending' OR (status='running' AND lease_until<now())) ORDER BY created_at LIMIT 1 LOOP
  PERFORM net.http_post(url:='https://project--b3923ecf-a6ef-4e85-9da5-581fad94a65f.lovable.app/api/public/hooks/tasks-daily',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:=jsonb_build_object('jobId',j.id),timeout_milliseconds:=30000);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_notification_jobs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_notification_jobs() TO service_role;
CREATE OR REPLACE FUNCTION public.send_daily_task_digest() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE secret text;
BEGIN
 SELECT value INTO secret FROM public.app_settings WHERE key='cron_secret';
 PERFORM net.http_post(url:='https://project--b3923ecf-a6ef-4e85-9da5-581fad94a65f.lovable.app/api/public/hooks/tasks-daily',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=30000);
END $$;
REVOKE ALL ON FUNCTION public.send_daily_task_digest() FROM PUBLIC,anon,authenticated;