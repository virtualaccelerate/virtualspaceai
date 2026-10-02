CREATE TABLE public.client_sync_queue (
  task_id uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  queued_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.client_sync_queue TO service_role;

ALTER TABLE public.client_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.queue_task_client_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.client_sync_queue (task_id, queued_at)
  VALUES (NEW.id, now())
  ON CONFLICT (task_id) DO UPDATE SET queued_at = EXCLUDED.queued_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER queue_task_client_sync_after_change
AFTER INSERT OR UPDATE OF title, description ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION private.queue_task_client_sync();
