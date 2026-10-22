-- lovable-cron-fallback-reviewed: Wake on enqueue, minute retries only while bounded pending work exists; unschedule on drain/pause. At most 1440 checks/day during continuous work; user informed of Cloud cost tradeoff.
CREATE OR REPLACE FUNCTION public.dispatch_notification_jobs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j record; secret text; cron_id bigint;
BEGIN
 IF EXISTS(SELECT 1 FROM public.notification_service_state) OR NOT EXISTS(SELECT 1 FROM public.notification_jobs WHERE attempts<5 AND status IN ('pending','running')) THEN
  FOR cron_id IN SELECT jobid FROM cron.job WHERE jobname='virtualspace-notification-worker' LOOP PERFORM cron.unschedule(cron_id); END LOOP;
  RETURN;
 END IF;
 SELECT value INTO secret FROM public.app_settings WHERE key='cron_secret';
 FOR j IN SELECT id FROM public.notification_jobs WHERE attempts<5 AND (status='pending' OR (status='running' AND lease_until<now())) ORDER BY created_at LIMIT 1 LOOP
  PERFORM net.http_post(url:='https://project--b3923ecf-a6ef-4e85-9da5-581fad94a65f.lovable.app/api/public/hooks/tasks-daily',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret),body:=jsonb_build_object('jobId',j.id),timeout_milliseconds:=30000);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.wake_notification_queue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='pending' AND NOT EXISTS(SELECT 1 FROM public.notification_service_state) THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('notification-queue-wake',0));
  IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='virtualspace-notification-worker') THEN
   PERFORM cron.schedule('virtualspace-notification-worker','* * * * *','select public.dispatch_notification_jobs()');
   PERFORM public.dispatch_notification_jobs();
  END IF;
 ELSIF NEW.status IN ('done','failed') THEN
  PERFORM public.dispatch_notification_jobs();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wake_notification_queue() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wake_notification_queue AFTER INSERT OR UPDATE OF status ON public.notification_jobs FOR EACH ROW EXECUTE FUNCTION public.wake_notification_queue();