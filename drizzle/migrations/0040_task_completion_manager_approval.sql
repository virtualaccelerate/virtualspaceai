CREATE OR REPLACE FUNCTION public.guard_task_completion_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.teamspace_id IS DISTINCT FROM NEW.teamspace_id)
       AND NOT COALESCE(private.is_teamspace_manager(NEW.teamspace_id, auth.uid()), false) THEN
      RAISE EXCEPTION 'Only workspace managers can approve task completion' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
        IF NOT COALESCE(private.is_teamspace_manager(NEW.teamspace_id, auth.uid()), false) THEN
          RAISE EXCEPTION 'Only workspace managers can review tasks' USING ERRCODE = '42501';
        END IF;
      END IF;
    ELSIF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      IF NOT COALESCE(private.is_teamspace_manager(NEW.teamspace_id, auth.uid()), false) THEN
        RAISE EXCEPTION 'Only workspace managers can review tasks' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_task_completion_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_task_completion_approval BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_task_completion_approval();