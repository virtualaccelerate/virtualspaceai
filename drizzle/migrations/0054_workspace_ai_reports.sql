CREATE TABLE public.workspace_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
 content text NOT NULL,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.workspace_reports TO service_role;
REVOKE ALL ON public.workspace_reports FROM anon, authenticated;
ALTER TABLE public.workspace_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_reports_service_admin ON public.workspace_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX workspace_reports_history ON public.workspace_reports(workspace_id, created_at DESC);
CREATE FUNCTION public.admin_workspace_report_data(p_workspace uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 WITH bounds AS (SELECT now() - interval '30 days' AS since),
 activity AS (
 SELECT user_id, created_at AS ts FROM public.activity_events WHERE teamspace_id=p_workspace
 UNION ALL SELECT user_id, created_at FROM public.chat_messages WHERE teamspace_id=p_workspace AND role='user'
 UNION ALL SELECT user_id, created_at FROM public.tasks WHERE teamspace_id=p_workspace
 UNION ALL SELECT actor_id, created_at FROM public.task_events WHERE teamspace_id=p_workspace AND actor_id IS NOT NULL
 UNION ALL SELECT user_id, created_at FROM public.documents WHERE teamspace_id=p_workspace
 UNION ALL SELECT user_id, created_at FROM public.financial_sources WHERE teamspace_id=p_workspace
 ), member_stats AS (
 SELECT m.user_id, coalesce(nullif(p.full_name,''),'Без имени') AS name, m.role,
 (SELECT max(a.ts) FROM activity a WHERE a.user_id=m.user_id) AS last_activity,
 (SELECT count(*) FROM activity a, bounds b WHERE a.user_id=m.user_id AND a.ts>=b.since) AS activity_30d,
 (SELECT count(*) FROM public.chat_messages c, bounds b WHERE c.teamspace_id=p_workspace AND c.user_id=m.user_id AND c.created_at>=b.since AND c.role='user') AS ai_messages_30d
 FROM public.teamspace_members m LEFT JOIN public.profiles p ON p.id=m.user_id WHERE m.teamspace_id=p_workspace
 ), prompts AS (
 SELECT c.user_id, left(c.content,300) AS prompt, c.created_at
 FROM public.chat_messages c, bounds b WHERE c.teamspace_id=p_workspace AND c.role='user' AND c.created_at>=b.since
 ORDER BY c.created_at DESC, c.id DESC LIMIT 30
 ), connections AS (
 SELECT s.provider AS provider, count(*) AS connected, count(*) FILTER (WHERE s.last_error IS NOT NULL) AS with_errors FROM public.task_sync_sources s WHERE s.teamspace_id=p_workspace AND s.enabled GROUP BY s.provider
 UNION ALL SELECT c.connector_id, count(*), 0 FROM public.app_user_connections c WHERE c.user_id IN (SELECT user_id FROM member_stats) GROUP BY c.connector_id
 UNION ALL SELECT 'telegram_personal', count(*), 0 FROM public.telegram_links WHERE teamspace_id=p_workspace AND chat_id IS NOT NULL
 UNION ALL SELECT 'whatsapp_personal', count(*), 0 FROM public.whatsapp_links WHERE teamspace_id=p_workspace AND phone_number IS NOT NULL
 UNION ALL SELECT provider || '_groups', count(*), 0 FROM public.telegram_groups WHERE teamspace_id=p_workspace AND status='linked' AND merged_into IS NULL GROUP BY provider
 )
 SELECT jsonb_build_object(
 'workspace',jsonb_build_object('id',w.id,'name',w.name),
 'period',jsonb_build_object('days',30,'since',(SELECT since FROM bounds),'until',now(),'timezone','Asia/Bishkek'),
 'members',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.activity_30d DESC, m.name) FROM member_stats m),'[]'::jsonb),
 'active_members',(SELECT count(*) FROM member_stats WHERE activity_30d>0),
 'tasks',jsonb_build_object(
 'created_30d',(SELECT count(*) FROM public.tasks t, bounds b WHERE t.teamspace_id=p_workspace AND t.created_at>=b.since),
 'done_30d',(SELECT count(DISTINCT e.task_id) FROM public.task_events e, bounds b WHERE e.teamspace_id=p_workspace AND e.created_at>=b.since AND e.field='status' AND e.to_value='done' AND e.from_value IS DISTINCT FROM 'done'),
 'overdue_now',(SELECT count(*) FROM public.tasks t WHERE t.teamspace_id=p_workspace AND NOT t.external_archived AND t.status NOT IN ('done','review') AND t.due_date<(now() AT TIME ZONE 'Asia/Bishkek')::date),
 'open_now',(SELECT count(*) FROM public.tasks t WHERE t.teamspace_id=p_workspace AND NOT t.external_archived AND t.status<>'done')),
 'ai_chat',jsonb_build_object('user_messages_30d',(SELECT count(*) FROM public.chat_messages c,bounds b WHERE c.teamspace_id=p_workspace AND c.role='user' AND c.created_at>=b.since),'recent_prompt_sample',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC) FROM prompts p),'[]'::jsonb),'sample_limit',30,'prompt_char_limit',300),
 'integrations',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM connections c WHERE connected>0),'[]'::jsonb),
 'limitations','Activity is observed platform activity, not employee productivity. Done count uses recorded status transitions, not sync timestamps. Request types must be inferred only from the bounded prompt sample. Personal integrations belong to current members and may be shared across workspaces.'
 ) FROM public.teamspaces w WHERE w.id=p_workspace;
$$;
REVOKE ALL ON FUNCTION public.admin_workspace_report_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_workspace_report_data(uuid) TO service_role;