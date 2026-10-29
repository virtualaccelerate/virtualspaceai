DELETE FROM public.pilot_checks WHERE teamspace_id IS NOT NULL;
ALTER TABLE public.pilot_checks DROP CONSTRAINT IF EXISTS pilot_checks_item_check;
ALTER TABLE public.pilot_checks ADD CONSTRAINT pilot_checks_item_check CHECK (item BETWEEN 1 AND 18);
ALTER POLICY pilot_read ON public.pilot_checks USING (private.is_teamspace_member(teamspace_id, auth.uid()) AND (item NOT BETWEEN 14 AND 16 OR private.is_teamspace_manager(teamspace_id, auth.uid())));
ALTER POLICY pilot_insert ON public.pilot_checks WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()) AND (checked OR private.is_teamspace_manager(teamspace_id, auth.uid())) AND (item NOT BETWEEN 14 AND 16 OR private.is_teamspace_manager(teamspace_id, auth.uid())));
ALTER POLICY pilot_update ON public.pilot_checks USING (private.is_teamspace_member(teamspace_id, auth.uid()) AND (item NOT BETWEEN 14 AND 16 OR private.is_teamspace_manager(teamspace_id, auth.uid()))) WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()) AND (checked OR private.is_teamspace_manager(teamspace_id, auth.uid())) AND (item NOT BETWEEN 14 AND 16 OR private.is_teamspace_manager(teamspace_id, auth.uid())));
CREATE OR REPLACE FUNCTION public.guard_pilot_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.teamspace_id <> OLD.teamspace_id OR NEW.item <> OLD.item) THEN RAISE EXCEPTION 'PILOT_FORBIDDEN'; END IF;
 IF auth.uid() IS NOT NULL THEN
  IF NOT private.is_teamspace_member(NEW.teamspace_id, auth.uid()) OR (NEW.item BETWEEN 14 AND 16 AND NOT private.is_teamspace_manager(NEW.teamspace_id, auth.uid())) OR (NOT NEW.checked AND NOT private.is_teamspace_manager(NEW.teamspace_id, auth.uid())) THEN RAISE EXCEPTION 'PILOT_FORBIDDEN'; END IF;
 END IF;
 IF TG_OP = 'INSERT' OR NEW.checked IS DISTINCT FROM OLD.checked THEN
  NEW.checked_at := now(); NEW.checked_by := auth.uid();
  SELECT COALESCE(NULLIF(full_name, ''), '—') INTO NEW.checker_name FROM public.profiles WHERE id = auth.uid();
 ELSE
  NEW.checked_at := OLD.checked_at; NEW.checked_by := OLD.checked_by; NEW.checker_name := OLD.checker_name; NEW.automatic := OLD.automatic;
 END IF;
 IF NEW.item <> 13 THEN NEW.result_percent := NULL; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_pilot_check() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.load_pilot_checklist(p_teamspace uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE manager boolean; evidence integer[]; total integer; passed boolean; rows jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_teamspace_member(p_teamspace, auth.uid()) THEN RAISE EXCEPTION 'PILOT_FORBIDDEN'; END IF;
 manager := private.is_teamspace_manager(p_teamspace, auth.uid());
 evidence := ARRAY[]::integer[];
 IF EXISTS (SELECT 1 FROM public.teamspaces WHERE id=p_teamspace AND NULLIF(logo_path,'') IS NOT NULL) THEN evidence := array_append(evidence,1); END IF;
 IF (SELECT count(*) FROM public.teamspace_members WHERE teamspace_id=p_teamspace) >= 2 THEN evidence := array_append(evidence,2); END IF;
 IF EXISTS (SELECT 1 FROM public.telegram_links WHERE user_id=auth.uid() AND chat_id IS NOT NULL AND linked_at IS NOT NULL) THEN evidence := array_append(evidence,3); END IF;
 IF EXISTS (SELECT 1 FROM public.telegram_groups WHERE teamspace_id=p_teamspace AND status='linked' AND NULLIF(project,'') IS NOT NULL) THEN evidence := array_append(evidence,4); END IF;
 IF EXISTS (SELECT 1 FROM public.task_events WHERE teamspace_id=p_teamspace AND field='status' AND from_value ILIKE '%review%' AND to_value ILIKE '%done%') THEN evidence := array_append(evidence,6); END IF;
 IF (SELECT count(*) FROM public.documents WHERE teamspace_id=p_teamspace) >= 5 THEN evidence := array_append(evidence,7); END IF;
 IF EXISTS (SELECT 1 FROM public.agent_automations WHERE teamspace_id=p_teamspace) THEN evidence := array_append(evidence,9); END IF;
 IF EXISTS (SELECT 1 FROM public.onboarding_quiz_questions WHERE teamspace_id=p_teamspace) THEN evidence := array_append(evidence,11); END IF;
 IF EXISTS (SELECT 1 FROM public.onboarding_assignments WHERE teamspace_id=p_teamspace GROUP BY program_id HAVING count(DISTINCT user_id) >= 2) THEN evidence := array_append(evidence,12); END IF;
 IF EXISTS (SELECT 1 FROM public.onboarding_assignments WHERE teamspace_id=p_teamspace AND status='completed') THEN evidence := array_append(evidence,13); END IF;
 IF manager AND EXISTS (SELECT 1 FROM public.financial_sources WHERE teamspace_id=p_teamspace) THEN evidence := array_append(evidence,14); END IF;
 IF manager AND (SELECT count(DISTINCT r.user_id) FROM public.payroll_rules r JOIN public.teamspace_members m ON m.teamspace_id=r.teamspace_id AND m.user_id=r.user_id WHERE r.teamspace_id=p_teamspace) >= 3 THEN evidence := array_append(evidence,15); END IF;
 INSERT INTO public.pilot_checks(teamspace_id,item,automatic) SELECT p_teamspace, unnest(evidence), true ON CONFLICT DO NOTHING;
 SELECT count(*) FILTER (WHERE checked),
  count(*) FILTER (WHERE checked AND (item BETWEEN 1 AND 10 OR item IN (17,18)))=12 AND (count(*) FILTER (WHERE checked AND item BETWEEN 11 AND 13)=3 OR count(*) FILTER (WHERE checked AND item BETWEEN 14 AND 16)=3)
 INTO total,passed FROM public.pilot_checks WHERE teamspace_id=p_teamspace;
 SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY item),'[]'::jsonb) INTO rows FROM public.pilot_checks c WHERE teamspace_id=p_teamspace AND (item NOT BETWEEN 14 AND 16 OR manager);
 RETURN jsonb_build_object('checks',rows,'total',total,'passed',passed,'isManager',manager);
END $$;
REVOKE ALL ON FUNCTION public.load_pilot_checklist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_pilot_checklist(uuid) TO authenticated;